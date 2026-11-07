import { prisma } from '../database/prisma.js';

async function main() {
  const versions = await prisma.datasetVersion.findMany({
    select: {
      id: true,
      version: true,
      filename: true,
      format: true,
      validationStatus: true,
      isActive: true,
      recordCount: true,
    },
  });
  console.log('Dataset versions:', JSON.stringify(versions, null, 2));

  const metadataCount = await prisma.datasetMetadata.count();
  const recordsCount = await prisma.datasetRecord.count();
  const ragDocsCount = await prisma.ragDocument.count();
  const regionsCount = await prisma.region.count();
  const indicatorsCount = await prisma.indicator.count();
  const regionalMetricsCount = await prisma.regionalMetric.count();
  const forecastsCount = await prisma.mlForecast.count();

  console.log('Counts:', {
    metadataCount,
    recordsCount,
    ragDocsCount,
    regionsCount,
    indicatorsCount,
    regionalMetricsCount,
    forecastsCount,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
