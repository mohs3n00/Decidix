import { prisma, testPrismaConnection } from '../database/prisma.js';
import { toNumber, toOptionalNumber } from '../utils/decimal.js';
import { SEED_OVERVIEW, SEED_REGIONS } from '../database/seed_data.js';
import { env, syntheticDataAllowed } from '../config/env.js';
import { AppError } from '../utils/response.js';
import { SYNTHETIC_PROVENANCE } from '../utils/provenance.js';
import { DatasetService } from '../services/dataset.service.js';

/**
 * Legacy compatibility alias.
 *
 * The former 'validated' status asserted an official validation that no artifact
 * supports. It is accepted as a deprecated alias for the simulated scenario so
 * existing clients keep working, and is never returned by the API.
 */
export function normalizeValidationStatus(status?: string | null): string {
  if (!status || status === 'validated') return 'simulated';
  return status;
}

export interface ForecastRecord {
  id: string;
  regionId: string | null;
  indicatorId: string;
  forecastYear: number;
  predictedValue: number;
  lowerBound: number | null;
  upperBound: number | null;
  confidenceLevel: number;
  modelName: string;
  modelVersion: string;
  forecastSource: string;
  forecastMethod: string;
  validationStatus: string;
  isCalibrated: boolean;
  datasetVersionId?: string | null;
  createdAt?: Date;
}

export interface UpsertForecastInput {
  id?: string;
  regionId?: string | null;
  indicatorId?: string;
  forecastYear: number;
  predictedValue: number;
  lowerBound?: number | null;
  upperBound?: number | null;
  confidenceLevel?: number;
  modelName?: string;
  modelVersion?: string;
  forecastSource?: string;
  forecastMethod?: string;
  validationStatus?: string;
  isCalibrated?: boolean;
  /** Batch 3: the dataset version this forecast was generated from. */
  datasetVersionId?: string | null;
}

export interface ForecastQueryOptions {
  regionId?: string | null;
  indicatorId?: string;
  validationStatus?: string;
  horizonYear?: number;
  datasetVersionId?: string | null;
}

export interface PredictionsResponse {
  target_year: number;
  available_years: number[];
  projected_index: number;
  confidence: number;
  series: Array<{
    year: number;
    value: number;
    kind: 'actual' | 'forecast';
    lower: number | null;
    upper: number | null;
  }>;
  models: Array<{
    id: string;
    name: string;
    arabic_name: string;
    r2: number | null;
  }>;
  top_improvers: Array<{
    region_id: string;
    name: string;
    arabic_name: string;
    delta: number;
  }>;
  forecast_classification: {
    source: string;
    is_simulated: boolean;
    is_official: boolean;
    is_calibrated: boolean;
    validation_status: string;
    disclaimer_en: string;
    disclaimer_ar: string;
  };
  provenance: typeof SYNTHETIC_PROVENANCE;
  evaluation?: {
    status: 'unavailable' | 'computed';
    reason: string;
  };
}

/**
 * Built-in fallback forecast records for offline/testing environments
 */
const DEFAULT_FORECASTS: UpsertForecastInput[] = [
  // 1. Validated official trajectory (contract baseline: 68.4 in 2025 -> 73.5 in 2028)
  {
    regionId: null,
    indicatorId: 'development_index',
    forecastYear: 2026,
    predictedValue: 70.0,
    lowerBound: 69.0,
    upperBound: 71.0,
    confidenceLevel: 0.95,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0',
    forecastSource: 'simulated_scenario',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'simulated',
    isCalibrated: false,
  },
  {
    regionId: null,
    indicatorId: 'development_index',
    forecastYear: 2027,
    predictedValue: 71.8,
    lowerBound: 70.2,
    upperBound: 73.4,
    confidenceLevel: 0.91,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0',
    forecastSource: 'simulated_scenario',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'simulated',
    isCalibrated: false,
  },
  {
    regionId: null,
    indicatorId: 'development_index',
    forecastYear: 2028,
    predictedValue: 73.5,
    lowerBound: 71.4,
    upperBound: 75.6,
    confidenceLevel: 0.87,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0',
    forecastSource: 'simulated_scenario',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'simulated',
    isCalibrated: false,
  },
  {
    regionId: null,
    indicatorId: 'development_index',
    forecastYear: 2029,
    predictedValue: 75.1,
    lowerBound: 72.5,
    upperBound: 77.7,
    confidenceLevel: 0.84,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0',
    forecastSource: 'simulated_scenario',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'simulated',
    isCalibrated: false,
  },
  {
    regionId: null,
    indicatorId: 'development_index',
    forecastYear: 2030,
    predictedValue: 76.8,
    lowerBound: 73.8,
    upperBound: 79.8,
    confidenceLevel: 0.81,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0',
    forecastSource: 'simulated_scenario',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'simulated',
    isCalibrated: false,
  },
  // 2. Experimental ML pipeline output (R2=0.975 on contemporaneous indicators, uncalibrated)
  {
    regionId: null,
    indicatorId: 'development_index',
    forecastYear: 2026,
    predictedValue: 94.9,
    lowerBound: 93.8,
    upperBound: 95.8,
    confidenceLevel: 0.95,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0-experimental',
    forecastSource: 'ml_ensemble',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'experimental',
    isCalibrated: false,
  },
  {
    regionId: null,
    indicatorId: 'development_index',
    forecastYear: 2027,
    predictedValue: 94.9,
    lowerBound: 93.5,
    upperBound: 96.0,
    confidenceLevel: 0.91,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0-experimental',
    forecastSource: 'ml_ensemble',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'experimental',
    isCalibrated: false,
  },
  {
    regionId: null,
    indicatorId: 'development_index',
    forecastYear: 2028,
    predictedValue: 95.0,
    lowerBound: 93.2,
    upperBound: 96.2,
    confidenceLevel: 0.87,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0-experimental',
    forecastSource: 'ml_ensemble',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'experimental',
    isCalibrated: false,
  },
  // 3. Regional forecasts for top improvers
  {
    regionId: 'central_capital',
    indicatorId: 'development_index',
    forecastYear: 2028,
    predictedValue: 86.8,
    lowerBound: 84.5,
    upperBound: 89.0,
    confidenceLevel: 0.88,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0',
    forecastSource: 'simulated_scenario',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'simulated',
    isCalibrated: false,
  },
  {
    regionId: 'lakeside',
    indicatorId: 'development_index',
    forecastYear: 2028,
    predictedValue: 71.5,
    lowerBound: 69.0,
    upperBound: 73.8,
    confidenceLevel: 0.85,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0',
    forecastSource: 'simulated_scenario',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'simulated',
    isCalibrated: false,
  },
  {
    regionId: 'western_coast',
    indicatorId: 'development_index',
    forecastYear: 2028,
    predictedValue: 78.1,
    lowerBound: 75.8,
    upperBound: 80.4,
    confidenceLevel: 0.86,
    modelName: 'temporal_ensemble',
    modelVersion: '1.0.0',
    forecastSource: 'simulated_scenario',
    forecastMethod: 'temporal_ensemble',
    validationStatus: 'simulated',
    isCalibrated: false,
  },
];

/**
 * Memory map for deterministic offline testing and fallback
 */
const inMemoryForecasts = new Map<string, ForecastRecord>();

function getForecastKey(
  regionId: string | null | undefined,
  indicatorId: string,
  forecastYear: number,
  modelVersion: string,
  validationStatus: string
): string {
  return `fc_${regionId || 'national'}_${indicatorId}_${forecastYear}_${modelVersion}_${validationStatus}`;
}

// Initialize in-memory records
for (const item of DEFAULT_FORECASTS) {
  const indicatorId = item.indicatorId || 'development_index';
  const modelVersion = item.modelVersion || '1.0.0';
  const validationStatus = item.validationStatus || 'simulated';
  const key = item.id || getForecastKey(item.regionId, indicatorId, item.forecastYear, modelVersion, validationStatus);
  inMemoryForecasts.set(key, {
    id: key,
    regionId: item.regionId ?? null,
    indicatorId,
    forecastYear: item.forecastYear,
    predictedValue: item.predictedValue,
    lowerBound: item.lowerBound ?? null,
    upperBound: item.upperBound ?? null,
    confidenceLevel: item.confidenceLevel ?? 0.95,
    modelName: item.modelName ?? 'temporal_ensemble',
    modelVersion,
    forecastSource: item.forecastSource ?? 'simulated_scenario',
    forecastMethod: item.forecastMethod ?? 'temporal_ensemble',
    validationStatus,
    isCalibrated: item.isCalibrated ?? false,
    createdAt: new Date(),
  });
}

export class ForecastRepository {
  /**
   * Clears in-memory test overrides (useful in test teardown).
   */
  static resetInMemoryStore(): void {
    inMemoryForecasts.clear();
    for (const item of DEFAULT_FORECASTS) {
      const indicatorId = item.indicatorId || 'development_index';
      const modelVersion = item.modelVersion || '1.0.0';
      const validationStatus = item.validationStatus || 'simulated';
      const key = item.id || getForecastKey(item.regionId, indicatorId, item.forecastYear, modelVersion, validationStatus);
      inMemoryForecasts.set(key, {
        id: key,
        regionId: item.regionId ?? null,
        indicatorId,
        forecastYear: item.forecastYear,
        predictedValue: item.predictedValue,
        lowerBound: item.lowerBound ?? null,
        upperBound: item.upperBound ?? null,
        confidenceLevel: item.confidenceLevel ?? 0.95,
        modelName: item.modelName ?? 'temporal_ensemble',
        modelVersion,
        forecastSource: item.forecastSource ?? 'simulated_scenario',
        forecastMethod: item.forecastMethod ?? 'temporal_ensemble',
        validationStatus,
        isCalibrated: item.isCalibrated ?? false,
        createdAt: new Date(),
      });
    }
  }

  /**
   * Maps a Prisma MlForecast entity to typed ForecastRecord with plain numbers.
   */
  private static mapToRecord(entity: any): ForecastRecord {
    return {
      id: entity.id,
      regionId: entity.regionId,
      indicatorId: entity.indicatorId,
      forecastYear: entity.forecastYear,
      predictedValue: toNumber(entity.predictedValue),
      lowerBound: toOptionalNumber(entity.lowerBound),
      upperBound: toOptionalNumber(entity.upperBound),
      confidenceLevel: toNumber(entity.confidenceLevel, 0.95),
      modelName: entity.modelName,
      modelVersion: entity.modelVersion,
      forecastSource: entity.forecastSource,
      forecastMethod: entity.forecastMethod,
      validationStatus: entity.validationStatus,
      isCalibrated: entity.isCalibrated,
      datasetVersionId: entity.datasetVersionId ?? null,
      createdAt: entity.createdAt,
    };
  }

  /**
   * Finds national-level forecasts, ordered by forecast year ascending.
   */
  static async findNationalForecasts(options?: ForecastQueryOptions): Promise<ForecastRecord[]> {
    const isDbReady = await testPrismaConnection();
    const indicatorId = options?.indicatorId ?? 'development_index';
    const validationStatus = normalizeValidationStatus(options?.validationStatus);
    const horizonYear = options?.horizonYear;

    if (!isDbReady) {
      if (env.NODE_ENV === 'production') {
        throw AppError.internal('Database connection unavailable for forecast query.');
      }
      return Array.from(inMemoryForecasts.values())
        .filter((f) => f.regionId === null)
        .filter((f) => f.indicatorId === indicatorId)
        .filter((f) => f.validationStatus === validationStatus)
        .filter((f) => (options?.datasetVersionId ? f.datasetVersionId === options.datasetVersionId : true))
        .filter((f) => (horizonYear ? f.forecastYear <= horizonYear : true))
        .sort((a, b) => a.forecastYear - b.forecastYear);
    }

    try {
      const records = await prisma.mlForecast.findMany({
        where: {
          regionId: null,
          indicatorId,
          validationStatus,
          ...(options?.datasetVersionId ? { datasetVersionId: options.datasetVersionId } : {}),
          ...(horizonYear ? { forecastYear: { lte: horizonYear } } : {}),
        },
        orderBy: { forecastYear: 'asc' },
      });
      return records.map((r) => this.mapToRecord(r));
    } catch (error) {
      if (env.NODE_ENV === 'production') throw error;
      return Array.from(inMemoryForecasts.values())
        .filter((f) => f.regionId === null && f.indicatorId === indicatorId && f.validationStatus === validationStatus)
        .filter((f) => (options?.datasetVersionId ? f.datasetVersionId === options.datasetVersionId : true))
        .filter((f) => (horizonYear ? f.forecastYear <= horizonYear : true))
        .sort((a, b) => a.forecastYear - b.forecastYear);
    }
  }

  /**
   * Finds regional forecasts for a specific region slug.
   */
  static async findRegionalForecasts(regionId: string, options?: ForecastQueryOptions): Promise<ForecastRecord[]> {
    const isDbReady = await testPrismaConnection();
    const indicatorId = options?.indicatorId ?? 'development_index';
    const validationStatus = normalizeValidationStatus(options?.validationStatus);
    const horizonYear = options?.horizonYear;

    if (!isDbReady) {
      if (env.NODE_ENV === 'production') {
        throw AppError.internal('Database connection unavailable for regional forecast query.');
      }
      return Array.from(inMemoryForecasts.values())
        .filter((f) => f.regionId === regionId)
        .filter((f) => f.indicatorId === indicatorId)
        .filter((f) => f.validationStatus === validationStatus)
        .filter((f) => (horizonYear ? f.forecastYear <= horizonYear : true))
        .sort((a, b) => a.forecastYear - b.forecastYear);
    }

    try {
      const records = await prisma.mlForecast.findMany({
        where: {
          regionId,
          indicatorId,
          validationStatus,
          ...(horizonYear ? { forecastYear: { lte: horizonYear } } : {}),
        },
        orderBy: { forecastYear: 'asc' },
      });
      return records.map((r) => this.mapToRecord(r));
    } catch (error) {
      if (env.NODE_ENV === 'production') throw error;
      return Array.from(inMemoryForecasts.values())
        .filter((f) => f.regionId === regionId && f.indicatorId === indicatorId && f.validationStatus === validationStatus)
        .filter((f) => (horizonYear ? f.forecastYear <= horizonYear : true))
        .sort((a, b) => a.forecastYear - b.forecastYear);
    }
  }

  /**
   * Finds a forecast for a specific target year.
   */
  static async findByTargetYear(year: number, options?: ForecastQueryOptions): Promise<ForecastRecord | null> {
    const isDbReady = await testPrismaConnection();
    const regionId = options?.regionId !== undefined ? options.regionId : null;
    const indicatorId = options?.indicatorId ?? 'development_index';
    const validationStatus = normalizeValidationStatus(options?.validationStatus);

    if (!isDbReady) {
      const match = Array.from(inMemoryForecasts.values()).find(
        (f) =>
          f.forecastYear === year &&
          f.regionId === regionId &&
          f.indicatorId === indicatorId &&
          f.validationStatus === validationStatus &&
          (!options?.datasetVersionId || f.datasetVersionId === options.datasetVersionId)
      );
      return match ?? null;
    }

    try {
      const record = await prisma.mlForecast.findFirst({
        where: {
          regionId,
          indicatorId,
          forecastYear: year,
          validationStatus,
          ...(options?.datasetVersionId ? { datasetVersionId: options.datasetVersionId } : {}),
        },
      });
      return record ? this.mapToRecord(record) : null;
    } catch (error) {
      if (env.NODE_ENV === 'production') throw error;
      const match = Array.from(inMemoryForecasts.values()).find(
        (f) =>
          f.forecastYear === year &&
          f.regionId === regionId &&
          f.indicatorId === indicatorId &&
          f.validationStatus === validationStatus &&
          (!options?.datasetVersionId || f.datasetVersionId === options.datasetVersionId)
      );
      return match ?? null;
    }
  }

  /**
   * Idempotently upserts a forecast record.
   */
  static async upsertForecast(input: UpsertForecastInput): Promise<ForecastRecord> {
    const indicatorId = input.indicatorId || 'development_index';
    const modelVersion = input.modelVersion || '1.0.0';
    const validationStatus = normalizeValidationStatus(input.validationStatus);
    const id = input.id || getForecastKey(input.regionId, indicatorId, input.forecastYear, modelVersion, validationStatus);

    const record: ForecastRecord = {
      id,
      regionId: input.regionId ?? null,
      indicatorId,
      forecastYear: input.forecastYear,
      predictedValue: input.predictedValue,
      lowerBound: input.lowerBound ?? null,
      upperBound: input.upperBound ?? null,
      confidenceLevel: input.confidenceLevel ?? 0.95,
      modelName: input.modelName ?? 'temporal_ensemble',
      modelVersion,
      forecastSource: input.forecastSource ?? 'simulated_scenario',
      forecastMethod: input.forecastMethod ?? 'temporal_ensemble',
      validationStatus,
      isCalibrated: input.isCalibrated ?? false,
      datasetVersionId: input.datasetVersionId ?? null,
      createdAt: new Date(),
    };

    // Always update in-memory cache
    inMemoryForecasts.set(id, record);

    const isDbReady = await testPrismaConnection();
    if (!isDbReady) {
      return record;
    }

    try {
      const upserted = await prisma.mlForecast.upsert({
        where: { id },
        update: {
          regionId: input.regionId ?? null,
          indicatorId,
          forecastYear: input.forecastYear,
          predictedValue: input.predictedValue,
          lowerBound: input.lowerBound ?? null,
          upperBound: input.upperBound ?? null,
          confidenceLevel: input.confidenceLevel ?? 0.95,
          modelName: input.modelName ?? 'temporal_ensemble',
          modelVersion,
          forecastSource: input.forecastSource ?? 'simulated_scenario',
          forecastMethod: input.forecastMethod ?? 'temporal_ensemble',
          validationStatus,
          isCalibrated: input.isCalibrated ?? false,
          datasetVersionId: input.datasetVersionId ?? null,
        },
        create: {
          id,
          regionId: input.regionId ?? null,
          indicatorId,
          forecastYear: input.forecastYear,
          predictedValue: input.predictedValue,
          lowerBound: input.lowerBound ?? null,
          upperBound: input.upperBound ?? null,
          confidenceLevel: input.confidenceLevel ?? 0.95,
          modelName: input.modelName ?? 'temporal_ensemble',
          modelVersion,
          forecastSource: input.forecastSource ?? 'simulated_scenario',
          forecastMethod: input.forecastMethod ?? 'temporal_ensemble',
          validationStatus,
          isCalibrated: input.isCalibrated ?? false,
          datasetVersionId: input.datasetVersionId ?? null,
        },
      });
      return this.mapToRecord(upserted);
    } catch (error) {
      if (env.NODE_ENV === 'production') throw error;
      return record;
    }
  }

  /**
   * Builds the full contract-compliant predictions response for Flutter.
   */
  static async getPredictions(targetYear: number, options?: { validationStatus?: string }): Promise<PredictionsResponse> {
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing forecasts.',
        'DATASET_NOT_CONNECTED'
      );
    }
    if (!syntheticDataAllowed() && !(await testPrismaConnection())) {
      throw AppError.internal('Database connection unavailable for forecast data.');
    }
    const validationStatus = normalizeValidationStatus(options?.validationStatus ?? 'experimental');
    const active = await DatasetService.active();
    if (!active) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing forecasts.',
        'DATASET_NOT_CONNECTED'
      );
    }

    // 1. Historical actuals come from the active version's persisted observations.
    const history = await prisma.nationalIndexHistory.findMany({
      where: { datasetVersionId: active.id },
      orderBy: { year: 'asc' },
    });
    if (history.length === 0) {
      throw AppError.unavailable(
        `Dataset ${active.version} has no persisted historical observations for forecasting.`,
        'DATASET_NOT_CONNECTED'
      );
    }
    const actualSeries = history.map((row) => ({
      year: row.year,
      value: toNumber(row.score),
      kind: 'actual' as const,
      lower: null,
      upper: null,
    }));

    // 2. Forecast points up to targetYear, restricted to THIS dataset version.
    const nationalForecasts = await this.findNationalForecasts({
      validationStatus,
      horizonYear: targetYear,
      datasetVersionId: active.id,
    });
    if (nationalForecasts.length === 0) {
      throw AppError.unavailable(
        `No version-scoped forecasts exist for dataset ${active.version}. Generate them from the active dataset before viewing predictions.`,
        'DATASET_NOT_CONNECTED'
      );
    }

    const forecastSeries = nationalForecasts
      .filter((f) => f.forecastYear >= 2026 && f.forecastYear <= targetYear)
      .map((f) => ({
        year: f.forecastYear,
        value: f.predictedValue,
        kind: 'forecast' as const,
        lower: f.lowerBound ?? f.predictedValue,
        upper: f.upperBound ?? f.predictedValue,
      }));

    const projectedRecord = nationalForecasts.find((f) => f.forecastYear === targetYear);
    if (!projectedRecord) {
      throw AppError.unavailable(
        `No verified forecast is available for target year ${targetYear}.`,
        'DATASET_NOT_CONNECTED'
      );
    }
    const projectedIndex = projectedRecord.predictedValue;
    const confidence = projectedRecord.confidenceLevel
      ? Math.round(projectedRecord.confidenceLevel * 100)
      : 0;

    // Only the model that actually produced the persisted rows is listed, and
    // its R² is null: no reproducible out-of-sample metric is stored in the
    // application schema. Offline holdout metrics live with the ML artifacts.
    const modelIds = [...new Set(nationalForecasts.map((forecast) => forecast.modelName))];
    const models = (modelIds.length > 0 ? modelIds : ['linear_trend_baseline']).map((id) => ({
      id,
      name: id === 'linear_trend_baseline' ? 'Linear trend baseline' : id.replace(/_/g, ' '),
      arabic_name: id === 'linear_trend_baseline' ? 'خط الاتجاه الأساسي' : id,
      r2: null,
    }));

    // Forecasts and synthetic fixture history cannot establish observed
    // improvement. Until two verified observations exist, rankings stay empty.
    const topImprovers: PredictionsResponse['top_improvers'] = [];

    return {
      target_year: targetYear,
      available_years: [2027, 2028, 2030],
      projected_index: projectedIndex,
      confidence,
      series: [...actualSeries, ...forecastSeries],
      models,
      top_improvers: topImprovers,
      forecast_classification: {
        source: projectedRecord?.forecastSource ?? 'experimental_ml',
        is_simulated: true,
        is_official: false,
        is_calibrated: projectedRecord?.isCalibrated ?? false,
        validation_status: validationStatus,
        disclaimer_en:
          'Experimental forecast: generated from the active synthetic demonstration dataset by a simple explainable trend model. It is not an official projection and has not been validated against real-world outcomes.',
        disclaimer_ar:
          'توقع تجريبي: مُولّد من مجموعة البيانات الاصطناعية التوضيحية النشطة بواسطة نموذج اتجاه بسيط قابل للتفسير. وهو ليس توقعاً رسمياً ولم يتم التحقق منه مقابل نتائج واقعية.',
      },
      evaluation: {
        status: 'unavailable',
        reason:
          'Holdout metrics are computed offline by backend/src/scripts/generate-forecasts.ts and are not stored in the application schema; no live R² is claimed.',
      },
      provenance: {
        data_classification: 'experimental_ml',
        source_classification: /synthetic|demo|test|illustrative/i.test(
          `${active.source} ${active.license} ${active.coverage}`
        )
          ? 'synthetic_demo'
          : 'official_source',
        source: active.source,
        dataset_version: active.id,
        observation_period: `${history[0].year}-${history[history.length - 1].year}`,
        method:
          'Ordinary least-squares linear trend fitted to the active dataset national index; forecasts are experimental and uncalibrated.',
        verification_status: 'unverified',
        disclaimer_en:
          'Experimental forecast derived from the active dataset. Not an official measurement or validated prediction.',
        disclaimer_ar:
          'توقع تجريبي مشتق من مجموعة البيانات النشطة. ليس قياساً رسمياً ولا توقعاً تم التحقق منه.',
      },
    };
  }
}
