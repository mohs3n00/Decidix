import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Express } from 'express';
import { ForecastRepository } from '../src/repositories/forecast.repository.js';

describe('Phase C2 — Forecast Persistence & API Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    ForecastRepository.resetInMemoryStore();
    app = createApp();
  });

  describe('ForecastRepository Unit & In-Memory Logic', () => {
    it('retrieves national validated forecasts in ascending chronological order', async () => {
      const forecasts = await ForecastRepository.findNationalForecasts({ validationStatus: 'validated' });
      expect(forecasts.length).toBeGreaterThanOrEqual(5);

      const years = forecasts.map((f) => f.forecastYear);
      expect(years).toEqual([2026, 2027, 2028, 2029, 2030]);

      // All national forecasts have regionId = null and validationStatus = 'validated'
      for (const f of forecasts) {
        expect(f.regionId).toBeNull();
        expect(f.validationStatus).toBe('validated');
        expect(typeof f.predictedValue).toBe('number');
        if (f.lowerBound !== null) expect(typeof f.lowerBound).toBe('number');
        if (f.upperBound !== null) expect(typeof f.upperBound).toBe('number');
        if (f.lowerBound !== null && f.upperBound !== null) {
          expect(f.lowerBound).toBeLessThanOrEqual(f.predictedValue);
          expect(f.predictedValue).toBeLessThanOrEqual(f.upperBound);
        }
      }
    });

    it('strictly separates experimental ML forecasts from validated official planning forecasts', async () => {
      const validated = await ForecastRepository.findNationalForecasts({ validationStatus: 'validated' });
      const experimental = await ForecastRepository.findNationalForecasts({ validationStatus: 'experimental' });

      expect(validated.length).toBeGreaterThan(0);
      expect(experimental.length).toBeGreaterThan(0);

      // Validated series follows 68.4 -> 73.5 trajectory
      const val2028 = validated.find((f) => f.forecastYear === 2028);
      expect(val2028).toBeDefined();
      expect(val2028?.predictedValue).toBe(73.5);
      expect(val2028?.forecastSource).toBe('official_planning');
      expect(val2028?.isCalibrated).toBe(true);

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
      const fc2027 = await ForecastRepository.findByTargetYear(2027, { validationStatus: 'validated' });
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

    it('builds full contract predictions response with accurate series alignment', async () => {
      const response2028 = await ForecastRepository.getPredictions(2028);

      expect(response2028.target_year).toBe(2028);
      expect(response2028.available_years).toEqual([2027, 2028, 2030]);
      expect(response2028.projected_index).toBe(73.5);
      expect(response2028.confidence).toBe(87);

      // Series contains 5 actuals (2021-2025) and 3 forecasts (2026-2028)
      expect(response2028.series).toHaveLength(8);

      const actuals = response2028.series.filter((s) => s.kind === 'actual');
      expect(actuals).toHaveLength(5);
      expect(actuals[0].year).toBe(2021);
      expect(actuals[actuals.length - 1].year).toBe(2025);
      for (const a of actuals) {
        expect(a.lower).toBeNull();
        expect(a.upper).toBeNull();
      }

      const forecasts = response2028.series.filter((s) => s.kind === 'forecast');
      expect(forecasts).toHaveLength(3);
      expect(forecasts.map((f) => f.year)).toEqual([2026, 2027, 2028]);
      expect(forecasts[forecasts.length - 1].value).toBe(73.5);

      // Top improvers
      expect(response2028.top_improvers).toHaveLength(3);
      expect(response2028.top_improvers[0].region_id).toBe('central_capital');

      // Models
      expect(response2028.models).toHaveLength(3);
      expect(response2028.models.some((m) => m.id === 'temporal_ensemble')).toBe(true);
    });
  });

  describe('HTTP Route: GET /v1/intelligence/predictions', () => {
    it('returns 200 with default target_year=2028 when query omitted', async () => {
      const res = await request(app).get('/v1/intelligence/predictions');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.target_year).toBe(2028);
      expect(res.body.data.projected_index).toBe(73.5);
      expect(res.body.data.confidence).toBe(87);
    });

    it('returns target_year=2027 projection correctly', async () => {
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2027');
      expect(res.status).toBe(200);
      expect(res.body.data.target_year).toBe(2027);
      expect(res.body.data.projected_index).toBe(71.8);
      expect(res.body.data.confidence).toBe(91);

      const series = res.body.data.series;
      expect(series[series.length - 1].year).toBe(2027);
      expect(series[series.length - 1].value).toBe(71.8);
    });

    it('returns target_year=2030 projection correctly', async () => {
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2030');
      expect(res.status).toBe(200);
      expect(res.body.data.target_year).toBe(2030);
      expect(res.body.data.projected_index).toBe(76.8);
      expect(res.body.data.confidence).toBe(81);

      const series = res.body.data.series;
      expect(series[series.length - 1].year).toBe(2030);
      expect(series[series.length - 1].value).toBe(76.8);
    });

    it('rejects invalid target_year with 422 Unprocessable Entity', async () => {
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2029');
      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('supports validation_status=experimental filter', async () => {
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2028&validation_status=experimental');
      expect(res.status).toBe(200);
      expect(res.body.data.target_year).toBe(2028);
      expect(res.body.data.projected_index).toBe(95.0);
    });
  });
});
