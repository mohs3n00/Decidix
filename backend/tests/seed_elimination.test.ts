import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { InsightsRepository } from '../src/repositories/insights.repository.js';

describe('Production analytical seed elimination', () => {
  const originalNodeEnv = env.NODE_ENV;

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it.each([
    ['sector', () => InsightsRepository.getSectorData('education')],
    ['historical', () => InsightsRepository.getHistorical('overall', '7Y')],
    ['priority', () => InsightsRepository.getPriorityQueue(5)],
    ['data quality', () => InsightsRepository.getDataQuality()],
    ['comparison', () => InsightsRepository.getComparison('central_capital', 'steppe')],
  ])('does not expose seeded %s data without an approved dataset', async (_name, operation) => {
    env.NODE_ENV = 'production';
    await expect(operation()).rejects.toMatchObject({ code: 'DATASET_NOT_CONNECTED' });
  });

  it('does not expose seeded recommendations without an approved dataset', async () => {
    env.NODE_ENV = 'production';
    const response = await request(createApp()).get('/v1/intelligence/recommendations');
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('DATASET_NOT_CONNECTED');
  });
});
