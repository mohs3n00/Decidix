import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/database/prisma.js';
import { DatasetService } from '../../src/services/dataset.service.js';

/**
 * Real PostgreSQL integration test for the CSV upload format.
 *
 * It runs the documented Decidix CSV template through the REAL pipeline
 * (`registerLocalVersion` -> `validate` -> `ingest` -> `activate`), proving the
 * normalized payload reaches the same tables as a canonical JSON upload. A
 * second case proves a rejected CSV leaves the active dataset untouched.
 *
 * Only rows created here are removed, and the previously active version is
 * restored. Requires `decidix_dev`; run with `npm run test:integration`.
 */
const suffix = `${Date.now()}`;
const VERSION_ID = `it_csv_${suffix}`;
const BAD_VERSION_ID = `it_csv_bad_${suffix}`;
const REGION_A = `it_csv_a_${suffix}`;
const REGION_B = `it_csv_b_${suffix}`;
const DEV_KEY = `it_csv_dev_${suffix}`;
const LIT_KEY = `it_csv_lit_${suffix}`;

const HEADER =
  'region_id,region_name,region_name_ar,region_population,region_latitude,region_longitude,indicator_key,indicator_label,indicator_label_ar,indicator_domain,indicator_unit,indicator_higher_is_better,year,value';

function row(
  regionId: string,
  name: string,
  nameAr: string,
  population: string,
  latitude: string,
  longitude: string,
  indicatorKey: string,
  label: string,
  labelAr: string,
  domain: string,
  unit: string,
  year: string,
  value: string
): string {
  return [regionId, name, nameAr, population, latitude, longitude, indicatorKey, label, labelAr, domain, unit, 'true', year, value].join(',');
}

function csvDocument(options: { duplicate?: boolean } = {}): string {
  const preamble = [
    '#decidix-csv: v1',
    '#name: Integration CSV fixture',
    '#name_ar: مجموعة اختبار CSV',
    '#source: Synthetic integration fixture (test-only)',
    '#license: test-only',
    '#geographic_coverage: two fixture regions',
    '#time_coverage: 2024-2025',
    '#update_frequency: never',
    '#completeness_pct: 100',
    '#timeliness_pct: 100',
    '#accuracy_pct: 100',
    '#age_days: 0',
    `#development_indicator: ${DEV_KEY}`,
  ].join('\n');

  const rows = [
    row(REGION_A, 'Fixture Region A', 'منطقة أ', '100000', '24.7', '46.7', DEV_KEY, 'Development index', 'مؤشر التنمية', 'overall', 'score_100', '2024', '80.0'),
    row(REGION_A, 'Fixture Region A', 'منطقة أ', '100000', '24.7', '46.7', DEV_KEY, 'Development index', 'مؤشر التنمية', 'overall', 'score_100', '2025', '82.0'),
    row(REGION_A, 'Fixture Region A', 'منطقة أ', '100000', '24.7', '46.7', LIT_KEY, 'Literacy rate', 'معدل الإلمام', 'education', 'percent', '2024', '95.0'),
    row(REGION_A, 'Fixture Region A', 'منطقة أ', '100000', '24.7', '46.7', LIT_KEY, 'Literacy rate', 'معدل الإلمام', 'education', 'percent', '2025', '96.0'),
    row(REGION_B, 'Fixture Region B', 'منطقة ب', '50000', '21.5', '39.2', DEV_KEY, 'Development index', 'مؤشر التنمية', 'overall', 'score_100', '2024', '70.0'),
    row(REGION_B, 'Fixture Region B', 'منطقة ب', '50000', '21.5', '39.2', LIT_KEY, 'Literacy rate', 'معدل الإلمام', 'education', 'percent', '2024', '85.0'),
    row(REGION_B, 'Fixture Region B', 'منطقة ب', '50000', '21.5', '39.2', DEV_KEY, 'Development index', 'مؤشر التنمية', 'overall', 'score_100', '2025', '71.0'),
    row(REGION_B, 'Fixture Region B', 'منطقة ب', '50000', '21.5', '39.2', LIT_KEY, 'Literacy rate', 'معدل الإلمام', 'education', 'percent', '2025', '86.0'),
  ];
  if (options.duplicate) {
    rows.push(
      row(REGION_A, 'Fixture Region A', 'منطقة أ', '100000', '24.7', '46.7', DEV_KEY, 'Development index', 'مؤشر التنمية', 'overall', 'score_100', '2025', '82.0')
    );
  }
  return [preamble, HEADER, ...rows].join('\n');
}

let previousActiveId: string | null = null;

async function cleanup(): Promise<void> {
  for (const versionId of [VERSION_ID, BAD_VERSION_ID]) {
    await prisma.$transaction(async (tx) => {
      await tx.regionalMetric.deleteMany({ where: { datasetVersionId: versionId } });
      await tx.nationalIndexHistory.deleteMany({ where: { datasetVersionId: versionId } });
      await tx.sectorBreakdown.deleteMany({ where: { datasetVersionId: versionId } });
      await tx.aiRecommendation.deleteMany({ where: { datasetVersionId: versionId } });
      await tx.ragDocument.deleteMany({ where: { datasetVersionId: versionId } });
      await tx.datasetMetadata.deleteMany({ where: { datasetVersionId: versionId } });
      await tx.datasetRecord.deleteMany({ where: { datasetVersionId: versionId } });
      await tx.datasetVersion.deleteMany({ where: { id: versionId } });
    });
  }
  await prisma.regionalMetric.deleteMany({ where: { regionId: { in: [REGION_A, REGION_B] } } });
  await prisma.region.deleteMany({ where: { id: { in: [REGION_A, REGION_B] } } });
  await prisma.indicator.deleteMany({ where: { key: { in: [DEV_KEY, LIT_KEY] } } });
}

beforeAll(async () => {
  const active = await prisma.datasetVersion.findFirst({ where: { isActive: true } });
  previousActiveId = active?.id ?? null;
});

afterAll(async () => {
  try {
    await cleanup();
  } finally {
    if (previousActiveId) {
      await DatasetService.activate(previousActiveId).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
});

describe('CSV upload through the real PostgreSQL pipeline', () => {
  it('normalizes, validates, ingests and activates a Decidix CSV', async () => {
    await cleanup();
    const content = Buffer.from(csvDocument(), 'utf8');

    await DatasetService.registerLocalVersion({
      id: VERSION_ID,
      version: `it-csv-${suffix}`,
      filename: 'integration.csv',
      objectKey: `local://integration/${suffix}.csv`,
      content,
      format: 'csv',
      source: 'Synthetic integration fixture (test-only)',
      license: 'test-only',
      coverage: 'two fixture regions',
      createdBy: 'vitest-integration',
    });

    const validated = await DatasetService.validate(VERSION_ID, content);
    expect(validated.validationStatus).toBe('validated');

    const ingested = await DatasetService.ingest(VERSION_ID, content);
    expect(ingested.status).toBe('ingested');

    const counts = {
      records: await prisma.datasetRecord.count({ where: { datasetVersionId: VERSION_ID } }),
      metadata: await prisma.datasetMetadata.count({ where: { datasetVersionId: VERSION_ID } }),
      regions: await prisma.region.count({ where: { datasetVersionId: VERSION_ID } }),
      indicators: await prisma.indicator.count({ where: { datasetVersionId: VERSION_ID } }),
      history: await prisma.nationalIndexHistory.count({ where: { datasetVersionId: VERSION_ID } }),
      metrics: await prisma.regionalMetric.count({ where: { datasetVersionId: VERSION_ID } }),
    };
    expect(counts).toEqual({ records: 1, metadata: 1, regions: 2, indicators: 2, history: 2, metrics: 8 });

    const metadata = await prisma.datasetMetadata.findFirst({ where: { datasetVersionId: VERSION_ID } });
    expect(metadata?.recordCount).toBe(8);
    expect(metadata?.name).toBe('Integration CSV fixture');

    const activated = await DatasetService.activate(VERSION_ID);
    expect(activated.isActive).toBe(true);
    expect((await DatasetService.active())?.id).toBe(VERSION_ID);
  });

  it('rejects an invalid CSV and preserves the active dataset', async () => {
    const activeBefore = (await DatasetService.active())?.id ?? null;
    const content = Buffer.from(csvDocument({ duplicate: true }), 'utf8');

    await DatasetService.registerLocalVersion({
      id: BAD_VERSION_ID,
      version: `it-csv-bad-${suffix}`,
      filename: 'integration-invalid.csv',
      objectKey: `local://integration/${suffix}-invalid.csv`,
      content,
      format: 'csv',
      source: 'Synthetic integration fixture (test-only)',
      license: 'test-only',
      coverage: 'two fixture regions',
      createdBy: 'vitest-integration',
    });

    await expect(DatasetService.validate(BAD_VERSION_ID, content)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: { csv: 'CSV_TEMPLATE_DUPLICATE_OBSERVATION' },
    });

    const rejected = await prisma.datasetVersion.findUnique({ where: { id: BAD_VERSION_ID } });
    expect(rejected?.validationStatus).toBe('invalid');

    // Nothing was ingested or activated for the rejected version.
    expect(await prisma.region.count({ where: { datasetVersionId: BAD_VERSION_ID } })).toBe(0);
    expect(await prisma.regionalMetric.count({ where: { datasetVersionId: BAD_VERSION_ID } })).toBe(0);

    const activeAfter = (await DatasetService.active())?.id ?? null;
    expect(activeAfter).toBe(activeBefore);
  });
});
