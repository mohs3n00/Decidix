import { fileURLToPath } from 'url';
import { prisma, testPrismaConnection } from './prisma.js';
import { logger } from '../utils/logger.js';
import { ForecastRepository, UpsertForecastInput } from '../repositories/forecast.repository.js';

export const AUTHORITATIVE_FORECASTS: UpsertForecastInput[] = [
  // 1. Simulated national scenario (assumption-based reference trajectory, not an official plan)
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

  // 2. Experimental ML model predictions (reconstructed from contemporaneous indicators, uncalibrated)
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

  // 3. Simulated regional scenarios for illustrative top improvers (target year 2028)
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

export async function runForecastSeed(): Promise<void> {
  const isAvailable = await testPrismaConnection();
  if (!isAvailable) {
    logger.warn('Skipping forecast database seeding: PostgreSQL is not reachable at DATABASE_URL.');
    return;
  }

  try {
    logger.info(`Starting idempotent seeding of ${AUTHORITATIVE_FORECASTS.length} ML forecast records...`);
    let createdCount = 0;

    for (const forecast of AUTHORITATIVE_FORECASTS) {
      await ForecastRepository.upsertForecast(forecast);
      createdCount++;
    }

    logger.info(`Forecast seeding completed successfully: ${createdCount} records upserted.`);
  } catch (error) {
    logger.error('Failed to seed forecast records', { error });
    throw error;
  }
}

// Allow standalone execution: npx tsx src/database/seed_forecasts.ts
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runForecastSeed()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Forecast seed script failed:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}

