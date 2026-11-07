import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/database/prisma.js';
import { DatasetService } from '../src/services/dataset.service.js';
import { InsightsRepository } from '../src/repositories/insights.repository.js';
import { env } from '../src/config/env.js';

const dataset = (id: string, validationStatus = 'validated', isActive = true) => ({
  id,
  version: id,
  filename: `${id}.csv`,
  source: `Source ${id}`,
  license: 'approved-license',
  coverage: 'approved coverage',
  validationStatus,
  isActive,
});

describe('Analytical DatasetVersion row isolation', () => {
  const originalNodeEnv = env.NODE_ENV;

  beforeEach(() => {
    env.NODE_ENV = 'production';
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('queries historical rows using the exact active version and never returns another version', async () => {
    const active = dataset('dataset-a');
    vi.spyOn(DatasetService, 'active').mockResolvedValue(active as never);
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ ok: 1 }] as never);
    const query = vi.spyOn(prisma.nationalIndexHistory, 'findMany').mockResolvedValue([
      { year: 2025, score: 81, id: 1 },
    ] as never);

    const result = await InsightsRepository.getHistorical();

    expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: { datasetVersionId: 'dataset-a' } }));
    expect(result.dataset_version).toBe('dataset-a');
    expect(result.points).toEqual([{ year: 2025, value: 81 }]);
  });

  it('switching active versions changes the row predicate and provenance', async () => {
    const active = vi.spyOn(DatasetService, 'active');
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ ok: 1 }] as never);
    const query = vi.spyOn(prisma.nationalIndexHistory, 'findMany').mockResolvedValue([
      { year: 2025, score: 81, id: 1 },
    ] as never);

    active.mockResolvedValue(dataset('dataset-a') as never);
    await InsightsRepository.getHistorical();
    active.mockResolvedValue(dataset('dataset-b') as never);
    await InsightsRepository.getHistorical();

    expect(query.mock.calls[0][0]).toEqual(expect.objectContaining({ where: { datasetVersionId: 'dataset-a' } }));
    expect(query.mock.calls[1][0]).toEqual(expect.objectContaining({ where: { datasetVersionId: 'dataset-b' } }));
  });

  it('rejects inactive or rejected datasets before querying analytical rows', async () => {
    vi.spyOn(DatasetService, 'active').mockResolvedValue(null);
    const query = vi.spyOn(prisma.nationalIndexHistory, 'findMany');

    await expect(InsightsRepository.getHistorical()).rejects.toMatchObject({
      code: 'DATASET_NOT_CONNECTED',
    });
    expect(query).not.toHaveBeenCalled();

    vi.spyOn(DatasetService, 'active').mockResolvedValue(null);
    await expect(InsightsRepository.getHistorical()).rejects.toMatchObject({
      code: 'DATASET_NOT_CONNECTED',
    });
  });

  it('treats missing row mappings as unavailable instead of falling back to fixtures', async () => {
    vi.spyOn(DatasetService, 'active').mockResolvedValue(dataset('dataset-a') as never);
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ ok: 1 }] as never);
    vi.spyOn(prisma.nationalIndexHistory, 'findMany').mockResolvedValue([]);

    await expect(InsightsRepository.getHistorical()).rejects.toMatchObject({
      code: 'DATASET_NOT_CONNECTED',
    });
  });
});
