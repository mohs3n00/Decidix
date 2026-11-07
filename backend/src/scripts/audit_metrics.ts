import { prisma } from '../database/prisma.js';

async function main() {
  const versions = await prisma.datasetVersion.findMany({
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      version: true,
      filename: true,
      format: true,
      isActive: true,
      validationStatus: true,
      recordCount: true,
    },
  });
  console.log('--- ALL DATASET VERSIONS ---');
  console.log(JSON.stringify(versions, null, 2));

  const metricCounts = await prisma.regionalMetric.groupBy({
    by: ['datasetVersionId'],
    _count: { id: true },
  });
  console.log('--- REGIONAL METRICS BY DATASET VERSION ---');
  console.log(JSON.stringify(metricCounts, null, 2));

  const active = versions.find((v) => v.isActive);
  if (active) {
    const activeMetrics = await prisma.regionalMetric.findMany({
      where: { datasetVersionId: active.id },
      take: 10,
    });
    console.log(`--- SAMPLE METRICS FOR ACTIVE (${active.id}) ---`);
    console.log(JSON.stringify(activeMetrics, null, 2));

    const activeHistory = await prisma.nationalIndexHistory.findMany({
      where: { datasetVersionId: active.id },
    });
    console.log(`--- NATIONAL HISTORY FOR ACTIVE (${active.id}) ---`);
    console.log(JSON.stringify(activeHistory, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
