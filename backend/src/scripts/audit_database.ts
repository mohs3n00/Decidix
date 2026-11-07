import { prisma } from '../database/prisma.js';

async function main() {
  const activeVersion = await prisma.datasetVersion.findFirst({
    where: { isActive: true },
  });
  console.log('ACTIVE VERSION:', JSON.stringify(activeVersion, null, 2));

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
  console.log('LATEST 10 VERSIONS:', JSON.stringify(allVersions, null, 2));

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
  console.log('ALL REGIONS IN DATABASE (' + regions.length + '):', JSON.stringify(regions, null, 2));

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
  console.log('NATIONAL INDEX HISTORY (' + history.length + '):', JSON.stringify(history, null, 2));

  const metricsDistinctVersions = await prisma.regionalMetric.groupBy({
    by: ['datasetVersionId'],
    _count: { id: true },
  });
  console.log('REGIONAL METRICS BY VERSION:', JSON.stringify(metricsDistinctVersions, null, 2));

  const metricsDistinctRegions = await prisma.regionalMetric.groupBy({
    by: ['regionId'],
    _count: { id: true },
  });
  console.log('REGIONAL METRICS BY REGION:', JSON.stringify(metricsDistinctRegions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
