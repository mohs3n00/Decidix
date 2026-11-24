import * as XLSX from 'xlsx';
import { createHash } from 'node:crypto';
import { AppError } from '../utils/response.js';

export type SupportedFormat = 'csv' | 'tsv' | 'xlsx' | 'xls' | 'json' | 'jsonl' | 'ndjson';

export interface DataQualityReport {
  datasetId: string;
  filename: string;
  format: string;
  sheetName?: string;
  availableSheets?: string[];
  totalInputRecords: number;
  processedRecords: number;
  rejectedRecords: number;
  duplicateRecords: number;
  rejectedRowDetails: Array<{ row: number; reason: string; sample?: unknown }>;
  columnStatistics: Record<
    string,
    {
      inferredType: 'number' | 'string' | 'date' | 'boolean' | 'null';
      totalValues: number;
      missingCount: number;
      missingPct: number;
      sampleValues: unknown[];
    }
  >;
  detectedColumns: string[];
  canonicalMapping: Record<string, string> | null;
  appliedTransformations: string[];
  validationWarnings: string[];
  processingErrors: string[];
  status: 'READY' | 'FAILED';
}

export interface ParseResult {
  records: Array<Record<string, unknown>>;
  report: DataQualityReport;
  canonical?: any;
}

// Canonical column candidate aliases (case-insensitive)
const REGION_ALIASES = [
  'region_id', 'region', 'region_name', 'governorate', 'gov', 'province',
  'area', 'location', 'district', 'منطقة', 'محافظة',
];

const INDICATOR_ALIASES = [
  'indicator_key', 'indicator', 'metric', 'metric_name', 'indicator_name',
  'variable', 'measure', 'مؤشر', 'المؤشر',
];

const YEAR_ALIASES = [
  'year', 'date', 'period', 'time', 'year_period', 'observation_year', 'سنة', 'عام', 'فترة',
];

const VALUE_ALIASES = [
  'value', 'score', 'measurement', 'val', 'amount', 'rate', 'metric_value', 'قيمة', 'الدرجة',
];

/**
 * Standard Decidix Region Metadata registry to resolve names/IDs cleanly.
 */
export const KNOWN_REGIONS: Record<string, { id: string; name: string; nameAr: string; pop: number; lat: number; lng: number; aliases?: string[] }> = {
  central_capital: { id: 'central_capital', name: 'Central Capital', nameAr: 'العاصمة المركزية', pop: 8500000, lat: 24.7136, lng: 46.6753 },
  lakeside: { id: 'lakeside', name: 'Lakeside', nameAr: 'ضفاف البحيرة', pop: 3200000, lat: 26.3927, lng: 49.9777 },
  western_coast: { id: 'western_coast', name: 'Western Coast', nameAr: 'الساحل الغربي', pop: 4800000, lat: 21.4858, lng: 39.1925 },
  harbor_lowlands: { id: 'harbor_lowlands', name: 'Harbor Lowlands', nameAr: 'سهول الميناء', pop: 2100000, lat: 28.3838, lng: 36.5550 },
  northern_plains: { id: 'northern_plains', name: 'Northern Plains', nameAr: 'السهول الشمالية', pop: 1800000, lat: 29.9697, lng: 40.2064 },
  eastern_valley: { id: 'eastern_valley', name: 'Eastern Valley', nameAr: 'الوادي الشرقي', pop: 2900000, lat: 25.3833, lng: 49.5833 },
  southern_basin: { id: 'southern_basin', name: 'Southern Basin', nameAr: 'الحوض الجنوبي', pop: 2600000, lat: 18.2164, lng: 42.5053 },
  riverside: { id: 'riverside', name: 'Riverside', nameAr: 'ضفة النهر', pop: 1900000, lat: 17.5656, lng: 44.2289 },
  northern_highlands: { id: 'northern_highlands', name: 'Northern Highlands', nameAr: 'المرتفعات الشمالية', pop: 1400000, lat: 27.5219, lng: 41.6957 },
  delta: { id: 'delta', name: 'Delta', nameAr: 'الدلتا', pop: 2200000, lat: 26.1550, lng: 50.1970 },
  steppe: { id: 'steppe', name: 'Steppe', nameAr: 'السهوب', pop: 1100000, lat: 31.0456, lng: 38.2839 },
  frontier: { id: 'frontier', name: 'Frontier', nameAr: 'المنطقة الحدودية', pop: 950000, lat: 31.3090, lng: 37.3386 },
  // 27 Egyptian Governorates (CAPMAS baseline metadata)
  cairo: { id: 'cairo', name: 'Cairo', nameAr: 'القاهرة', pop: 10200000, lat: 30.0444, lng: 31.2357, aliases: ['al_qahirah'] },
  giza: { id: 'giza', name: 'Giza', nameAr: 'الجيزة', pop: 9500000, lat: 30.0131, lng: 31.2089, aliases: ['al_jizah'] },
  alexandria: { id: 'alexandria', name: 'Alexandria', nameAr: 'الإسكندرية', pop: 5500000, lat: 31.2001, lng: 29.9187, aliases: ['al_iskandariyah'] },
  dakahlia: { id: 'dakahlia', name: 'Dakahlia', nameAr: 'الدقهلية', pop: 7000000, lat: 31.0409, lng: 31.3785, aliases: ['ad_daqahliyah'] },
  sharqia: { id: 'sharqia', name: 'Sharqia', nameAr: 'الشرقية', pop: 7900000, lat: 30.5765, lng: 31.5041, aliases: ['ash_sharqiyah'] },
  qalyubia: { id: 'qalyubia', name: 'Qalyubia', nameAr: 'القليوبية', pop: 6100000, lat: 30.3292, lng: 31.2422, aliases: ['qalyubiyya', 'al_qalyubiyah'] },
  beheira: { id: 'beheira', name: 'Beheira', nameAr: 'البحيرة', pop: 6800000, lat: 30.8481, lng: 30.3436, aliases: ['al_buhayrah'] },
  gharbia: { id: 'gharbia', name: 'Gharbia', nameAr: 'الغربية', pop: 5400000, lat: 30.8754, lng: 31.0335, aliases: ['al_gharbia', 'al_gharbiyah'] },
  menoufia: { id: 'menoufia', name: 'Menoufia', nameAr: 'المنوفية', pop: 4700000, lat: 30.5972, lng: 30.9876, aliases: ['monufia', 'al_minufiyah'] },
  kafr_el_sheikh: { id: 'kafr_el_sheikh', name: 'Kafr El Sheikh', nameAr: 'كفر الشيخ', pop: 3700000, lat: 31.1107, lng: 30.9388, aliases: ['kafr_al_shaykh'] },
  damietta: { id: 'damietta', name: 'Damietta', nameAr: 'دمياط', pop: 1620000, lat: 31.4175, lng: 31.8144, aliases: ['dumyat'] },
  port_said: { id: 'port_said', name: 'Port Said', nameAr: 'بورسعيد', pop: 790000, lat: 31.2653, lng: 32.3019, aliases: ['bur_said'] },
  ismailia: { id: 'ismailia', name: 'Ismailia', nameAr: 'الإسماعيلية', pop: 1450000, lat: 30.5965, lng: 32.2715, aliases: ['al_ismailiyah'] },
  suez: { id: 'suez', name: 'Suez', nameAr: 'السويس', pop: 790000, lat: 29.9668, lng: 32.5498, aliases: ['as_suways'] },
  fayoum: { id: 'fayoum', name: 'Fayoum', nameAr: 'الفيوم', pop: 4100000, lat: 29.3084, lng: 30.8428, aliases: ['fayum', 'faiyum', 'al_fayyum'] },
  beni_suef: { id: 'beni_suef', name: 'Beni Suef', nameAr: 'بني سويف', pop: 3600000, lat: 29.0661, lng: 31.0994, aliases: ['bani_suwayf'] },
  minya: { id: 'minya', name: 'Minya', nameAr: 'المنيا', pop: 6300000, lat: 28.0871, lng: 30.7618, aliases: ['al_minya'] },
  assiut: { id: 'assiut', name: 'Assiut', nameAr: 'أسيوط', pop: 5000000, lat: 27.1783, lng: 31.1859, aliases: ['asyut'] },
  sohag: { id: 'sohag', name: 'Sohag', nameAr: 'سوهاج', pop: 5700000, lat: 26.5591, lng: 31.6957, aliases: ['suhaj'] },
  qena: { id: 'qena', name: 'Qena', nameAr: 'قنا', pop: 3600000, lat: 26.1551, lng: 32.7160, aliases: ['qina'] },
  luxor: { id: 'luxor', name: 'Luxor', nameAr: 'الأقصر', pop: 1400000, lat: 25.6872, lng: 32.6396, aliases: ['al_uqsur'] },
  aswan: { id: 'aswan', name: 'Aswan', nameAr: 'أسوان', pop: 1650000, lat: 24.0889, lng: 32.8998 },
  red_sea: { id: 'red_sea', name: 'Red Sea', nameAr: 'البحر الأحمر', pop: 400000, lat: 27.2579, lng: 33.8116, aliases: ['al_bahr_al_ahmar'] },
  new_valley: { id: 'new_valley', name: 'New Valley', nameAr: 'الوادي الجديد', pop: 265000, lat: 25.4390, lng: 30.5586, aliases: ['al_wadi_al_jadid'] },
  matrouh: { id: 'matrouh', name: 'Matrouh', nameAr: 'مطروح', pop: 540000, lat: 31.3543, lng: 27.2373, aliases: ['marsa_matruh', 'matruh'] },
  north_sinai: { id: 'north_sinai', name: 'North Sinai', nameAr: 'شمال سيناء', pop: 510000, lat: 31.1321, lng: 33.8033, aliases: ['shamal_sina'] },
  south_sinai: { id: 'south_sinai', name: 'South Sinai', nameAr: 'جنوب سيناء', pop: 115000, lat: 28.2364, lng: 33.6254, aliases: ['janub_sina'] },
};

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[\s\-_]+/g, '_').replace(/^_+|_+$/g, '').trim();
}

function resolveRegion(raw: string): { id: string; name: string; nameAr: string } {
  const cleaned = raw.trim().replace(/^محافظة\s+/i, '').replace(/\s+governorate$/i, '').replace(/^governorate\s+of\s+/i, '');
  const norm = normalizeKey(cleaned);
  for (const [key, data] of Object.entries(KNOWN_REGIONS)) {
    if (
      norm === key ||
      norm === normalizeKey(data.name) ||
      cleaned === data.nameAr ||
      raw.trim() === data.nameAr ||
      (data.aliases && data.aliases.includes(norm))
    ) {
      return { id: data.id, name: data.name, nameAr: data.nameAr };
    }
  }
  // Generic fallback for custom region/governorate
  const id = norm || 'region_general';
  return { id, name: cleaned || raw.trim(), nameAr: cleaned || raw.trim() };
}

export class DatasetParserService {
  /**
   * Main entry point: Parses any supported file format into structured records and a comprehensive data quality report.
   */
  static parse(
    content: Buffer,
    format: string,
    options: { filename?: string; datasetId?: string; sheetName?: string } = {}
  ): ParseResult {
    const filename = options.filename || `dataset.${format}`;
    const datasetId = options.datasetId || 'ds_preview';
    const fmt = (format || 'csv').toLowerCase().replace(/^\./, '') as SupportedFormat;

    let rawRows: Array<Record<string, unknown>> = [];
    let availableSheets: string[] | undefined;
    let selectedSheet: string | undefined;

    switch (fmt) {
      case 'csv':
      case 'tsv': {
        const text = content.toString('utf-8');
        const delimiter = fmt === 'tsv' ? '\t' : this.detectDelimiter(text);
        rawRows = this.parseDelimitedText(text, delimiter);
        break;
      }
      case 'xlsx':
      case 'xls': {
        const workbook = XLSX.read(content, { type: 'buffer', cellDates: true });
        availableSheets = workbook.SheetNames;
        selectedSheet = options.sheetName && workbook.SheetNames.includes(options.sheetName)
          ? options.sheetName
          : workbook.SheetNames[0];

        if (!selectedSheet) {
          throw AppError.validation('Excel workbook contains no readable sheets.', { sheet: 'EMPTY_WORKBOOK' });
        }

        const worksheet = workbook.Sheets[selectedSheet];
        rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
        break;
      }
      case 'json': {
        const text = content.toString('utf-8').trim();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            if (parsed.length === 1 && parsed[0]?.canonical) {
              return {
                records: [{ canonical: parsed[0].canonical }],
                report: this.buildCanonicalQualityReport(datasetId, filename, parsed[0].canonical),
                canonical: parsed[0].canonical,
              };
            }
            rawRows = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (parsed.canonical) {
              // Direct canonical envelope
              return {
                records: [{ canonical: parsed.canonical }],
                report: this.buildCanonicalQualityReport(datasetId, filename, parsed.canonical),
                canonical: parsed.canonical,
              };
            } else if (Array.isArray(parsed.data)) {
              rawRows = parsed.data;
            } else if (Array.isArray(parsed.records)) {
              rawRows = parsed.records;
            } else {
              rawRows = [parsed];
            }
          }
        } catch (err: any) {
          throw AppError.validation(`Invalid JSON file: ${err.message}`, { json: 'PARSE_ERROR' });
        }
        break;
      }
      case 'jsonl':
      case 'ndjson': {
        const text = content.toString('utf-8');
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        rawRows = lines.map((line, idx) => {
          try {
            return JSON.parse(line);
          } catch {
            throw AppError.validation(`Malformed JSON at line ${idx + 1}`, { line: String(idx + 1) });
          }
        });
        break;
      }
      default:
        throw AppError.validation(`Unsupported format: ${format}`, { format: 'UNSUPPORTED_FORMAT' });
    }

    if (rawRows.length === 0) {
      throw AppError.validation('Uploaded file contains no data rows.', { rows: 'EMPTY_DATASET' });
    }

    // Run Data Quality Assessment & Cleaning Pipeline
    return this.processAndValidate(rawRows, {
      datasetId,
      filename,
      format: fmt,
      availableSheets,
      selectedSheet,
    });
  }

  private static detectDelimiter(text: string): string {
    const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
    const commas = (firstLines.match(/,/g) || []).length;
    const tabs = (firstLines.match(/\t/g) || []).length;
    const semicolons = (firstLines.match(/;/g) || []).length;
    if (tabs > commas && tabs > semicolons) return '\t';
    if (semicolons > commas && semicolons > tabs) return ';';
    return ',';
  }

  private static parseDelimitedText(text: string, delimiter: string): Array<Record<string, unknown>> {
    // Filter out comment lines like #decidix-csv: v1
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0 && !l.startsWith('#'));
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0], delimiter).map((h) => h.trim());
    const rows: Array<Record<string, unknown>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i], delimiter);
      const row: Record<string, unknown> = {};
      headers.forEach((h, index) => {
        row[h] = values[index] !== undefined ? values[index].trim() : null;
      });
      rows.push(row);
    }
    return rows;
  }

  private static parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          current += char;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private static processAndValidate(
    rawRows: Array<Record<string, unknown>>,
    meta: {
      datasetId: string;
      filename: string;
      format: string;
      availableSheets?: string[];
      selectedSheet?: string;
    }
  ): ParseResult {
    const totalInputRecords = rawRows.length;
    const detectedColumns = Object.keys(rawRows[0] || {});
    const columnStats: DataQualityReport['columnStatistics'] = {};
    const rejectedRowDetails: DataQualityReport['rejectedRowDetails'] = [];
    const validationWarnings: string[] = [];
    const processingErrors: string[] = [];
    const appliedTransformations: string[] = [];

    // Initialize Column Statistics
    for (const col of detectedColumns) {
      columnStats[col] = {
        inferredType: 'string',
        totalValues: 0,
        missingCount: 0,
        missingPct: 0,
        sampleValues: [],
      };
    }

    // Column Mapping Detection
    const canonicalMapping = this.detectCanonicalMapping(detectedColumns);
    if (canonicalMapping) {
      appliedTransformations.push(
        `Mapped columns: region='${canonicalMapping.region}', indicator='${canonicalMapping.indicator}', year='${canonicalMapping.year}', value='${canonicalMapping.value}'`
      );
    }

    const seenRowHashes = new Set<string>();
    let duplicateRecords = 0;
    const validRows: Array<Record<string, unknown>> = [];

    // Process each row
    rawRows.forEach((row, index) => {
      const rowNum = index + 1;
      const rowStr = JSON.stringify(row);
      const rowHash = createHash('sha256').update(rowStr).digest('hex');

      // Duplicate detection
      if (seenRowHashes.has(rowHash)) {
        duplicateRecords++;
        validationWarnings.push(`Row ${rowNum} is an exact duplicate and was deduplicated.`);
        return;
      }
      seenRowHashes.add(rowHash);

      // Inspect fields & infer types
      let isRowValid = true;
      let rejectReason = '';

      for (const col of detectedColumns) {
        const val = row[col];
        const stats = columnStats[col];
        stats.totalValues++;

        if (val === null || val === undefined || val === '') {
          stats.missingCount++;
        } else {
          if (stats.sampleValues.length < 3) stats.sampleValues.push(val);
          // Type inference
          if (typeof val === 'number') {
            stats.inferredType = 'number';
          } else if (typeof val === 'boolean') {
            stats.inferredType = 'boolean';
          } else if (typeof val === 'string') {
            if (/^-?\d+(?:\.\d+)?$/.test(val.trim())) {
              stats.inferredType = 'number';
            } else if (!isNaN(Date.parse(val)) && (val.includes('-') || val.includes('/'))) {
              stats.inferredType = 'date';
            }
          }
        }
      }

      // If mapped to canonical, check value & year validity
      if (canonicalMapping) {
        const valRaw = row[canonicalMapping.value];
        const yearRaw = row[canonicalMapping.year];
        const regRaw = row[canonicalMapping.region];
        const indRaw = row[canonicalMapping.indicator];

        if (!regRaw || String(regRaw).trim() === '') {
          isRowValid = false;
          rejectReason = 'Missing region identifier';
        } else if (!indRaw || String(indRaw).trim() === '') {
          isRowValid = false;
          rejectReason = 'Missing indicator name';
        } else {
          const num = Number(valRaw);
          if (valRaw === null || valRaw === undefined || isNaN(num)) {
            isRowValid = false;
            rejectReason = `Invalid numeric value '${valRaw}'`;
          }
          const yr = parseInt(String(yearRaw), 10);
          if (yearRaw && (isNaN(yr) || yr < 1990 || yr > 2050)) {
            isRowValid = false;
            rejectReason = `Invalid year value '${yearRaw}'`;
          }
        }
      }

      if (!isRowValid) {
        rejectedRowDetails.push({ row: rowNum, reason: rejectReason, sample: row });
      } else {
        validRows.push(row);
      }
    });

    // Compute Missing Percentages
    for (const col of detectedColumns) {
      const stats = columnStats[col];
      stats.missingPct = stats.totalValues > 0
        ? Math.round((stats.missingCount / stats.totalValues) * 1000) / 10
        : 0;
      if (stats.missingPct > 20) {
        validationWarnings.push(`Column '${col}' has ${stats.missingPct}% missing values.`);
      }
    }

    if (validRows.length === 0) {
      processingErrors.push('All rows were rejected during quality validation.');
    }

    // Build Canonical Structure if mapped
    let canonicalStructure: any = null;
    if (canonicalMapping && validRows.length > 0) {
      canonicalStructure = this.buildCanonicalFromMappedRows(validRows, canonicalMapping, meta);
      appliedTransformations.push('Transformed flat observations into canonical Decidix envelope.');
    } else {
      processingErrors.push('Could not detect required regional and value columns for canonical ingestion.');
    }

    const qualityReport: DataQualityReport = {
      datasetId: meta.datasetId,
      filename: meta.filename,
      format: meta.format,
      sheetName: meta.selectedSheet,
      availableSheets: meta.availableSheets,
      totalInputRecords,
      processedRecords: validRows.length,
      rejectedRecords: rejectedRowDetails.length,
      duplicateRecords,
      rejectedRowDetails: rejectedRowDetails.slice(0, 20), // Top 20 for brevity
      columnStatistics: columnStats,
      detectedColumns,
      canonicalMapping,
      appliedTransformations,
      validationWarnings,
      processingErrors,
      status: (canonicalStructure && validRows.length > 0) ? 'READY' : 'FAILED',
    };

    return {
      records: canonicalStructure ? [{ canonical: canonicalStructure }] : validRows,
      report: qualityReport,
      canonical: canonicalStructure,
    };
  }

  private static detectCanonicalMapping(columns: string[]): Record<string, string> | null {
    const colMap: Record<string, string> = {};
    for (const col of columns) {
      const norm = normalizeKey(col);
      if (!colMap.region && REGION_ALIASES.includes(norm)) colMap.region = col;
      if (!colMap.indicator && INDICATOR_ALIASES.includes(norm)) colMap.indicator = col;
      if (!colMap.year && YEAR_ALIASES.includes(norm)) colMap.year = col;
      if (!colMap.value && VALUE_ALIASES.includes(norm)) colMap.value = col;
    }

    if (colMap.region && colMap.value) {
      // If indicator or year are not present, fallback
      if (!colMap.indicator) colMap.indicator = columns.find((c) => c !== colMap.region && c !== colMap.value) || 'indicator';
      if (!colMap.year) colMap.year = columns.find((c) => c !== colMap.region && c !== colMap.value && c !== colMap.indicator) || 'year';
      return colMap;
    }
    return null;
  }

  private static buildCanonicalFromMappedRows(
    rows: Array<Record<string, unknown>>,
    mapping: Record<string, string>,
    meta: { datasetId: string; filename: string }
  ): any {
    const regionMap = new Map<string, { id: string; name: string; nameAr: string }>();
    const indicatorMap = new Map<string, { key: string; label: string }>();
    const metrics: Array<{ region_id: string; indicator_key: string; year: number; value: number }> = [];
    const yearlyValues = new Map<number, number[]>();

    const regionYearlyScores = new Map<string, Map<number, number[]>>();
    const regionYearlyPreferred = new Map<string, Map<number, number[]>>();

    for (const r of rows) {
      const rawReg = String(r[mapping.region] || '').trim();
      const rawInd = String(r[mapping.indicator] || 'development_index').trim();
      const rawYr = parseInt(String(r[mapping.year] || '2025'), 10) || 2025;
      const numVal = Number(r[mapping.value]);
      if (!rawReg || !Number.isFinite(numVal)) continue;
      const val = Math.round(numVal * 10) / 10;

      const reg = resolveRegion(rawReg);
      regionMap.set(reg.id, reg);

      const indKey = normalizeKey(rawInd) || 'indicator_general';
      indicatorMap.set(indKey, { key: indKey, label: rawInd });

      metrics.push({
        region_id: reg.id,
        indicator_key: indKey,
        year: rawYr,
        value: val,
      });

      if (!yearlyValues.has(rawYr)) yearlyValues.set(rawYr, []);
      if (val >= 0 && val <= 100) {
        yearlyValues.get(rawYr)!.push(val);
      }

      if (!regionYearlyScores.has(reg.id)) regionYearlyScores.set(reg.id, new Map());
      const yrMap = regionYearlyScores.get(reg.id)!;
      if (!yrMap.has(rawYr)) yrMap.set(rawYr, []);
      if (val >= 0 && val <= 100) {
        yrMap.get(rawYr)!.push(val);
      }

      if (indKey.includes('development_index') || indKey.includes('composite') || indKey === 'score') {
        if (!regionYearlyPreferred.has(reg.id)) regionYearlyPreferred.set(reg.id, new Map());
        const pMap = regionYearlyPreferred.get(reg.id)!;
        if (!pMap.has(rawYr)) pMap.set(rawYr, []);
        pMap.get(rawYr)!.push(val);
      }
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

    // Build Regions list with computed score, change, rank, and priority
    const computedRegions = Array.from(regionMap.values()).map((reg) => {
      const known = KNOWN_REGIONS[reg.id];
      const prefByYear = regionYearlyPreferred.get(reg.id);
      const allByYear = regionYearlyScores.get(reg.id);
      const sourceByYear = prefByYear && prefByYear.size > 0 ? prefByYear : allByYear;

      let score = known ? 70.0 : 65.0;
      let change = 0.0;

      if (sourceByYear && sourceByYear.size > 0) {
        const sortedYears = Array.from(sourceByYear.keys()).sort((a, b) => a - b);
        const latestYr = sortedYears[sortedYears.length - 1];
        const latestVals = sourceByYear.get(latestYr)!;
        score = Math.round(Math.max(0, Math.min(100, avg(latestVals))) * 10) / 10;

        if (sortedYears.length >= 2) {
          const prevYr = sortedYears[sortedYears.length - 2];
          const prevVals = sourceByYear.get(prevYr)!;
          const prevScore = avg(prevVals);
          change = Math.round((score - prevScore) * 10) / 10;
        }
      }

      const priority = score < 50 ? 'high' : score < 65 ? 'medium' : 'low';
      return {
        id: reg.id,
        name: reg.name,
        arabic_name: reg.nameAr,
        rank: 0,
        score,
        change,
        priority,
        population: known ? known.pop : 1000000,
        latitude: known ? known.lat : 30.0444,
        longitude: known ? known.lng : 31.2357,
      };
    });

    computedRegions.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const regions = computedRegions.map((reg, idx) => ({ ...reg, rank: idx + 1 }));

    const totalPopulation = regions.reduce((sum, r) => sum + r.population, 0) || 39600000;
    const atRiskRegions = (yr: number) =>
      regions.filter((reg) => {
        const pref = regionYearlyPreferred.get(reg.id)?.get(yr);
        const all = regionYearlyScores.get(reg.id)?.get(yr);
        const vals = pref && pref.length > 0 ? pref : all;
        const yrScore = vals && vals.length > 0 ? avg(vals) : reg.score;
        return yrScore < 50;
      }).length;

    // Build Indicators list with validated unit and domain check constraints
    const indicators = Array.from(indicatorMap.values()).map((ind) => {
      let unit = 'percent';
      let domain = 'economy';
      const k = ind.key.toLowerCase();
      if (k.includes('expectancy') || k.includes('age') || k.includes('year')) {
        unit = 'years';
      } else if (k.includes('doctor') || k.includes('bed') || k.includes('physician') || k.includes('thousand')) {
        unit = 'per_thousand';
      } else if (k.includes('mille') || k.includes('mortality')) {
        unit = 'per_mille';
      } else if (k.includes('teacher') || k.includes('pupil')) {
        unit = 'pupils_per_teacher';
      } else if (k.includes('usd') || k.includes('gdp') || k.includes('income') || k.includes('cost')) {
        unit = 'usd';
      } else if (k.includes('score') || k.includes('index')) {
        unit = 'score_100';
      }

      if (k.includes('health') || k.includes('doctor') || k.includes('bed') || k.includes('mortality') || k.includes('clinic') || k.includes('life')) {
        domain = 'healthcare';
      } else if (k.includes('education') || k.includes('school') || k.includes('literacy') || k.includes('teacher') || k.includes('pupil')) {
        domain = 'education';
      } else if (k.includes('infra') || k.includes('water') || k.includes('road') || k.includes('broadband') || k.includes('sanitation') || k.includes('electric')) {
        domain = 'infrastructure';
      } else {
        domain = 'economy';
      }

      return {
        key: ind.key,
        label: ind.label,
        arabic_label: ind.label,
        domain,
        unit,
        higher_is_better: true,
      };
    });

    // Build National Index History
    const national_index_history = Array.from(yearlyValues.entries())
      .sort(([y1], [y2]) => y1 - y2)
      .map(([yr, vals]) => {
        const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
        const score = Math.round(mean * 10) / 10;
        const band =
          score >= 80
            ? 'high'
            : score >= 65
            ? 'moderate_high'
            : score >= 50
            ? 'moderate'
            : score >= 35
            ? 'moderate_low'
            : 'low';
        return {
          period: String(yr),
          year: yr,
          score,
          band,
          population: totalPopulation,
          regions_count: regions.length,
          at_risk_count: atRiskRegions(yr),
          ai_insight_text: `National score computed from ${vals.length} observations in ${yr}.`,
          ai_insight_arabic_text: `المؤشر الوطني محسوب من ${vals.length} ملاحظة لعام ${yr}.`,
        };
      });

    const completenessPct = rows.length > 0 ? Math.round((metrics.length / rows.length) * 1000) / 10 : 0;

    return {
      regions,
      indicators,
      national_index_history,
      regional_metrics: metrics,
      metadata: {
        name: meta.filename.replace(/\.[^/.]+$/, '').toUpperCase(),
        arabic_name: meta.filename.replace(/\.[^/.]+$/, '').toUpperCase(),
        original_source: 'Imported Dataset',
        license: 'Standard Research License',
        geographic_coverage: `${regions.length} regions`,
        time_coverage: national_index_history.length > 0 ? `${national_index_history[0].year}-${national_index_history[national_index_history.length - 1].year}` : '2025',
        update_frequency: 'Annual',
        record_count: metrics.length,
        completeness_pct: completenessPct,
        timeliness_pct: 90.0,
        accuracy_pct: 92.0,
        age_days: 10,
        status: 'synced',
      },
    };
  }

  public static buildCanonicalQualityReport(
    datasetId: string,
    filename: string,
    canonical: any
  ): DataQualityReport {
    const regCount = canonical.regions?.length || 0;
    const indCount = canonical.indicators?.length || 0;
    const metricCount = canonical.regional_metrics?.length || 0;
    const total = regCount + indCount + metricCount;

    return {
      datasetId,
      filename,
      format: 'json',
      totalInputRecords: total,
      processedRecords: total,
      rejectedRecords: 0,
      duplicateRecords: 0,
      rejectedRowDetails: [],
      columnStatistics: {
        regions: { inferredType: 'string', totalValues: regCount, missingCount: 0, missingPct: 0, sampleValues: canonical.regions?.slice(0, 3).map((r: any) => r.id) || [] },
        indicators: { inferredType: 'string', totalValues: indCount, missingCount: 0, missingPct: 0, sampleValues: canonical.indicators?.slice(0, 3).map((i: any) => i.key) || [] },
        metrics: { inferredType: 'number', totalValues: metricCount, missingCount: 0, missingPct: 0, sampleValues: [canonical.regional_metrics?.[0]?.value] },
      },
      detectedColumns: ['regions', 'indicators', 'national_index_history', 'regional_metrics', 'metadata'],
      canonicalMapping: { regions: 'regions', indicators: 'indicators', metrics: 'regional_metrics' },
      appliedTransformations: ['Parsed native Decidix canonical envelope.'],
      validationWarnings: [],
      processingErrors: [],
      status: 'READY',
    };
  }
}
