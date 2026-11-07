import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../src/database/prisma.js';
import { DatasetService } from '../src/services/dataset.service.js';
import { OverviewRepository } from '../src/repositories/overview.repository.js';
import { env } from '../src/config/env.js';

const activeDataset = {
  id: 'dataset-a',
  version: 'dataset-a',
  filename: 'a.json',
  source: 'Approved source A',
  license: 'approved-license',
  coverage: 'approved coverage',
  validationStatus: 'validated',
  isActive: true,
};

describe('Overview dataset-version isolation', () => {
  const originalNodeEnv = env.NODE_ENV;

  beforeEach(() => {
    env.NODE_ENV = 'production';
    vi.spyOn(DatasetService, 'active').mockResolvedValue(activeDataset as never);
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ ok: 1 }] as never);
    // Batch 3 overview KPIs read version-scoped counts and metadata.
    vi.spyOn(prisma.indicator, 'count').mockResolvedValue(18);
    vi.spyOn(prisma.datasetMetadata, 'findFirst').mockResolvedValue({
      completenessPct: 100,
    } as never);
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('scopes national history and regions to the active version', async () => {
    const first = vi.spyOn(prisma.nationalIndexHistory, 'findFirst').mockResolvedValue({
      period: '2025',
      year: 2025,
      score: 70,
      maxScore: 100,
      change: 1,
      comparedWith: 'previous period',
      band: 'moderate',
      regionsCount: 12,
      population: 1000,
      atRiskCount: 3,
      aiInsightText: 'insight',
      aiInsightArabicText: 'رؤية',
    } as never);
    const many = vi
      .spyOn(prisma.nationalIndexHistory, 'findMany')
      .mockResolvedValue([{ year: 2025, score: 70 }] as never);
    const regions = vi.spyOn(prisma.region, 'findMany').mockResolvedValue([]);

    const result = await OverviewRepository.getOverview();

    expect(first).toHaveBeenCalledWith(
      expect.objectContaining({ where: { datasetVersionId: 'dataset-a' } })
    );
    expect(many).toHaveBeenCalledWith(
      expect.objectContaining({ where: { datasetVersionId: 'dataset-a' } })
    );
    expect(regions).toHaveBeenCalledWith(
      expect.objectContaining({ where: { datasetVersionId: 'dataset-a' } })
    );
    expect(result.trend.points).toEqual([{ year: 2025, value: 70 }]);
  });

  it('never backfills an empty verified trend or region list with seed data', async () => {
    vi.spyOn(prisma.nationalIndexHistory, 'findFirst').mockResolvedValue({
      period: '2025',
      year: 2025,
      score: 70,
      maxScore: 100,
      change: 1,
      comparedWith: 'previous period',
      band: 'moderate',
      regionsCount: 12,
      population: 1000,
      atRiskCount: 3,
      aiInsightText: 'insight',
      aiInsightArabicText: 'رؤية',
    } as never);
    vi.spyOn(prisma.nationalIndexHistory, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.region, 'findMany').mockResolvedValue([]);

    const result = await OverviewRepository.getOverview();

    expect(result.trend.points).toEqual([]);
    expect(result.needs_attention).toEqual([]);
    expect(result.provenance.data_classification).toBe('derived_calculation');
    expect(result.provenance.dataset_version).toBe('dataset-a');
  });

  it('fails closed when the active version has no national history', async () => {
    vi.spyOn(prisma.nationalIndexHistory, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.nationalIndexHistory, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.region, 'findMany').mockResolvedValue([]);

    await expect(OverviewRepository.getOverview()).rejects.toMatchObject({
      code: 'DATASET_NOT_CONNECTED',
    });
  });
});
