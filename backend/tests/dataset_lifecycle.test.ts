import { describe, it, expect, vi, afterEach } from 'vitest';

import { prisma } from '../src/database/prisma.js';
import { DatasetService } from '../src/services/dataset.service.js';
import { R2Service, sha256Hex } from '../src/integrations/r2.service.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function canonicalPayload(overrides: Record<string, unknown> = {}) {
  return [
    {
      canonical: {
        regions: [
          {
            id: 'central_capital',
            name: 'Central Capital',
            arabic_name: 'العاصمة',
            rank: 1,
            score: 82.5,
            priority: 'high',
            population: 1000,
            latitude: 24.7,
            longitude: 46.7,
          },
        ],
        indicators: [
          {
            key: 'clinic_density',
            label: 'Clinic density',
            arabic_label: 'كثافة العيادات',
            domain: 'healthcare',
            unit: 'per_100k',
          },
        ],
        national_index_history: [
          {
            period: '2025',
            year: 2025,
            score: 82.5,
            band: 'high',
            population: 1000,
            regions_count: 1,
            ai_insight_text: 'text',
            ai_insight_arabic_text: 'نص',
          },
        ],
        regional_metrics: [
          {
            region_id: 'central_capital',
            indicator_key: 'clinic_density',
            year: 2025,
            value: 12.4,
          },
        ],
        metadata: {
          name: 'Fixture dataset',
          arabic_name: 'مجموعة اختبار',
          original_source: 'Synthetic test fixture',
          license: 'test-only',
          geographic_coverage: 'one region',
          time_coverage: '2025',
          update_frequency: 'never',
          completeness_pct: 100,
          timeliness_pct: 100,
          accuracy_pct: 100,
          age_days: 0,
          status: 'validated',
        },
        ...overrides,
      },
    },
  ];
}

function versionRow(content: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    version: 'v1',
    filename: 'fixture.json',
    objectKey: 'datasets/v1/fixture.json',
    checksumSha256: sha256Hex(Buffer.from(content, 'utf8')),
    format: 'json',
    source: 'Synthetic test fixture',
    license: 'test-only',
    coverage: 'one region',
    validationStatus: 'uploaded',
    isActive: false,
    ...overrides,
  };
}

describe('Dataset lifecycle guards', () => {
  it('refuses to mark a non-canonical dataset validated', async () => {
    const content = JSON.stringify([{ rows: [1, 2, 3] }]);
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(versionRow(content) as never);
    vi.spyOn(R2Service, 'downloadObject').mockResolvedValue(Buffer.from(content, 'utf8'));
    const update = vi.spyOn(prisma.datasetVersion, 'update').mockResolvedValue({} as never);

    await expect(DatasetService.validate('v1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: { schema: 'CANONICAL_DATASET_REQUIRED' },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ validationStatus: 'invalid' }),
      })
    );
  });

  it('rejects canonical metadata that omits required provenance', async () => {
    const payload = canonicalPayload();
    const metadata = (payload[0].canonical as Record<string, any>).metadata;
    delete metadata.timeliness_pct;
    const content = JSON.stringify(payload);
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(versionRow(content) as never);
    vi.spyOn(R2Service, 'downloadObject').mockResolvedValue(Buffer.from(content, 'utf8'));
    vi.spyOn(prisma.datasetVersion, 'update').mockResolvedValue({} as never);

    await expect(DatasetService.validate('v1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('accepts a complete canonical dataset', async () => {
    const content = JSON.stringify(canonicalPayload());
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(versionRow(content) as never);
    vi.spyOn(R2Service, 'downloadObject').mockResolvedValue(Buffer.from(content, 'utf8'));
    const update = vi
      .spyOn(prisma.datasetVersion, 'update')
      .mockResolvedValue({ validationStatus: 'validated' } as never);

    await DatasetService.validate('v1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ validationStatus: 'validated' }),
      })
    );
  });

  it('refuses to activate a validated but never-ingested version', async () => {
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(
      versionRow('{}', { validationStatus: 'validated' }) as never
    );
    vi.spyOn(prisma.datasetMetadata, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.region, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.regionalMetric, 'count').mockResolvedValue(0);
    const transaction = vi.spyOn(prisma, '$transaction');

    await expect(DatasetService.activate('v1')).rejects.toMatchObject({
      code: 'DATASET_NOT_INGESTED',
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('activates a validated, ingested version in one transaction', async () => {
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(
      versionRow('{}', { validationStatus: 'validated' }) as never
    );
    vi.spyOn(prisma.datasetMetadata, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.region, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.regionalMetric, 'count').mockResolvedValue(1);
    const transaction = vi
      .spyOn(prisma, '$transaction')
      .mockResolvedValue({ id: 'v1', isActive: true } as never);

    await DatasetService.activate('v1');

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('reports cross-version observation conflicts before writing', async () => {
    const content = JSON.stringify(canonicalPayload());
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(
      versionRow(content, { validationStatus: 'validated' }) as never
    );
    vi.spyOn(R2Service, 'downloadObject').mockResolvedValue(Buffer.from(content, 'utf8'));
    const query = vi.spyOn(prisma, '$queryRaw');
    query.mockResolvedValueOnce([] as never); // no region/indicator key conflict
    query.mockResolvedValueOnce([{ count: BigInt(1) }] as never); // observation conflict
    const transaction = vi.spyOn(prisma, '$transaction');

    await expect(DatasetService.ingest('v1')).rejects.toMatchObject({
      code: 'CANONICAL_OBSERVATION_VERSION_CONFLICT',
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});
