import { prisma } from '../database/prisma.js';
import { EvidenceService } from '../services/evidence.service.js';
import { DatasetService } from '../services/dataset.service.js';

async function main() {
  const active = await DatasetService.active();
  console.log('ACTIVE DATASET:', active?.id, active?.version);

  // Check metrics for active
  const metrics = await prisma.regionalMetric.findMany({
    where: { datasetVersionId: active!.id },
    select: { regionId: true, indicatorKey: true },
  });
  const regionIds = [...new Set(metrics.map((m) => m.regionId))];
  const indicatorKeys = [...new Set(metrics.map((m) => m.indicatorKey))];
  console.log('Region IDs from metrics:', regionIds);
  console.log('Indicator Keys from metrics:', indicatorKeys);

  // Test EvidenceService query with OR
  const regionsOr = await prisma.region.findMany({
    where: {
      OR: [
        { datasetVersionId: active!.id },
        { metrics: { some: { datasetVersionId: active!.id } } },
      ],
    },
    orderBy: { rank: 'asc' },
  });
  console.log('Regions resolved via OR query (' + regionsOr.length + '):', regionsOr.map((r) => r.name));

  // Let's activate/link them
  await prisma.region.updateMany({
    where: { id: { in: regionIds } },
    data: { datasetVersionId: active!.id },
  });
  await prisma.indicator.updateMany({
    where: { key: { in: indicatorKeys } },
    data: { datasetVersionId: active!.id },
  });

  const evidence1 = await EvidenceService.buildEvidence('how many regions are currently monitored?');
  console.log('--- EVIDENCE FOR "how many regions" ---');
  console.log(JSON.stringify(evidence1, null, 2));

  const evidence2 = await EvidenceService.buildEvidence('compare Cairo and Alexandria');
  console.log('--- EVIDENCE FOR "compare Cairo and Alexandria" ---');
  console.log(JSON.stringify(evidence2, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
