import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/database/prisma.js';
import { DatasetService } from '../../src/services/dataset.service.js';

/**
 * Real PostgreSQL integration test (Batch 2).
 *
 * It uses the actual DatasetService pipeline against the local database:
 * register -> validate -> ingest -> activate, then proves version ownership
 * and idempotency. Only rows created by this test are removed afterwards, and
 * the previously active dataset version is restored.
 *
 * This is NOT a mocked-Prisma test. It requires `decidix_dev` (see .env) and is
 * run with `npm run test:integration`.
 */
const suffix = `${Date.now()}`;
const VERSION_ID = `it_bootstrap_${suffix}`;
const REGION_ID = `it_region_${suffix}`;
const INDICATOR_KEY = `it_indicator_${suffix}`;

function canonical() {
  return {
    regions: [
      {
        id: REGION_ID,
        name: 'Integration Region',
        arabic_name: 'منطقة اختبار',
        rank: 1,
        score: 88.5,
        change: 0.5,
        priority: 'high',
        population: 100000,
        latitude: 24.7,
        longitude: 46.7,
      },
    ],
    indicators: [
      {
        key: INDICATOR_KEY,
        label: 'Integration indicator',
        arabic_label: 'مؤشر اختبار',
        domain: 'education',
        unit: 'percent',
        higher_is_better: true,
      },
    ],
    national_index_history: [2024, 2025].map((year) => ({
      period: String(year),
      year,
      score: year === 2025 ? 88.5 : 88.0,
      max_score: 100,
      change: year === 2025 ? 0.5 : 0,
      compared_with: year === 2025 ? '2024' : 'baseline year',
      band: 'high',
      population: 100000,
      regions_count: 1,
      at_risk_count: 0,
      ai_insight_text: 'Synthetic integration fixture; not official data.',
      ai_insight_arabic_text: 'بيانات اختبار اصطناعية؛ ليست بيانات رسمية.',
    })),
    regional_metrics: [2024, 2025].map((year) => ({
      region_id: REGION_ID,
      indicator_key: INDICATOR_KEY,
      year,
      value: year === 2025 ? 88.5 : 88.0,
      change: year === 2025 ? 0.5 : 0,
    })),
    metadata: {
      name: 'Integration fixture dataset',
      arabic_name: 'مجموعة اختبار',
      original_source: 'Synthetic integration fixture (test-only).',
      license: 'test-only',
      geographic_coverage: 'single fixture region',
      time_coverage: '2024-2025',
      update_frequency: 'never',
      record_count: 1,
      completeness_pct: 100,
      timeliness_pct: 100,
      accuracy_pct: 100,
      age_days: 0,
      status: 'synced',
    },
  };
}

const content = Buffer.from(JSON.stringify([{ canonical: canonical() }]), 'utf8');
let previousActiveId: string | null = null;

async function cleanup(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.regionalMetric.deleteMany({ where: { datasetVersionId: VERSION_ID } });
    await tx.nationalIndexHistory.deleteMany({ where: { datasetVersionId: VERSION_ID } });
    await tx.sectorBreakdown.deleteMany({ where: { datasetVersionId: VERSION_ID } });
    await tx.aiRecommendation.deleteMany({ where: { datasetVersionId: VERSION_ID } });
    await tx.ragDocument.deleteMany({ where: { datasetVersionId: VERSION_ID } });
    await tx.datasetMetadata.deleteMany({ where: { datasetVersionId: VERSION_ID } });
    await tx.datasetRecord.deleteMany({ where: { datasetVersionId: VERSION_ID } });
    await tx.region.deleteMany({ where: { id: REGION_ID } });
    await tx.indicator.deleteMany({ where: { key: INDICATOR_KEY } });
    await tx.datasetVersion.deleteMany({ where: { id: VERSION_ID } });
  });
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
    } else {
      await prisma.datasetVersion.updateMany({ data: { isActive: false }, where: { isActive: true } });
    }
    await prisma.$disconnect();
  }
});

describe('DatasetService ingestion against real PostgreSQL', () => {
  it('validates, ingests and activates a canonical version with version-owned rows', async () => {
    await cleanup();

    await DatasetService.registerLocalVersion({
      id: VERSION_ID,
      version: `it-${suffix}`,
      filename: 'integration.json',
      objectKey: `local://integration/${suffix}.json`,
      content,
      format: 'json',
      source: 'Synthetic integration fixture (test-only)',
      license: 'test-only',
      coverage: 'single fixture region',
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
    expect(counts).toEqual({ records: 1, metadata: 1, regions: 1, indicators: 1, history: 2, metrics: 2 });

    const activated = await DatasetService.activate(VERSION_ID);
    expect(activated.isActive).toBe(true);
    const activeRows = await prisma.datasetVersion.count({ where: { isActive: true } });
    expect(activeRows).toBe(1);
    expect((await DatasetService.active())?.id).toBe(VERSION_ID);
  });

  it('re-ingesting the same version is idempotent (no duplicate observations)', async () => {
    const before = await prisma.regionalMetric.count({ where: { datasetVersionId: VERSION_ID } });
    await DatasetService.ingest(VERSION_ID, content);
    await DatasetService.ingest(VERSION_ID, content);
    const after = await prisma.regionalMetric.count({ where: { datasetVersionId: VERSION_ID } });
    expect(after).toBe(before);
  });

  it('refuses to activate a validated version that was never ingested', async () => {
    const emptyId = `it_empty_${suffix}`;
    await prisma.datasetVersion.create({
      data: {
        id: emptyId,
        version: `it-empty-${suffix}`,
        filename: 'empty.json',
        objectKey: 'local://integration/empty.json',
        checksumSha256: 'a'.repeat(64),
        format: 'json',
        source: 'Synthetic integration fixture (test-only)',
        license: 'test-only',
        coverage: 'none',
        createdBy: 'vitest-integration',
        validationStatus: 'validated',
        validatedAt: new Date(),
      },
    });
    try {
      await expect(DatasetService.activate(emptyId)).rejects.toMatchObject({
        code: 'DATASET_NOT_INGESTED',
      });
    } finally {
      await prisma.datasetVersion.deleteMany({ where: { id: emptyId } });
    }
  });
});
