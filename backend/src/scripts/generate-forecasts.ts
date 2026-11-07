/**
 * Batch 3 — explainable forecast generation from the ACTIVE dataset.
 *
 * Model: ordinary least-squares linear trend on the national development index
 * (one feature: year). It is deliberately the simplest defensible baseline.
 *
 * - Training input: `national_index_history` rows of the active dataset version.
 * - Backtest: fit on years <= 2023, evaluate on 2024-2025 (temporal holdout).
 *   MAE/RMSE are computed from those held-out predictions, not claimed from R².
 * - Forecast: 2026-2030, with ±1.96 residual-standard-error bounds.
 * - Every row is written with `dataset_version_id`, `model_version`,
 *   `forecast_source='experimental_ml'` and `validation_status='experimental'`.
 *
 * The data is synthetic_demo, so this demonstrates the workflow; it does not
 * establish real-world predictive accuracy.
 *
 * Usage (from backend/): npx tsx src/scripts/generate-forecasts.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../database/prisma.js';
import { ForecastRepository } from '../repositories/forecast.repository.js';
import { toNumber } from '../utils/decimal.js';
import { DatasetService } from '../services/dataset.service.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');

const MODEL_NAME = 'linear_trend_baseline';
const MODEL_VERSION = '1.0.0';
const HOLDOUT_FROM = 2024;
const FORECAST_FROM = 2026;
const FORECAST_TO = 2030;

interface Point {
  x: number;
  y: number;
}

function fitLinear(points: Point[]): { slope: number; intercept: number; residualStd: number } {
  const n = points.length;
  if (n < 2) throw new Error('At least two observations are required for a linear trend.');
  const sumX = points.reduce((sum, point) => sum + point.x, 0);
  const sumY = points.reduce((sum, point) => sum + point.y, 0);
  const sumXY = points.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = points.reduce((sum, point) => sum + point.x * point.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) throw new Error('Degenerate year range; cannot fit a trend.');
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const residuals = points.map((point) => point.y - (intercept + slope * point.x));
  const variance = n > 2 ? residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2) : 0;
  return { slope, intercept, residualStd: Math.sqrt(variance) };
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function main(): Promise<void> {
  const active = await DatasetService.active();
  if (!active) throw new Error('No active dataset version. Run `npm run dataset:bootstrap` first.');

  const history = await prisma.nationalIndexHistory.findMany({
    where: { datasetVersionId: active.id },
    orderBy: { year: 'asc' },
  });
  if (history.length < 4) {
    throw new Error(
      `Dataset ${active.id} has ${history.length} national observations; at least 4 are required for a defensible trend model.`
    );
  }

  const points: Point[] = history.map((row) => ({ x: row.year, y: toNumber(row.score) }));
  const fullFit = fitLinear(points);

  // Temporal holdout evaluation: fit on <= 2023, predict 2024+.
  const train = points.filter((point) => point.x < HOLDOUT_FROM);
  const test = points.filter((point) => point.x >= HOLDOUT_FROM);
  let evaluation: { trainYears: number[]; testYears: number[]; mae: number; rmse: number } | null = null;
  if (train.length >= 3 && test.length >= 1) {
    const holdoutFit = fitLinear(train);
    const errors = test.map((point) => point.y - (holdoutFit.intercept + holdoutFit.slope * point.x));
    evaluation = {
      trainYears: train.map((point) => point.x),
      testYears: test.map((point) => point.x),
      mae: round(errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length, 3),
      rmse: round(Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / errors.length), 3),
    };
  }

  for (let year = FORECAST_FROM; year <= FORECAST_TO; year += 1) {
    const predicted = fullFit.intercept + fullFit.slope * year;
    const margin = 1.96 * fullFit.residualStd;
    await ForecastRepository.upsertForecast({
      id: `fc_national_development_index_${year}_${MODEL_NAME}_${MODEL_VERSION}_experimental`,
      regionId: null,
      indicatorId: 'development_index',
      forecastYear: year,
      predictedValue: round(predicted),
      lowerBound: round(predicted - margin),
      upperBound: round(predicted + margin),
      confidenceLevel: 0.8,
      modelName: MODEL_NAME,
      modelVersion: MODEL_VERSION,
      forecastSource: 'experimental_ml',
      forecastMethod: 'ordinary_least_squares_trend',
      validationStatus: 'experimental',
      isCalibrated: false,
      datasetVersionId: active.id,
    });
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    datasetVersion: active.id,
    datasetVersionLabel: active.version,
    sourceClassification: /synthetic|demo|test|illustrative/i.test(
      `${active.source} ${active.license} ${active.coverage}`
    )
      ? 'synthetic_demo'
      : 'official_source',
    model: { name: MODEL_NAME, version: MODEL_VERSION, method: 'ordinary_least_squares_trend' },
    training: {
      years: points.map((point) => point.x),
      observations: points.length,
      slope: round(fullFit.slope, 3),
      intercept: round(fullFit.intercept, 3),
      residualStd: round(fullFit.residualStd, 3),
    },
    evaluation,
    evaluationNote:
      'Temporal holdout on synthetic demonstration data. These metrics describe fit to the generated series, not real-world forecast accuracy.',
    forecasts: Array.from({ length: FORECAST_TO - FORECAST_FROM + 1 }, (_, index) => FORECAST_FROM + index),
  };
  writeFileSync(join(repoRoot, 'ml', 'models', 'backend_backtest.json'), JSON.stringify(artifact, null, 2));

  console.log(JSON.stringify(artifact, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('[forecast] FAILED:', error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
