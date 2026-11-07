import { prisma } from '../database/prisma.js';
import { DatasetService } from '../services/dataset.service.js';
import { MlForecasterService } from '../services/ml_forecaster.service.js';

function safeJson(obj: unknown) {
  return JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
}

async function main() {
  const activeVersion = await prisma.datasetVersion.findFirst({
    where: { isActive: true },
  });
  console.log('ACTIVE VERSION:', safeJson(activeVersion));

  // Check forecasts for active version
  if (activeVersion) {
    const activeForecasts = await prisma.mlForecast.findMany({
      where: { datasetVersionId: activeVersion.id },
    });
    console.log(`ACTIVE VERSION FORECASTS COUNT: ${activeForecasts.length}`);
    if (activeForecasts.length === 0) {
      console.log('Attempting to evaluate and forecast active version...');
      const summary = await MlForecasterService.evaluateAndForecast(activeVersion.id);
      console.log('Forecast summary:', safeJson(summary));

      // If active version was unsuitable (< 3 periods), activate the comprehensive Egypt version
      if (summary.status === 'unsuitable_preserved_previous') {
        const comprehensive = await prisma.datasetVersion.findFirst({
          where: {
            filename: { contains: 'egypt_comprehensive_dev' },
            validationStatus: 'validated',
          },
          orderBy: { uploadedAt: 'desc' },
        }) || await prisma.datasetVersion.findFirst({
          where: { id: 'ds_demo_curated_2025_v1' },
        });

        if (comprehensive) {
          console.log(`Switching active dataset to comprehensive: ${comprehensive.version} (${comprehensive.id})`);
          await DatasetService.activate(comprehensive.id);
          const compForecasts = await MlForecasterService.evaluateAndForecast(comprehensive.id);
          console.log('Comprehensive forecast summary:', safeJson(compForecasts));
        }
      }
    }
  }

  const allVersions = await prisma.datasetVersion.findMany({
    select: {
      id: true,
      version: true,
      filename: true,
      format: true,
      validationStatus: true,
      isActive: true,
      recordCount: true,
      uploadedAt: true,
    },
    orderBy: { uploadedAt: 'desc' },
    take: 10,
  });
  console.log('LATEST 10 VERSIONS:', safeJson(allVersions));

  const regions = await prisma.region.findMany({
    select: {
      id: true,
      name: true,
      arabicName: true,
      score: true,
      rank: true,
      datasetVersionId: true,
    },
  });
  console.log('ALL REGIONS IN DATABASE (' + regions.length + '):', safeJson(regions));

  const history = await prisma.nationalIndexHistory.findMany({
    select: {
      id: true,
      year: true,
      score: true,
      regionsCount: true,
      datasetVersionId: true,
    },
    orderBy: { year: 'desc' },
  });
  console.log('NATIONAL INDEX HISTORY (' + history.length + '):', safeJson(history));

  const metricsDistinctVersions = await prisma.regionalMetric.groupBy({
    by: ['datasetVersionId'],
    _count: { id: true },
  });
  console.log('REGIONAL METRICS BY VERSION:', safeJson(metricsDistinctVersions));

  const metricsDistinctRegions = await prisma.regionalMetric.groupBy({
    by: ['regionId'],
    _count: { id: true },
  });
  console.log('REGIONAL METRICS BY REGION:', safeJson(metricsDistinctRegions));
}

main().catch(console.error).finally(() => prisma.$disconnect());
