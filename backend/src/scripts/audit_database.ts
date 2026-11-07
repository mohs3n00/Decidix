import { prisma } from '../database/prisma.js';

function safeJson(obj: unknown) {
  return JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
}

async function main() {
  const activeVersion = await prisma.datasetVersion.findFirst({
    where: { isActive: true },
  });
  console.log('ACTIVE VERSION:', safeJson(activeVersion));

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
