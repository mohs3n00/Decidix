import { AppError } from '../utils/response.js';

/**
 * Decidix CSV dataset template (v1).
 *
 * The upload lifecycle accepts two file formats, and both must end in the SAME
 * canonical envelope that `DatasetService.validate()` → `ingest()` → `activate()`
 * already consume. This module converts the documented CSV template into that
 * envelope; it never writes to the database, so there is exactly one ingestion
 * implementation.
 *
 * Template shape (see `docs/deployment/cloudflare_r2_setup.md`):
 *
 *   #decidix-csv: v1
 *   #name: ...            (dataset display name)
 *   #name_ar: ...
 *   #source: ...          (publisher / origin, never invented)
 *   #license: ...
 *   #geographic_coverage: ...
 *   #time_coverage: ...
 *   #update_frequency: ...
 *   #completeness_pct: 0-100
 *   #timeliness_pct: 0-100
 *   #accuracy_pct: 0-100
 *   #age_days: >= 0
 *   #status: synced | overdue       (optional, defaults to synced)
 *   region_id,region_name,region_name_ar,region_population,region_latitude,region_longitude,
 *   indicator_key,indicator_label,indicator_label_ar,indicator_domain,indicator_unit,
 *   indicator_higher_is_better,year,value
 *
 * One row is ONE observation (region × indicator × year). Every row carries its
 * region and indicator definition explicitly, so no column, unit, region id or
 * period is guessed.
 *
 * Documented derivations (observations are never invented):
 * - a region's `score` is its `development_index` value for the latest year in
 *   the file, and `change` is the difference from the previous year (0 if only
 *   one year is present);
 * - region `rank` orders regions by that score (ties broken by region id) and
 *   `priority` follows the documented tercile rule below;
 * - `national_index_history` is the unweighted mean of the regional
 *   `development_index` observations for each year, with `band` from fixed
 *   thresholds and `at_risk_count` counting regions more than 3 points below
 *   that year's mean (the same convention as `scripts/bootstrap-dataset.ts`).
 */

export const DECIDIX_CSV_MARKER_KEY = 'decidix-csv';
export const DECIDIX_CSV_MARKER_VALUE = 'v1';

export const DECIDIX_CSV_REQUIRED_PREAMBLE = [
  'name',
  'name_ar',
  'source',
  'license',
  'geographic_coverage',
  'time_coverage',
  'update_frequency',
  'completeness_pct',
  'timeliness_pct',
  'accuracy_pct',
  'age_days',
] as const;

export const DECIDIX_CSV_OPTIONAL_PREAMBLE = ['status', 'development_indicator'] as const;

export const DECIDIX_CSV_COLUMNS = [
  'region_id',
  'region_name',
  'region_name_ar',
  'region_population',
  'region_latitude',
  'region_longitude',
  'indicator_key',
  'indicator_label',
  'indicator_label_ar',
  'indicator_domain',
  'indicator_unit',
  'indicator_higher_is_better',
  'year',
  'value',
] as const;

export const DECIDIX_CSV_ALLOWED_UNITS = [
  'percent',
  'per_mille',
  'per_thousand',
  'score_100',
  'years',
  'usd',
  'pupils_per_teacher',
  'count',
] as const;

export const DECIDIX_CSV_ALLOWED_DOMAINS = [
  'healthcare',
  'education',
  'economy',
  'infrastructure',
  'overall',
] as const;

/** The indicator every Decidix CSV must provide, used for scores and history. */
export const DECIDIX_CSV_DEVELOPMENT_INDICATOR = 'development_index';

const UNIT_RANGES: Record<string, { min: number; max?: number }> = {
  percent: { min: 0, max: 100 },
  per_mille: { min: 0, max: 1000 },
  per_thousand: { min: 0 },
  score_100: { min: 0, max: 100 },
  years: { min: 0, max: 130 },
  usd: { min: 0 },
  pupils_per_teacher: { min: 0 },
  count: { min: 0 },
};

const ATRISK_DELTA = 3;

interface RegionDefinition {
  id: string;
  name: string;
  nameAr: string;
  population: number;
  latitude: number;
  longitude: number;
}

interface IndicatorDefinition {
  key: string;
  label: string;
  labelAr: string;
  domain: string;
  unit: string;
  higherIsBetter: boolean;
}

interface Observation {
  regionId: string;
  indicatorKey: string;
  year: number;
  value: number;
}

function fail(code: string, message: string): never {
  throw AppError.validation(message, { csv: code });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function bandFor(score: number): string {
  if (score >= 85) return 'high';
  if (score >= 70) return 'moderate_high';
  if (score >= 55) return 'moderate';
  return 'low';
}

function splitCsvLine(line: string, lineNumber: number): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (inQuotes) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += character;
      }
    } else if (character === '"') {
      if (current.trim().length > 0) {
        fail('CSV_TEMPLATE_VALUE_INVALID', `Line ${lineNumber}: a quoted cell must start at the beginning of the cell.`);
      }
      inQuotes = true;
    } else if (character === ',') {
      cells.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (inQuotes) {
    fail('CSV_TEMPLATE_VALUE_INVALID', `Line ${lineNumber}: unterminated quoted cell.`);
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function numeric(cell: string, column: string, lineNumber: number): number {
  if (cell.length === 0) {
    fail('CSV_TEMPLATE_ROW_INCOMPLETE', `Line ${lineNumber}: column '${column}' is empty.`);
  }
  const value = Number(cell);
  if (!Number.isFinite(value)) {
    fail('CSV_TEMPLATE_VALUE_INVALID', `Line ${lineNumber}: column '${column}' must be numeric (found "${cell}").`);
  }
  return value;
}

function inRange(value: number, min: number, max: number | undefined, label: string, lineNumber: number): number {
  if (value < min || (max !== undefined && value > max)) {
    const range = max === undefined ? `>= ${min}` : `${min}..${max}`;
    fail('CSV_TEMPLATE_VALUE_INVALID', `Line ${lineNumber}: ${label} must be ${range} (found ${value}).`);
  }
  return value;
}

function percentage(raw: string | undefined, key: string): number {
  if (raw === undefined || raw.length === 0) {
    fail('CSV_TEMPLATE_PREAMBLE_MISSING', `Missing metadata key '${key}'.`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    fail('CSV_TEMPLATE_PREAMBLE_INVALID', `Metadata '${key}' must be a number between 0 and 100.`);
  }
  return value;
}

/**
 * Converts a Decidix CSV template document into the canonical dataset envelope.
 * Throws `VALIDATION_ERROR` with `fields.csv` describing the exact rule that
 * failed; nothing is written or mutated here.
 */
export function normalizeDecidixCsv(content: string): Array<Record<string, unknown>> {
  const text = content.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);

  const preamble: Record<string, string> = {};
  let headerCells: string[] | null = null;
  let headerLineNumber = 0;
  const rowLines: Array<{ line: string; number: number }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const lineNumber = index + 1;
    if (trimmed.startsWith('#')) {
      if (headerCells) {
        fail(
          'CSV_TEMPLATE_PREAMBLE_INVALID',
          `Line ${lineNumber}: metadata lines must appear before the header row.`
        );
      }
      const body = trimmed.slice(1);
      const separator = body.indexOf(':');
      if (separator <= 0) {
        fail('CSV_TEMPLATE_PREAMBLE_INVALID', `Line ${lineNumber}: metadata lines must use '#key: value'.`);
      }
      const key = body.slice(0, separator).trim().toLowerCase();
      const value = body.slice(separator + 1).trim();
      if (key in preamble) {
        fail('CSV_TEMPLATE_PREAMBLE_INVALID', `Line ${lineNumber}: duplicate metadata key '${key}'.`);
      }
      preamble[key] = value;
      continue;
    }
    if (!headerCells) {
      headerCells = splitCsvLine(raw, lineNumber).map((cell) => cell.toLowerCase());
      headerLineNumber = lineNumber;
      continue;
    }
    rowLines.push({ line: raw, number: lineNumber });
  }

  if (!headerCells) {
    fail('CSV_TEMPLATE_HEADER_MISSING', 'CSV must contain the Decidix template header row.');
  }
  if (rowLines.length === 0) {
    fail('CSV_TEMPLATE_NO_OBSERVATIONS', 'CSV contains a header but no observation rows.');
  }
  if (preamble[DECIDIX_CSV_MARKER_KEY] !== DECIDIX_CSV_MARKER_VALUE) {
    fail(
      'CSV_TEMPLATE_PREAMBLE_MISSING',
      `CSV must begin with '#${DECIDIX_CSV_MARKER_KEY}: ${DECIDIX_CSV_MARKER_VALUE}'. Use the Decidix CSV template.`
    );
  }

  const knownPreambleKeys = new Set<string>([
    DECIDIX_CSV_MARKER_KEY,
    ...DECIDIX_CSV_REQUIRED_PREAMBLE,
    ...DECIDIX_CSV_OPTIONAL_PREAMBLE,
  ]);
  for (const key of Object.keys(preamble)) {
    if (!knownPreambleKeys.has(key)) {
      fail('CSV_TEMPLATE_PREAMBLE_INVALID', `Unknown metadata key '${key}'. Use the Decidix CSV template.`);
    }
  }
  const missingPreamble = DECIDIX_CSV_REQUIRED_PREAMBLE.filter(
    (key) => !preamble[key] || preamble[key].trim().length === 0
  );
  if (missingPreamble.length > 0) {
    fail('CSV_TEMPLATE_PREAMBLE_MISSING', `Missing metadata key(s): ${missingPreamble.join(', ')}.`);
  }
  const status = (preamble.status ?? 'synced').toLowerCase();
  if (status !== 'synced' && status !== 'overdue') {
    fail('CSV_TEMPLATE_PREAMBLE_INVALID', "Metadata 'status' must be 'synced' or 'overdue'.");
  }
  const ageDays = Number(preamble.age_days);
  if (!Number.isFinite(ageDays) || ageDays < 0) {
    fail('CSV_TEMPLATE_PREAMBLE_INVALID', "Metadata 'age_days' must be a number >= 0.");
  }

  // The indicator that supplies regional scores and the national history. It
  // defaults to the documented `development_index` key and may be renamed
  // explicitly, which keeps the rule visible instead of guessed.
  const developmentIndicatorKey = (preamble.development_indicator ?? DECIDIX_CSV_DEVELOPMENT_INDICATOR).toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/.test(developmentIndicatorKey)) {
    fail(
      'CSV_TEMPLATE_PREAMBLE_INVALID',
      `Metadata 'development_indicator' must be lowercase snake_case (found '${developmentIndicatorKey}').`
    );
  }

  const requiredColumns = [...DECIDIX_CSV_COLUMNS];
  const headerSet = new Set(headerCells);
  if (headerSet.size !== headerCells.length) {
    fail('CSV_TEMPLATE_HEADER_UNKNOWN', `Header row ${headerLineNumber} repeats a column name.`);
  }
  const unknownColumns = headerCells.filter((cell) => !requiredColumns.includes(cell as never));
  if (unknownColumns.length > 0) {
    fail(
      'CSV_TEMPLATE_HEADER_UNKNOWN',
      `Unknown column(s): ${unknownColumns.join(', ')}. Use the Decidix CSV template.`
    );
  }
  const missingColumns = requiredColumns.filter((column) => !headerSet.has(column));
  if (missingColumns.length > 0) {
    fail('CSV_TEMPLATE_HEADER_MISSING', `Missing required column(s): ${missingColumns.join(', ')}.`);
  }

  const regions = new Map<string, RegionDefinition>();
  const indicators = new Map<string, IndicatorDefinition>();
  const observations: Observation[] = [];
  const seenObservations = new Map<string, number>();

  for (const { line, number } of rowLines) {
    const cells = splitCsvLine(line, number);
    if (cells.length !== headerCells.length) {
      fail(
        'CSV_TEMPLATE_ROW_INCOMPLETE',
        `Line ${number}: expected ${headerCells.length} columns, found ${cells.length}.`
      );
    }
    const row: Record<string, string> = {};
    headerCells.forEach((column, index) => {
      row[column] = cells[index];
    });

    const regionId = row.region_id;
    if (!/^[a-z][a-z0-9_]*$/.test(regionId)) {
      fail(
        'CSV_TEMPLATE_UNKNOWN_REGION',
        `Line ${number}: region_id '${regionId}' must be lowercase snake_case (e.g. central_capital).`
      );
    }
    const regionName = row.region_name;
    const regionNameAr = row.region_name_ar;
    if (regionName.length === 0 || regionNameAr.length === 0) {
      fail('CSV_TEMPLATE_ROW_INCOMPLETE', `Line ${number}: region_name and region_name_ar are required.`);
    }
    const populationValue = inRange(
      numeric(row.region_population, 'region_population', number),
      1,
      2_000_000_000,
      'region_population',
      number
    );
    if (!Number.isInteger(populationValue)) {
      fail('CSV_TEMPLATE_VALUE_INVALID', `Line ${number}: region_population must be an integer.`);
    }
    const population = populationValue;
    const latitude = inRange(numeric(row.region_latitude, 'region_latitude', number), -90, 90, 'region_latitude', number);
    const longitude = inRange(
      numeric(row.region_longitude, 'region_longitude', number),
      -180,
      180,
      'region_longitude',
      number
    );

    const existingRegion = regions.get(regionId);
    if (existingRegion) {
      if (
        existingRegion.name !== regionName ||
        existingRegion.nameAr !== regionNameAr ||
        existingRegion.population !== population ||
        existingRegion.latitude !== latitude ||
        existingRegion.longitude !== longitude
      ) {
        fail(
          'CSV_TEMPLATE_CONFLICTING_REGION',
          `Line ${number}: region '${regionId}' is described inconsistently with its other rows.`
        );
      }
    } else {
      regions.set(regionId, { id: regionId, name: regionName, nameAr: regionNameAr, population, latitude, longitude });
    }

    const indicatorKey = row.indicator_key;
    if (!/^[a-z][a-z0-9_]*$/.test(indicatorKey)) {
      fail(
        'CSV_TEMPLATE_UNKNOWN_INDICATOR',
        `Line ${number}: indicator_key '${indicatorKey}' must be lowercase snake_case.`
      );
    }
    const unit = row.indicator_unit.toLowerCase();
    if (!(DECIDIX_CSV_ALLOWED_UNITS as readonly string[]).includes(unit)) {
      fail(
        'CSV_TEMPLATE_UNIT_INVALID',
        `Line ${number}: unit '${row.indicator_unit}' is not supported. Allowed: ${DECIDIX_CSV_ALLOWED_UNITS.join(', ')}.`
      );
    }
    const domain = row.indicator_domain.toLowerCase();
    if (!(DECIDIX_CSV_ALLOWED_DOMAINS as readonly string[]).includes(domain)) {
      fail(
        'CSV_TEMPLATE_DOMAIN_INVALID',
        `Line ${number}: domain '${row.indicator_domain}' is not supported. Allowed: ${DECIDIX_CSV_ALLOWED_DOMAINS.join(', ')}.`
      );
    }
    const higherRaw = row.indicator_higher_is_better.toLowerCase();
    if (higherRaw !== 'true' && higherRaw !== 'false') {
      fail('CSV_TEMPLATE_VALUE_INVALID', `Line ${number}: indicator_higher_is_better must be 'true' or 'false'.`);
    }
    const higherIsBetter = higherRaw === 'true';
    const indicatorLabel = row.indicator_label;
    const indicatorLabelAr = row.indicator_label_ar;
    if (indicatorLabel.length === 0 || indicatorLabelAr.length === 0) {
      fail(
        'CSV_TEMPLATE_ROW_INCOMPLETE',
        `Line ${number}: indicator_label and indicator_label_ar are required.`
      );
    }

    const existingIndicator = indicators.get(indicatorKey);
    if (existingIndicator) {
      if (
        existingIndicator.label !== indicatorLabel ||
        existingIndicator.labelAr !== indicatorLabelAr ||
        existingIndicator.domain !== domain ||
        existingIndicator.unit !== unit ||
        existingIndicator.higherIsBetter !== higherIsBetter
      ) {
        fail(
          'CSV_TEMPLATE_CONFLICTING_INDICATOR',
          `Line ${number}: indicator '${indicatorKey}' is defined inconsistently (label, domain, unit or direction differ).`
        );
      }
    } else {
      indicators.set(indicatorKey, {
        key: indicatorKey,
        label: indicatorLabel,
        labelAr: indicatorLabelAr,
        domain,
        unit,
        higherIsBetter,
      });
    }

    const yearValue = numeric(row.year, 'year', number);
    if (!Number.isInteger(yearValue)) {
      fail('CSV_TEMPLATE_VALUE_INVALID', `Line ${number}: year must be an integer.`);
    }
    const year = inRange(yearValue, 1900, 2100, 'year', number);

    const range = UNIT_RANGES[unit];
    const value = inRange(numeric(row.value, 'value', number), range.min, range.max, `'${indicatorKey}' value (${unit})`, number);

    const observationKey = `${regionId}|${indicatorKey}|${year}`;
    const previousLine = seenObservations.get(observationKey);
    if (previousLine !== undefined) {
      fail(
        'CSV_TEMPLATE_DUPLICATE_OBSERVATION',
        `Line ${number}: duplicate observation for region '${regionId}', indicator '${indicatorKey}', year ${year} (first seen on line ${previousLine}).`
      );
    }
    seenObservations.set(observationKey, number);
    observations.push({ regionId, indicatorKey, year, value });
  }

  const developmentIndicator = indicators.get(developmentIndicatorKey);
  if (!developmentIndicator) {
    fail(
      'CSV_DEVELOPMENT_INDEX_REQUIRED',
      `CSV must include the '${developmentIndicatorKey}' indicator; it is used for regional scores, ranking and national history.`
    );
  }
  if (developmentIndicator.unit !== 'score_100' || !developmentIndicator.higherIsBetter) {
    fail(
      'CSV_TEMPLATE_CONFLICTING_INDICATOR',
      `Indicator '${developmentIndicatorKey}' must use unit 'score_100' with indicator_higher_is_better=true.`
    );
  }

  const years = [...new Set(observations.map((observation) => observation.year))].sort((a, b) => a - b);
  const developmentByRegionYear = new Map<string, number>();
  for (const observation of observations) {
    if (observation.indicatorKey === developmentIndicatorKey) {
      developmentByRegionYear.set(`${observation.regionId}|${observation.year}`, observation.value);
    }
  }
  for (const year of years) {
    for (const regionId of regions.keys()) {
      if (!developmentByRegionYear.has(`${regionId}|${year}`)) {
        fail(
          'CSV_DEVELOPMENT_INDEX_INCOMPLETE',
          `Region '${regionId}' has no '${developmentIndicatorKey}' observation for ${year}; the national index would otherwise mix an incomplete subset.`
        );
      }
    }
  }

  const latestYear = years[years.length - 1];
  const previousYear = years.length > 1 ? years[years.length - 2] : latestYear;

  const rankedRegions = [...regions.values()]
    .map((region) => {
      const latest = developmentByRegionYear.get(`${region.id}|${latestYear}`)!;
      const previous = developmentByRegionYear.get(`${region.id}|${previousYear}`) ?? latest;
      return { region, latest, change: round1(latest - previous) };
    })
    .sort((a, b) => (b.latest === a.latest ? a.region.id.localeCompare(b.region.id) : b.latest - a.latest));

  const regionCount = rankedRegions.length;
  const highCutoff = Math.ceil(regionCount / 3);
  const mediumCutoff = Math.ceil((regionCount * 2) / 3);

  const canonicalRegions = rankedRegions.map(({ region, latest, change }, index) => {
    const rank = index + 1;
    const priority = rank <= highCutoff ? 'high' : rank <= mediumCutoff ? 'medium' : 'low';
    return {
      id: region.id,
      name: region.name,
      arabic_name: region.nameAr,
      rank,
      score: round1(latest),
      change,
      priority,
      population: region.population,
      latitude: region.latitude,
      longitude: region.longitude,
    };
  });

  const totalPopulation = [...regions.values()].reduce((sum, region) => sum + region.population, 0);

  const nationalIndexHistory = years.map((year, index) => {
    const scores = [...regions.keys()].map((regionId) => developmentByRegionYear.get(`${regionId}|${year}`)!);
    const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const previousMean =
      index === 0
        ? mean
        : [...regions.keys()].reduce(
            (sum, regionId) => sum + developmentByRegionYear.get(`${regionId}|${years[index - 1]}`)!,
            0
          ) / scores.length;
    return {
      period: String(year),
      year,
      score: round1(mean),
      max_score: 100,
      change: round1(mean - previousMean),
      compared_with: index === 0 ? 'baseline year' : String(years[index - 1]),
      band: bandFor(mean),
      population: totalPopulation,
      regions_count: scores.length,
      at_risk_count: scores.filter((value) => value < mean - ATRISK_DELTA).length,
      // Deterministic explanation of the derived value, not an independent statistic.
      ai_insight_text: `National index for ${year} is the unweighted mean of ${scores.length} regional '${developmentIndicatorKey}' observations from the uploaded CSV; it is a derived value, not an independent statistic.`,
      ai_insight_arabic_text: `المؤشر الوطني لعام ${year} هو المتوسط غير المرجح لعدد ${scores.length} من قراءات مؤشر التنمية الإقليمية الواردة في ملف CSV المرفوع؛ وهو قيمة مشتقة وليست إحصائية مستقلة.`,
    };
  });

  const regionalMetrics = [...observations]
    .sort(
      (a, b) =>
        a.regionId.localeCompare(b.regionId) ||
        a.indicatorKey.localeCompare(b.indicatorKey) ||
        a.year - b.year
    )
    .map((observation) => ({
      region_id: observation.regionId,
      indicator_key: observation.indicatorKey,
      year: observation.year,
      value: observation.value,
    }));

  const canonical = {
    regions: canonicalRegions,
    indicators: [...indicators.values()].map((indicator) => ({
      key: indicator.key,
      label: indicator.label,
      arabic_label: indicator.labelAr,
      domain: indicator.domain,
      unit: indicator.unit,
      higher_is_better: indicator.higherIsBetter,
    })),
    national_index_history: nationalIndexHistory,
    regional_metrics: regionalMetrics,
    metadata: {
      name: preamble.name,
      arabic_name: preamble.name_ar,
      original_source: preamble.source,
      license: preamble.license,
      geographic_coverage: preamble.geographic_coverage,
      time_coverage: preamble.time_coverage,
      update_frequency: preamble.update_frequency,
      record_count: observations.length,
      completeness_pct: percentage(preamble.completeness_pct, 'completeness_pct'),
      timeliness_pct: percentage(preamble.timeliness_pct, 'timeliness_pct'),
      accuracy_pct: percentage(preamble.accuracy_pct, 'accuracy_pct'),
      age_days: ageDays,
      status,
    },
  };

  return [{ canonical }];
}
