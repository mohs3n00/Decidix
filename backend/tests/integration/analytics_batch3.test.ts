import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/database/prisma.js';
import { DatasetService } from '../../src/services/dataset.service.js';
import { OverviewRepository } from '../../src/repositories/overview.repository.js';
import { InsightsRepository } from '../../src/repositories/insights.repository.js';
import { ForecastRepository } from '../../src/repositories/forecast.repository.js';
import { compositeScore, finiteMean, normalizeToScore } from '../../src/utils/analytics.js';

/**
 * Batch 3 real-PostgreSQL integration tests.
 *
 * They read the ACTIVE dataset in `decidix_dev` and assert the analytical
 * calculations against the same rows in PostgreSQL. A decoy unversioned row and
 * a decoy row belonging to another version are inserted and must not change any
 * verified output; only those decoys are removed afterwards.
 */
const suffix = `${Date.now()}`;
const DECOY_VERSION = `it_decoy_${suffix}`;
const DECOY_PERIOD = `1999-${suffix}`;
const UNVERSIONED_PERIOD = `1998-${suffix}`;

let activeId = '';

async function cleanupDecoys(): Promise<void> {
  await prisma.nationalIndexHistory.deleteMany({
    where: { period: { in: [DECOY_PERIOD, UNVERSIONED_PERIOD] } },
  });
  await prisma.datasetVersion.deleteMany({ where: { id: DECOY_VERSION } });
}

beforeAll(async () => {
  const active = await DatasetService.active();
  if (!active) throw new Error('Batch 3 integration tests require an active dataset (run dataset:bootstrap).');
  activeId = active.id;
  await cleanupDecoys();
});

afterAll(async () => {
  await cleanupDecoys();
  await prisma.$disconnect();
});

describe('Batch 3 analytics against real PostgreSQL', () => {
  it('derives overview KPIs from active-version observations', async () => {
    const overview = await OverviewRepository.getOverview('7Y');
    const [history, regions, indicators, metadata] = await Promise.all([
      prisma.nationalIndexHistory.findFirst({
        where: { datasetVersionId: activeId },
        orderBy: { year: 'desc' },
      }),
      prisma.region.findMany({ where: { datasetVersionId: activeId }, select: { score: true } }),
      prisma.indicator.count({ where: { datasetVersionId: activeId } }),
      prisma.datasetMetadata.findFirst({ where: { datasetVersionId: activeId } }),
    ]);

    const byKey = new Map(overview.kpis.map((kpi) => [kpi.key, kpi]));
    const expectedAvg = regions.reduce((sum, region) => sum + Number(region.score), 0) / regions.length;

    expect(byKey.get('national_index')?.value).toBe(Number(history!.score));
    expect(byKey.get('average_region_score')?.value).toBe(Number(expectedAvg.toFixed(1)));
    expect(byKey.get('tracked_indicators')?.value).toBe(indicators);
    expect(byKey.get('data_completeness')?.value).toBe(Number(metadata!.completenessPct));
    expect(overview.kpis.length).toBeGreaterThanOrEqual(5);
    expect((overview.provenance as { source_classification?: string }).source_classification).toBe('synthetic_demo');
  });

  it('normalises mixed units before computing the sector score', async () => {
    const sector = await InsightsRepository.getSectorData('education');
    expect(sector.normalization.method).toBe('min_max_across_regions_per_indicator');
    expect(sector.normalization.direction_adjusted).toBe(true);
    expect(sector.is_official).toBe(false);
    expect((sector as { source_classification?: string }).source_classification).toBe('synthetic_demo');

    // Recompute the composite from the same DB rows with the shared helper.
    const indicators = await prisma.indicator.findMany({
      where: { domain: 'education', datasetVersionId: activeId },
      select: { key: true, higherIsBetter: true, unit: true },
    });
    const metrics = await prisma.regionalMetric.findMany({
      where: {
        datasetVersionId: activeId,
        indicatorKey: { in: indicators.map((indicator) => indicator.key) },
        region: { datasetVersionId: activeId },
      },
    });
    const latestYear = Math.max(...metrics.map((metric) => metric.year));
    const components = indicators.map((indicator) => {
      const rows = metrics.filter(
        (metric) => metric.indicatorKey === indicator.key && metric.year === latestYear
      );
      const values = rows.map((row) => Number(row.value));
      const min = Math.min(...values);
      const max = Math.max(...values);
      return normalizeToScore({
        value: finiteMean(values)!,
        min,
        max,
        higherIsBetter: indicator.higherIsBetter,
      });
    });
    const expected = compositeScore(components.map((normalized) => ({ normalized }))).score;
    expect(sector.index.score).toBe(expected);

    // Raw national means are on incompatible scales; the composite must differ.
    const rawMeans = indicators.map((indicator) => {
      const rows = metrics.filter(
        (metric) => metric.indicatorKey === indicator.key && metric.year === latestYear
      );
      return finiteMean(rows.map((row) => Number(row.value)))!;
    });
    const rawAverage = rawMeans.reduce((sum, value) => sum + value, 0) / rawMeans.length;
    expect(Math.abs(sector.index.score - rawAverage)).toBeGreaterThan(5);
    expect(new Set(indicators.map((indicator) => indicator.unit)).size).toBeGreaterThan(1);
  });

  it('does not let unversioned or foreign-version rows contaminate verified analytics', async () => {
    const baseline = await OverviewRepository.getOverview('7Y');

    await prisma.nationalIndexHistory.create({
      data: {
        period: UNVERSIONED_PERIOD,
        year: 1998,
        score: 1,
        maxScore: 100,
        change: 0,
        comparedWith: 'none',
        band: 'low',
        population: 1,
        regionsCount: 1,
        atRiskCount: 1,
        aiInsightText: 'unversioned decoy',
        aiInsightArabicText: 'decoy',
      },
    });
    await prisma.datasetVersion.create({
      data: {
        id: DECOY_VERSION,
        version: `decoy-${suffix}`,
        filename: 'decoy.json',
        objectKey: 'local://decoy',
        checksumSha256: 'b'.repeat(64),
        format: 'json',
        source: 'Synthetic integration fixture (test-only)',
        license: 'test-only',
        coverage: 'decoy',
        createdBy: 'vitest-integration',
        validationStatus: 'validated',
        validatedAt: new Date(),
      },
    });
    await prisma.nationalIndexHistory.create({
      data: {
        period: DECOY_PERIOD,
        year: 1999,
        score: 2,
        maxScore: 100,
        change: 0,
        comparedWith: 'none',
        band: 'low',
        population: 1,
        regionsCount: 1,
        atRiskCount: 1,
        aiInsightText: 'foreign version decoy',
        aiInsightArabicText: 'decoy',
        datasetVersionId: DECOY_VERSION,
      },
    });

    const after = await OverviewRepository.getOverview('7Y');
    expect(after.as_of).toBe(baseline.as_of);
    expect(after.index.score).toBe(baseline.index.score);
    expect(after.trend.points).toEqual(baseline.trend.points);
    expect(after.needs_attention).toEqual(baseline.needs_attention);

    await cleanupDecoys();
  });

  it('returns historical trends from the active version only', async () => {
    const history = await prisma.nationalIndexHistory.findMany({
      where: { datasetVersionId: activeId },
      orderBy: { year: 'asc' },
    });
    const historical = await InsightsRepository.getHistorical('overall', '7Y');
    expect(historical.points.map((point) => point.year)).toEqual(history.map((row) => row.year));
    expect(historical.points.map((point) => point.value)).toEqual(
      history.map((row) => Number(row.score))
    );
  });

  it('serves forecast actuals from PostgreSQL and version-scoped forecasts', async () => {
    const history = await prisma.nationalIndexHistory.findMany({
      where: { datasetVersionId: activeId },
      orderBy: { year: 'asc' },
    });
    const storedForecast = await prisma.mlForecast.findFirst({
      where: { datasetVersionId: activeId, forecastYear: 2028, modelName: 'linear_trend_baseline' },
    });
    expect(storedForecast).not.toBeNull();

    const predictions = await ForecastRepository.getPredictions(2028);
    const actuals = predictions.series.filter((point) => point.kind === 'actual');
    expect(actuals.map((point) => point.year)).toEqual(history.map((row) => row.year));
    expect(actuals.map((point) => point.value)).toEqual(history.map((row) => Number(row.score)));

    expect(predictions.projected_index).toBe(Number(storedForecast!.predictedValue));
    expect(predictions.models.every((model) => model.r2 === null)).toBe(true);
    expect(predictions.evaluation?.status).toBe('unavailable');
    expect(predictions.provenance.dataset_version).toBe(activeId);
    expect(predictions.provenance.data_classification).toBe('experimental_ml');
    expect(predictions.provenance.source_classification).toBe('synthetic_demo');
    expect(predictions.forecast_classification.is_official).toBe(false);
  });
});
