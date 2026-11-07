import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Express } from 'express';
import { ForecastRepository } from '../src/repositories/forecast.repository.js';
import { DatasetService } from '../src/services/dataset.service.js';
import { prisma } from '../src/database/prisma.js';

// Batch 3: actuals come from the active version's persisted observations and
// forecasts are version-scoped. The hermetic suite mocks those two reads.
const HISTORY = [
  { year: 2019, score: 93.3 },
  { year: 2020, score: 93.7 },
  { year: 2021, score: 94.0 },
  { year: 2022, score: 94.3 },
  { year: 2023, score: 94.5 },
  { year: 2024, score: 94.7 },
  { year: 2025, score: 94.9 },
];

const VERSIONED_FORECASTS = [
  { forecastYear: 2026, predictedValue: 95.2 },
  { forecastYear: 2027, predictedValue: 95.5 },
  { forecastYear: 2028, predictedValue: 95.8 },
  { forecastYear: 2029, predictedValue: 96.1 },
  { forecastYear: 2030, predictedValue: 96.4 },
];

async function seedVersionedForecasts(): Promise<void> {
  for (const forecast of VERSIONED_FORECASTS) {
    await ForecastRepository.upsertForecast({
      id: `fc_test_${forecast.forecastYear}`,
      regionId: null,
      indicatorId: 'development_index',
      forecastYear: forecast.forecastYear,
      predictedValue: forecast.predictedValue,
      lowerBound: Number((forecast.predictedValue - 0.2).toFixed(1)),
      upperBound: Number((forecast.predictedValue + 0.2).toFixed(1)),
      confidenceLevel: 0.8,
      modelName: 'linear_trend_baseline',
      modelVersion: '1.0.0',
      forecastSource: 'experimental_ml',
      forecastMethod: 'ordinary_least_squares_trend',
      validationStatus: 'experimental',
      isCalibrated: false,
      datasetVersionId: 'ds_test',
    });
  }
}

describe('Phase C2 — Forecast Persistence & API Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    ForecastRepository.resetInMemoryStore();
    vi.spyOn(DatasetService, 'active').mockResolvedValue({
      id: 'ds_test',
      version: 'test-v',
      source: 'Synthetic test fixture',
      license: 'test-only',
      coverage: 'test',
    } as never);
    vi.spyOn(prisma.nationalIndexHistory, 'findMany').mockResolvedValue(HISTORY as never);
    app = createApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ForecastRepository Unit & In-Memory Logic', () => {
    it('retrieves national simulated forecasts in ascending chronological order', async () => {
      const forecasts = await ForecastRepository.findNationalForecasts({ validationStatus: 'validated' });
      expect(forecasts.length).toBeGreaterThanOrEqual(5);

      const years = forecasts.map((f) => f.forecastYear);
      expect(years).toEqual([2026, 2027, 2028, 2029, 2030]);

      // All national forecasts have regionId = null and validationStatus = 'simulated'
      for (const f of forecasts) {
        expect(f.regionId).toBeNull();
        expect(f.validationStatus).toBe('simulated');
        expect(typeof f.predictedValue).toBe('number');
        if (f.lowerBound !== null) expect(typeof f.lowerBound).toBe('number');
        if (f.upperBound !== null) expect(typeof f.upperBound).toBe('number');
        if (f.lowerBound !== null && f.upperBound !== null) {
          expect(f.lowerBound).toBeLessThanOrEqual(f.predictedValue);
          expect(f.predictedValue).toBeLessThanOrEqual(f.upperBound);
        }
      }
    });

    it('strictly separates experimental ML output from the simulated scenario series', async () => {
      const scenario = await ForecastRepository.findNationalForecasts({ validationStatus: 'simulated' });
      const experimental = await ForecastRepository.findNationalForecasts({ validationStatus: 'experimental' });

      expect(scenario.length).toBeGreaterThan(0);
      expect(experimental.length).toBeGreaterThan(0);

      // Simulated scenario follows the 68.4 -> 73.5 reference trajectory
      const val2028 = scenario.find((f) => f.forecastYear === 2028);
      expect(val2028).toBeDefined();
      expect(val2028?.predictedValue).toBe(73.5);
      expect(val2028?.forecastSource).toBe('simulated_scenario');
      expect(val2028?.validationStatus).toBe('simulated');
      expect(val2028?.isCalibrated).toBe(false);

      // Experimental series reflects raw uncalibrated ML pipeline output (~95.0)
      const exp2028 = experimental.find((f) => f.forecastYear === 2028);
      expect(exp2028).toBeDefined();
      expect(exp2028?.predictedValue).toBe(95.0);
      expect(exp2028?.forecastSource).toBe('ml_ensemble');
      expect(exp2028?.isCalibrated).toBe(false);
    });

    it('retrieves regional forecasts by regionId', async () => {
      const centralForecasts = await ForecastRepository.findRegionalForecasts('central_capital');
      expect(centralForecasts.length).toBeGreaterThan(0);
      expect(centralForecasts[0].regionId).toBe('central_capital');
      expect(centralForecasts[0].predictedValue).toBe(86.8);
    });

    it('finds forecast by target year with specific options', async () => {
      const fc2027 = await ForecastRepository.findByTargetYear(2027, { validationStatus: 'simulated' });
      expect(fc2027).not.toBeNull();
      expect(fc2027?.forecastYear).toBe(2027);
      expect(fc2027?.predictedValue).toBe(71.8);

      const nonExistent = await ForecastRepository.findByTargetYear(2099);
      expect(nonExistent).toBeNull();
    });

    it('idempotently upserts forecasts and updates values without creating duplicates', async () => {
      const testInput = {
        regionId: null,
        indicatorId: 'development_index',
        forecastYear: 2035,
        predictedValue: 80.5,
        lowerBound: 77.0,
        upperBound: 83.0,
        confidenceLevel: 0.75,
        modelName: 'temporal_ensemble',
        modelVersion: '1.0.0',
        forecastSource: 'test_pipeline',
        forecastMethod: 'temporal_ensemble',
        validationStatus: 'experimental',
        isCalibrated: false,
      };

      // 1. Initial upsert
      const record1 = await ForecastRepository.upsertForecast(testInput);
      expect(record1.predictedValue).toBe(80.5);

      // 2. Query to verify presence
      const queried1 = await ForecastRepository.findByTargetYear(2035, { validationStatus: 'experimental' });
      expect(queried1).not.toBeNull();
      expect(queried1?.predictedValue).toBe(80.5);

      // 3. Update value for same key
      const record2 = await ForecastRepository.upsertForecast({
        ...testInput,
        predictedValue: 81.2,
      });
      expect(record2.id).toBe(record1.id);
      expect(record2.predictedValue).toBe(81.2);

      // 4. Query again to verify update
      const queried2 = await ForecastRepository.findByTargetYear(2035, { validationStatus: 'experimental' });
      expect(queried2?.predictedValue).toBe(81.2);
    });

    it('builds full contract predictions response with DB-sourced actuals', async () => {
      await seedVersionedForecasts();
      const response2028 = await ForecastRepository.getPredictions(2028);

      expect(response2028.target_year).toBe(2028);
      expect(response2028.available_years).toEqual([2027, 2028, 2030]);
      expect(response2028.projected_index).toBe(95.8);
      expect(response2028.confidence).toBe(80);

      // 7 actuals (2019-2025 from PostgreSQL) + 3 forecasts (2026-2028)
      expect(response2028.series).toHaveLength(10);

      const actuals = response2028.series.filter((s) => s.kind === 'actual');
      expect(actuals).toHaveLength(7);
      expect(actuals[0].year).toBe(2019);
      expect(actuals[actuals.length - 1].year).toBe(2025);
      expect(actuals.map((a) => a.value)).toEqual(HISTORY.map((h) => h.score));
      for (const a of actuals) {
        expect(a.lower).toBeNull();
        expect(a.upper).toBeNull();
      }

      const forecasts = response2028.series.filter((s) => s.kind === 'forecast');
      expect(forecasts).toHaveLength(3);
      expect(forecasts.map((f) => f.year)).toEqual([2026, 2027, 2028]);
      expect(forecasts[forecasts.length - 1].value).toBe(95.8);

      // No observed improvement evidence yet.
      expect(response2028.top_improvers).toHaveLength(0);

      // Only the model that produced the rows is listed; no unverified R².
      expect(response2028.models).toHaveLength(1);
      expect(response2028.models[0].id).toBe('linear_trend_baseline');
      expect(response2028.models.every((m) => m.r2 === null)).toBe(true);
      expect(response2028.evaluation?.status).toBe('unavailable');
      expect(response2028.provenance.dataset_version).toBe('ds_test');
      expect(response2028.provenance.data_classification).toBe('experimental_ml');
    });
  });

  describe('HTTP Route: GET /v1/intelligence/predictions', () => {
    it('returns 200 with default target_year=2028 when query omitted', async () => {
      await seedVersionedForecasts();
      const res = await request(app).get('/v1/intelligence/predictions');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.target_year).toBe(2028);
      expect(res.body.data.projected_index).toBe(95.8);
      expect(res.body.data.confidence).toBe(80);

      // Experimental outputs must never claim official status or calibration.
      expect(res.body.data.forecast_classification.is_simulated).toBe(true);
      expect(res.body.data.forecast_classification.is_official).toBe(false);
      expect(res.body.data.forecast_classification.is_calibrated).toBe(false);
      expect(res.body.data.forecast_classification.source).toBe('experimental_ml');
      expect(res.body.data.forecast_classification.validation_status).toBe('experimental');
      expect(res.body.data.forecast_classification.disclaimer_en).toContain('Experimental forecast');
    });

    it('returns target_year=2027 projection correctly', async () => {
      await seedVersionedForecasts();
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2027');
      expect(res.status).toBe(200);
      expect(res.body.data.target_year).toBe(2027);
      expect(res.body.data.projected_index).toBe(95.5);
      expect(res.body.data.confidence).toBe(80);

      const series = res.body.data.series;
      expect(series[series.length - 1].year).toBe(2027);
      expect(series[series.length - 1].value).toBe(95.5);
    });

    it('returns target_year=2030 projection correctly', async () => {
      await seedVersionedForecasts();
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2030');
      expect(res.status).toBe(200);
      expect(res.body.data.target_year).toBe(2030);
      expect(res.body.data.projected_index).toBe(96.4);
      expect(res.body.data.confidence).toBe(80);

      const series = res.body.data.series;
      expect(series[series.length - 1].year).toBe(2030);
      expect(series[series.length - 1].value).toBe(96.4);
    });

    it('rejects invalid target_year with 422 Unprocessable Entity', async () => {
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2029');
      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('fails closed for a status with no version-scoped forecasts', async () => {
      // `validated` normalises to the legacy simulated scenario, which has no
      // rows tied to this dataset version.
      const legacy = await request(app).get(
        '/v1/intelligence/predictions?target_year=2028&validation_status=validated',
      );
      expect(legacy.status).toBe(503);
      expect(legacy.body.error.code).toBe('DATASET_NOT_CONNECTED');
    });

    it('supports validation_status=experimental filter', async () => {
      await seedVersionedForecasts();
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2028&validation_status=experimental');
      expect(res.status).toBe(200);
      expect(res.body.data.target_year).toBe(2028);
      expect(res.body.data.projected_index).toBe(95.8);
    });
  });
});
