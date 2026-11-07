/**
 * Batch 2 — local dataset bootstrap.
 *
 * Reads the repository's curated synthetic dataset, normalises it into the
 * canonical payload the existing DatasetService already validates, then runs
 * the REAL pipeline: register version -> validate -> ingest -> activate.
 *
 * It never inserts analytical rows directly; DatasetService remains the only
 * writer of regions/indicators/metrics/history/metadata.
 *
 * Provenance: `datasets/processed/curated_regional_development.csv` is generated
 * by `scripts/pipeline_ingest.py` from a fixed 12-region base_score table. It is
 * `synthetic_demo` data, NOT official statistics. No source URL, publisher or
 * licence is claimed here.
 *
 * Usage (from backend/):
 *   npx tsx src/scripts/bootstrap-dataset.ts
 *
 * Idempotent: a deterministic version id is reused; a rerun validates and
 * re-ingests the same version, then re-activates it. It never deletes users,
 * sessions, or another dataset version.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../database/prisma.js';
import { SEED_REGIONS, SEED_RECOMMENDATIONS } from '../database/seed_data.js';
import { sha256Hex } from '../integrations/r2.service.js';
import { DatasetService } from '../services/dataset.service.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const CSV_PATH = join(repoRoot, 'datasets', 'processed', 'curated_regional_development.csv');

const VERSION_ID = 'ds_demo_curated_2025_v1';
const VERSION_LABEL = 'demo-curated-2025-v1';
const DATASET_NAME = 'Decidix Synthetic Demonstration Dataset (2019-2025)';

type CsvRow = Record<string, string>;

interface IndicatorSpec {
  key: string;
  column: string;
  label: string;
  arabicLabel: string;
  domain: 'healthcare' | 'education' | 'economy' | 'infrastructure' | 'overall';
  unit: string;
  higherIsBetter: boolean;
}

const INDICATORS: IndicatorSpec[] = [
  { key: 'life_expectancy', column: 'life_expectancy', label: 'Life expectancy', arabicLabel: 'متوسط العمر المتوقع', domain: 'healthcare', unit: 'years', higherIsBetter: true },
  { key: 'physicians_density', column: 'physicians_density', label: 'Doctors per 1k', arabicLabel: 'أطباء لكل ألف', domain: 'healthcare', unit: 'per_thousand', higherIsBetter: true },
  { key: 'bed_capacity', column: 'bed_capacity', label: 'Beds per 1k', arabicLabel: 'أسرة لكل ألف', domain: 'healthcare', unit: 'per_thousand', higherIsBetter: true },
  { key: 'maternal_mortality', column: 'maternal_mortality', label: 'Maternal mortality', arabicLabel: 'وفيات الأمهات', domain: 'healthcare', unit: 'per_mille', higherIsBetter: false },
  { key: 'clinic_shortfall_pct', column: 'clinic_shortfall_pct', label: 'Clinic shortfall', arabicLabel: 'نقص العيادات', domain: 'healthcare', unit: 'percent', higherIsBetter: false },

  { key: 'literacy_rate', column: 'literacy_rate', label: 'Literacy rate', arabicLabel: 'معدل الإلمام بالقراءة', domain: 'education', unit: 'percent', higherIsBetter: true },
  { key: 'school_enrolment', column: 'school_enrolment', label: 'School enrolment', arabicLabel: 'الالتحاق بالمدارس', domain: 'education', unit: 'percent', higherIsBetter: true },
  { key: 'teacher_pupil_ratio', column: 'teacher_pupil_ratio', label: 'Teacher : pupil', arabicLabel: 'المعلم : الطالب', domain: 'education', unit: 'pupils_per_teacher', higherIsBetter: false },
  { key: 'tertiary_completion', column: 'tertiary_completion', label: 'Tertiary completion', arabicLabel: 'إتمام التعليم العالي', domain: 'education', unit: 'percent', higherIsBetter: true },

  { key: 'unemployment_rate', column: 'unemployment_rate', label: 'Unemployment rate', arabicLabel: 'معدل البطالة', domain: 'economy', unit: 'percent', higherIsBetter: false },
  { key: 'labor_participation', column: 'labor_participation', label: 'Labour participation', arabicLabel: 'المشاركة في القوى العاملة', domain: 'economy', unit: 'percent', higherIsBetter: true },
  { key: 'gdp_per_capita', column: 'gdp_per_capita', label: 'GDP per capita', arabicLabel: 'الناتج المحلي للفرد', domain: 'economy', unit: 'usd', higherIsBetter: true },
  { key: 'sme_density', column: 'sme_density', label: 'SME density', arabicLabel: 'كثافة المنشآت الصغيرة', domain: 'economy', unit: 'percent', higherIsBetter: true },

  { key: 'paved_roads_pct', column: 'paved_roads_pct', label: 'Paved roads', arabicLabel: 'الطرق المعبدة', domain: 'infrastructure', unit: 'percent', higherIsBetter: true },
  { key: 'potable_water_access_pct', column: 'potable_water_access_pct', label: 'Potable water access', arabicLabel: 'الوصول لمياه الشرب', domain: 'infrastructure', unit: 'percent', higherIsBetter: true },
  { key: 'sanitation_index', column: 'sanitation_index', label: 'Sanitation index', arabicLabel: 'مؤشر الصرف الصحي', domain: 'infrastructure', unit: 'score_100', higherIsBetter: true },
  { key: 'broadband_coverage_pct', column: 'broadband_coverage_pct', label: 'Broadband coverage', arabicLabel: 'تغطية النطاق العريض', domain: 'infrastructure', unit: 'percent', higherIsBetter: true },

  { key: 'development_index', column: 'development_index', label: 'Development index', arabicLabel: 'مؤشر التنمية', domain: 'overall', unit: 'score_100', higherIsBetter: true },
];

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error('Curated CSV has no data rows.');
  const headers = lines[0].split(',').map((header) => header.trim());
  const required = ['region_id', 'year', ...INDICATORS.map((indicator) => indicator.column)];
  for (const column of required) {
    if (!headers.includes(column)) throw new Error(`Curated CSV is missing required column "${column}".`);
  }
  return lines.slice(1).map((line, index) => {
    const values = line.split(',');
    if (values.length !== headers.length) {
      throw new Error(`Curated CSV row ${index + 2} has ${values.length} columns; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex].trim()]));
  });
}

function num(row: CsvRow, column: string): number {
  const value = Number(row[column]);
  if (!Number.isFinite(value)) throw new Error(`Non-numeric value in column "${column}": "${row[column]}".`);
  return value;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function bandFor(score: number): string {
  if (score >= 85) return 'high';
  if (score >= 70) return 'moderate_high';
  if (score >= 55) return 'moderate';
  return 'low';
}

const INSIGHT_EN =
  'Synthetic demonstration series: the national index is the unweighted mean of the 12 illustrative regional development indices for this year. Not an official statistic.';
const INSIGHT_AR =
  'سلسلة عرض توضيحية اصطناعية: المؤشر الوطني هو المتوسط غير المرجح لمؤشرات التنمية الإقليمية الاثني عشر لهذا العام. ليست إحصائية رسمية.';

function buildCanonical(rows: CsvRow[]) {
  const years = [...new Set(rows.map((row) => Number(row.year)))].sort((a, b) => a - b);
  if (years.length === 0) throw new Error('Curated CSV has no years.');
  const latestYear = years[years.length - 1];
  const previousYear = years.length > 1 ? years[years.length - 2] : latestYear;

  const regionMeta = new Map(SEED_REGIONS.map((region) => [region.id, region]));
  const regionIds = [...new Set(rows.map((row) => row.region_id))].sort();
  for (const regionId of regionIds) {
    if (!regionMeta.has(regionId)) throw new Error(`No illustrative region metadata for "${regionId}".`);
  }

  const valueAt = (regionId: string, year: number, column: string): number | null => {
    const row = rows.find((candidate) => candidate.region_id === regionId && Number(candidate.year) === year);
    return row ? num(row, column) : null;
  };

  const latestScores = regionIds.map((regionId) => {
    const score = valueAt(regionId, latestYear, 'development_index');
    if (score === null) throw new Error(`Region "${regionId}" has no development_index for ${latestYear}.`);
    return { regionId, score };
  });
  const ranked = [...latestScores].sort((a, b) => b.score - a.score);

  const regions = ranked.map(({ regionId, score }, index) => {
    const meta = regionMeta.get(regionId)!;
    const previous = valueAt(regionId, previousYear, 'development_index') ?? score;
    const rank = index + 1;
    const priority = rank <= 4 ? 'high' : rank <= 8 ? 'medium' : 'low';
    return {
      id: regionId,
      name: meta.name,
      arabic_name: meta.arabic_name,
      rank,
      score: round(score),
      change: round(score - previous),
      priority,
      population: meta.population,
      latitude: meta.latitude,
      longitude: meta.longitude,
      // No boundary geometry is claimed: the 12 regions are illustrative.
    };
  });

  const indicators = INDICATORS.map((indicator) => ({
    key: indicator.key,
    label: indicator.label,
    arabic_label: indicator.arabicLabel,
    domain: indicator.domain,
    unit: indicator.unit,
    higher_is_better: indicator.higherIsBetter,
  }));

  const nationalIndexHistory = years.map((year, index) => {
    const scores = regionIds.map((regionId) => {
      const value = valueAt(regionId, year, 'development_index');
      if (value === null) throw new Error(`Region "${regionId}" has no development_index for ${year}.`);
      return value;
    });
    const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const previousMean =
      index === 0
        ? mean
        : regionIds.reduce((sum, regionId) => sum + (valueAt(regionId, years[index - 1], 'development_index') ?? 0), 0) / regionIds.length;
    const population = regionIds.reduce((sum, regionId) => sum + regionMeta.get(regionId)!.population, 0);
    const atRiskThreshold = mean - 3;
    return {
      period: String(year),
      year,
      score: round(mean),
      max_score: 100,
      change: round(mean - previousMean),
      compared_with: index === 0 ? 'baseline year' : String(years[index - 1]),
      band: bandFor(mean),
      population,
      regions_count: regionIds.length,
      at_risk_count: scores.filter((value) => value < atRiskThreshold).length,
      ai_insight_text: INSIGHT_EN,
      ai_insight_arabic_text: INSIGHT_AR,
    };
  });

  const regionalMetrics: Array<Record<string, unknown>> = [];
  for (const indicator of INDICATORS) {
    for (const regionId of regionIds) {
      const series = years.map((year) => valueAt(regionId, year, indicator.column));
      series.forEach((value, index) => {
        if (value === null) throw new Error(`Region "${regionId}" has no ${indicator.column} for ${years[index]}.`);
        const previous = index === 0 ? value : (series[index - 1] ?? value);
        const sparkline = series.slice(0, index + 1).filter((point): point is number => point !== null).slice(-4).map((point) => round(point));
        regionalMetrics.push({
          region_id: regionId,
          indicator_key: indicator.key,
          year: years[index],
          value: round(value, 2),
          change: round(value - previous, 2),
          sparkline,
        });
      });
    }
  }

  return {
    regions,
    indicators,
    national_index_history: nationalIndexHistory,
    regional_metrics: regionalMetrics,
    recommendations: SEED_RECOMMENDATIONS.map((r) => ({
      id: r.id,
      priority: r.priority,
      region_id: r.region.region_id,
      domain: r.domain,
      title: r.title,
      arabic_title: r.arabic_title,
      summary: r.summary,
      arabic_summary: r.arabic_summary,
      index_impact: r.index_impact,
      estimated_cost_amount: r.estimated_cost.amount,
      estimated_cost_currency: r.estimated_cost.currency,
      confidence: r.confidence,
      status: r.status,
    })),
    metadata: {
      name: DATASET_NAME,
      arabic_name: 'مجموعة بيانات عرض توضيحية اصطناعية (2019-2025)',
      original_source:
        'Generated locally by scripts/pipeline_ingest.py from a fixed 12-region base_score table; synthetic demonstration data, not official statistics.',
      license: 'Synthetic academic demonstration data; no official licence is claimed.',
      geographic_coverage: '12 illustrative regions (not official administrative boundaries).',
      time_coverage: `${years[0]}-${latestYear}`,
      update_frequency: 'not scheduled',
      record_count: rows.length,
      completeness_pct: 100,
      timeliness_pct: 100,
      // Accuracy is not measurable for synthetic values; stored as 0 rather than overclaimed.
      accuracy_pct: 0,
      age_days: 0,
      // The migration allows only 'synced' | 'overdue'; classification lives in
      // original_source/license, not in this operational status field.
      status: 'synced',
    },
  };
}

async function main(): Promise<void> {
  const csv = readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csv);
  if (rows.length !== 84) {
    console.warn(`[bootstrap] expected 84 curated rows, found ${rows.length}; continuing with the file as-is.`);
  }

  const canonical = buildCanonical(rows);
  const payload = Buffer.from(JSON.stringify([{ canonical }]), 'utf8');

  const existing = await prisma.datasetVersion.findUnique({ where: { id: VERSION_ID } });
  if (!existing) {
    await DatasetService.registerLocalVersion({
      id: VERSION_ID,
      version: VERSION_LABEL,
      filename: 'curated_regional_development.canonical.json',
      objectKey: `local://datasets/processed/curated_regional_development.csv`,
      content: payload,
      format: 'json',
      source: 'Synthetic demonstration dataset generated by scripts/pipeline_ingest.py',
      license: 'Synthetic academic demonstration data; no official licence is claimed.',
      coverage: '12 illustrative regions; 2019-2025; not official statistics',
      createdBy: 'bootstrap-dataset',
    });
    console.log(`[bootstrap] registered version ${VERSION_ID}`);
  } else {
    console.log(`[bootstrap] version ${VERSION_ID} already exists; reusing it`);
    const contentHash = sha256Hex(payload);
    if (existing.checksumSha256 !== contentHash) {
      // The canonical payload is derived from the curated CSV; if the builder
      // changes, refresh the stored checksum so validate() can re-check it.
      await prisma.datasetVersion.update({
        where: { id: VERSION_ID },
        data: {
          checksumSha256: contentHash,
          filename: 'curated_regional_development.canonical.json',
          objectKey: 'local://datasets/processed/curated_regional_development.csv',
          format: 'json',
          source: 'Synthetic demonstration dataset generated by scripts/pipeline_ingest.py',
          license: 'Synthetic academic demonstration data; no official licence is claimed.',
          coverage: '12 illustrative regions; 2019-2025; not official statistics',
        },
      });
      console.log('[bootstrap] payload changed; checksum refreshed for re-bootstrap');
    }
  }

  const validated = await DatasetService.validate(VERSION_ID, payload);
  console.log(`[bootstrap] validated: status=${validated.validationStatus} records=${validated.recordCount}`);

  const ingestResult = await DatasetService.ingest(VERSION_ID, payload);
  console.log(`[bootstrap] ingested: status=${ingestResult.status} record_count=${ingestResult.record_count}`);

  const activated = await DatasetService.activate(VERSION_ID);
  console.log(`[bootstrap] activated: id=${activated.id} version=${activated.version} isActive=${activated.isActive}`);

  const [records, metadata, regions, indicators, history, metrics] = await Promise.all([
    prisma.datasetRecord.count({ where: { datasetVersionId: VERSION_ID } }),
    prisma.datasetMetadata.count({ where: { datasetVersionId: VERSION_ID } }),
    prisma.region.count({ where: { datasetVersionId: VERSION_ID } }),
    prisma.indicator.count({ where: { datasetVersionId: VERSION_ID } }),
    prisma.nationalIndexHistory.count({ where: { datasetVersionId: VERSION_ID } }),
    prisma.regionalMetric.count({ where: { datasetVersionId: VERSION_ID } }),
  ]);

  console.log(
    `[bootstrap] version-scoped rows: records=${records} metadata=${metadata} regions=${regions} indicators=${indicators} history=${history} metrics=${metrics}`
  );
  if (records === 0 || metadata === 0 || regions === 0 || indicators === 0 || history === 0 || metrics === 0) {
    throw new Error('Bootstrap completeness check failed: a required version-scoped table is empty.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('[bootstrap] FAILED:', error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
