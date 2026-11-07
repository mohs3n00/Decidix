import { describe, it, expect, vi, afterEach } from 'vitest';

import { prisma } from '../src/database/prisma.js';
import { R2Service, sha256Hex } from '../src/integrations/r2.service.js';
import { DatasetService } from '../src/services/dataset.service.js';
import { normalizeDecidixCsv } from '../src/services/dataset_csv.js';

/**
 * Hermetic tests for the Decidix CSV template normalizer (no database, no R2).
 * The CSV must produce the same canonical envelope a canonical JSON upload
 * produces, because both formats share one validate/ingest/activate pipeline.
 */

type Row = Record<string, string>;

const COLUMNS = [
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
];

const PREAMBLE: Record<string, string | null> = {
  'decidix-csv': 'v1',
  name: 'CSV fixture dataset',
  name_ar: 'مجموعة اختبار CSV',
  source: 'Synthetic CSV fixture (test-only)',
  license: 'test-only',
  geographic_coverage: 'two fixture regions',
  time_coverage: '2024-2025',
  update_frequency: 'never',
  completeness_pct: '100',
  timeliness_pct: '100',
  accuracy_pct: '100',
  age_days: '0',
};

const REGIONS: Record<string, Row> = {
  csv_region_one: {
    region_id: 'csv_region_one',
    region_name: 'Region One',
    region_name_ar: 'منطقة واحدة',
    region_population: '100000',
    region_latitude: '24.7',
    region_longitude: '46.7',
  },
  csv_region_two: {
    region_id: 'csv_region_two',
    region_name: 'Region Two',
    region_name_ar: 'منطقة ثانية',
    region_population: '50000',
    region_latitude: '21.5',
    region_longitude: '39.2',
  },
};

function devRow(regionId: string, year: string, value: string, overrides: Row = {}): Row {
  return {
    ...REGIONS[regionId],
    indicator_key: 'development_index',
    indicator_label: 'Development index',
    indicator_label_ar: 'مؤشر التنمية',
    indicator_domain: 'overall',
    indicator_unit: 'score_100',
    indicator_higher_is_better: 'true',
    year,
    value,
    ...overrides,
  };
}

function litRow(regionId: string, year: string, value: string, overrides: Row = {}): Row {
  return {
    ...REGIONS[regionId],
    indicator_key: 'literacy_rate',
    indicator_label: 'Literacy rate',
    indicator_label_ar: 'معدل الإلمام',
    indicator_domain: 'education',
    indicator_unit: 'percent',
    indicator_higher_is_better: 'true',
    year,
    value,
    ...overrides,
  };
}

const BASE_ROWS: Row[] = [
  devRow('csv_region_one', '2024', '80.0'),
  litRow('csv_region_one', '2024', '95.0'),
  devRow('csv_region_one', '2025', '82.0'),
  litRow('csv_region_one', '2025', '96.0'),
  devRow('csv_region_two', '2024', '70.0'),
  litRow('csv_region_two', '2024', '85.0'),
  devRow('csv_region_two', '2025', '71.0'),
  litRow('csv_region_two', '2025', '86.0'),
];

function buildCsv(options: {
  preamble?: Record<string, string | null>;
  columns?: string[];
  rows?: Row[];
} = {}): string {
  const preamble = { ...PREAMBLE, ...options.preamble };
  const preambleLines = Object.entries(preamble)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `#${key}: ${value}`);
  const columns = options.columns ?? COLUMNS;
  const rows = options.rows ?? BASE_ROWS;
  return [
    preambleLines.join('\n'),
    columns.join(','),
    ...rows.map((row) => columns.map((column) => row[column] ?? '').join(',')),
  ].join('\n');
}

async function csvError(csv: string): Promise<{ code: string; message: string; fields: Record<string, string> }> {
  try {
    normalizeDecidixCsv(csv);
    throw new Error('CSV_UNEXPECTEDLY_ACCEPTED');
  } catch (error) {
    return error as { code: string; message: string; fields: Record<string, string> };
  }
}

function mockVersion(content: Buffer, format: 'csv' | 'json') {
  vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue({
    id: 'v1',
    version: 'v1',
    filename: format === 'csv' ? 'fixture.csv' : 'fixture.json',
    objectKey: `datasets/v1/fixture.${format}`,
    checksumSha256: sha256Hex(content),
    format,
    validationStatus: 'uploaded',
  } as never);
  vi.spyOn(R2Service, 'downloadObject').mockResolvedValue(content);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Decidix CSV template normalization', () => {
  it('normalizes a valid CSV into the canonical envelope', () => {
    const envelope = normalizeDecidixCsv(buildCsv());

    expect(envelope).toHaveLength(1);
    const canonical = envelope[0].canonical as Record<string, any>;

    expect(canonical.metadata).toMatchObject({
      name: 'CSV fixture dataset',
      arabic_name: 'مجموعة اختبار CSV',
      original_source: 'Synthetic CSV fixture (test-only)',
      license: 'test-only',
      geographic_coverage: 'two fixture regions',
      time_coverage: '2024-2025',
      update_frequency: 'never',
      record_count: 8,
      completeness_pct: 100,
      timeliness_pct: 100,
      accuracy_pct: 100,
      age_days: 0,
      status: 'synced',
    });

    expect(canonical.regions).toMatchObject([
      { id: 'csv_region_one', rank: 1, score: 82, change: 2, priority: 'high', population: 100000 },
      { id: 'csv_region_two', rank: 2, score: 71, change: 1, priority: 'medium', population: 50000 },
    ]);
    expect(canonical.indicators).toMatchObject([
      { key: 'development_index', unit: 'score_100', domain: 'overall', higher_is_better: true },
      { key: 'literacy_rate', unit: 'percent', domain: 'education', higher_is_better: true },
    ]);
    expect(canonical.national_index_history).toMatchObject([
      {
        year: 2024,
        score: 75,
        band: 'moderate_high',
        compared_with: 'baseline year',
        regions_count: 2,
        at_risk_count: 1,
        population: 150000,
      },
      { year: 2025, score: 76.5, band: 'moderate_high', compared_with: '2024', change: 1.5, at_risk_count: 1 },
    ]);
    expect(canonical.regional_metrics).toHaveLength(8);
    expect(canonical.regional_metrics[0]).toMatchObject({
      region_id: 'csv_region_one',
      indicator_key: 'development_index',
      year: 2024,
      value: 80,
    });
  });

  it('produces the same canonical data as the equivalent canonical JSON upload', async () => {
    const csv = buildCsv();
    const envelope = normalizeDecidixCsv(csv);
    const csvContent = Buffer.from(csv, 'utf8');
    const jsonContent = Buffer.from(JSON.stringify(envelope), 'utf8');

    const updates: Array<Record<string, unknown>> = [];
    vi.spyOn(prisma.datasetVersion, 'findUnique')
      .mockResolvedValueOnce({
        id: 'v1',
        version: 'v1',
        filename: 'fixture.csv',
        objectKey: 'datasets/v1/fixture.csv',
        checksumSha256: sha256Hex(csvContent),
        format: 'csv',
        validationStatus: 'uploaded',
      } as never)
      .mockResolvedValueOnce({
        id: 'v1',
        version: 'v1',
        filename: 'fixture.json',
        objectKey: 'datasets/v1/fixture.json',
        checksumSha256: sha256Hex(jsonContent),
        format: 'json',
        validationStatus: 'uploaded',
      } as never);
    vi.spyOn(prisma.datasetVersion, 'update').mockImplementation((async (args: { data: Record<string, unknown> }) => {
      updates.push(args.data);
      return args;
    }) as never);
    vi.spyOn(R2Service, 'downloadObject').mockResolvedValueOnce(csvContent).mockResolvedValueOnce(jsonContent);

    await DatasetService.validate('v1');
    await DatasetService.validate('v1');

    expect(updates).toHaveLength(2);
    expect(updates[0]).toMatchObject({ validationStatus: 'validated', recordCount: 8 });
    expect(updates[1]).toMatchObject({ validationStatus: 'validated', recordCount: 8 });
  });

  it('rejects a CSV without the Decidix template metadata block', async () => {
    const preamble: Record<string, string | null> = {};
    for (const key of Object.keys(PREAMBLE)) preamble[key] = null;
    const error = await csvError(buildCsv({ preamble }));
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields.csv).toBe('CSV_TEMPLATE_PREAMBLE_MISSING');
  });

  it('rejects missing required metadata keys', async () => {
    const error = await csvError(buildCsv({ preamble: { license: null } }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_PREAMBLE_MISSING');
    expect(error.message).toContain('license');
  });

  it('rejects missing required columns', async () => {
    const error = await csvError(buildCsv({ columns: COLUMNS.filter((column) => column !== 'region_population') }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_HEADER_MISSING');
    expect(error.message).toContain('region_population');
  });

  it('rejects unknown columns instead of guessing their meaning', async () => {
    const error = await csvError(buildCsv({ columns: [...COLUMNS, 'mystery_metric'] }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_HEADER_UNKNOWN');
    expect(error.message).toContain('mystery_metric');
  });

  it('rejects an unsupported unit', async () => {
    const rows = BASE_ROWS.map((row, index) =>
      index === 1 ? { ...row, indicator_unit: 'furlongs' } : row
    );
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_UNIT_INVALID');
    expect(error.message).toContain('furlongs');
  });

  it('rejects an unsupported domain', async () => {
    const rows = BASE_ROWS.map((row, index) => (index === 1 ? { ...row, indicator_domain: 'astrology' } : row));
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_DOMAIN_INVALID');
  });

  it('rejects an unknown region identifier', async () => {
    const rows = BASE_ROWS.map((row, index) => (index === 0 ? { ...row, region_id: 'Region One X' } : row));
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_UNKNOWN_REGION');
  });

  it('rejects an unknown indicator identifier', async () => {
    const rows = BASE_ROWS.map((row, index) => (index === 1 ? { ...row, indicator_key: 'Literacy Rate' } : row));
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_UNKNOWN_INDICATOR');
  });

  it('rejects duplicate observations', async () => {
    const error = await csvError(buildCsv({ rows: [...BASE_ROWS, devRow('csv_region_one', '2025', '82.0')] }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_DUPLICATE_OBSERVATION');
    expect(error.message).toContain('csv_region_one');
  });

  it('rejects a region described inconsistently across rows', async () => {
    const rows = BASE_ROWS.map((row, index) =>
      index === 2 ? { ...row, region_population: '999999' } : row
    );
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_CONFLICTING_REGION');
  });

  it('rejects a value outside the range of its declared unit', async () => {
    const rows = BASE_ROWS.map((row, index) => (index === 1 ? { ...row, value: '120.0' } : row));
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_VALUE_INVALID');
    expect(error.message).toContain('percent');
  });

  it('rejects a non-numeric observation value', async () => {
    const rows = BASE_ROWS.map((row, index) => (index === 0 ? { ...row, value: 'not-a-number' } : row));
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_VALUE_INVALID');
  });

  it('rejects an empty required cell', async () => {
    const rows = BASE_ROWS.map((row, index) => (index === 0 ? { ...row, region_population: '' } : row));
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_ROW_INCOMPLETE');
  });

  it('rejects an inconsistent indicator definition for the same key', async () => {
    const rows = BASE_ROWS.map((row, index) =>
      index === 3 ? { ...row, indicator_unit: 'score_100' } : row
    );
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_TEMPLATE_CONFLICTING_INDICATOR');
  });

  it('requires the development_index indicator used for scores and history', async () => {
    const rows = BASE_ROWS.filter((row) => row.indicator_key === 'literacy_rate');
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_DEVELOPMENT_INDEX_REQUIRED');
  });

  it('rejects an incomplete development_index matrix', async () => {
    const rows = BASE_ROWS.filter(
      (row) => !(row.region_id === 'csv_region_two' && row.indicator_key === 'development_index' && row.year === '2025')
    );
    const error = await csvError(buildCsv({ rows }));
    expect(error.fields.csv).toBe('CSV_DEVELOPMENT_INDEX_INCOMPLETE');
    expect(error.message).toContain('csv_region_two');
  });

  it('keeps canonical JSON uploads working unchanged', async () => {
    const jsonContent = Buffer.from(JSON.stringify(normalizeDecidixCsv(buildCsv())), 'utf8');
    mockVersion(jsonContent, 'json');
    const update = vi.spyOn(prisma.datasetVersion, 'update').mockResolvedValue({} as never);

    await DatasetService.validate('v1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ validationStatus: 'validated' }),
      })
    );
  });

  it('still rejects a non-canonical JSON payload', async () => {
    const content = Buffer.from(JSON.stringify([{ rows: [1, 2, 3] }]), 'utf8');
    mockVersion(content, 'json');
    vi.spyOn(prisma.datasetVersion, 'update').mockResolvedValue({} as never);

    await expect(DatasetService.validate('v1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: { schema: 'CANONICAL_DATASET_REQUIRED' },
    });
  });

  it('marks a rejected CSV version invalid without touching the active dataset', async () => {
    const csv = buildCsv({ rows: [...BASE_ROWS, devRow('csv_region_one', '2025', '82.0')] });
    const content = Buffer.from(csv, 'utf8');
    mockVersion(content, 'csv');
    const update = vi.spyOn(prisma.datasetVersion, 'update').mockResolvedValue({} as never);
    const ingest = vi.spyOn(DatasetService, 'ingest');
    const activate = vi.spyOn(DatasetService, 'activate');

    await expect(DatasetService.validate('v1')).rejects.toMatchObject({
      fields: { csv: 'CSV_TEMPLATE_DUPLICATE_OBSERVATION' },
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ validationStatus: 'invalid' }),
      })
    );
    expect(ingest).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });
});
