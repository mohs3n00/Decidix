import { prisma } from '../database/prisma.js';
import { EvidenceService } from '../services/evidence.service.js';
import { DatasetService } from '../services/dataset.service.js';

async function main() {
  const active = await DatasetService.active();
  console.log('ACTIVE DATASET VERSION:', active?.id, active?.version, active?.filename);

  const regions = await prisma.region.findMany({
    select: {
      id: true,
      name: true,
      rank: true,
      score: true,
      datasetVersionId: true,
    },
  });
  console.log('ALL REGIONS IN DB (' + regions.length + '):', JSON.stringify(regions, null, 2));

  const history = await prisma.nationalIndexHistory.findMany({
    select: {
      id: true,
      year: true,
      score: true,
      regionsCount: true,
      datasetVersionId: true,
    },
  });
  console.log('NATIONAL INDEX HISTORY IN DB (' + history.length + '):', JSON.stringify(history, null, 2));

  const evidence1 = await EvidenceService.buildEvidence('how many regions are currently monitored?');
  console.log('EVIDENCE FOR "how many regions":', JSON.stringify(evidence1, null, 2));

  const evidence2 = await EvidenceService.buildEvidence('tell me about Cairo and Alexandria');
  console.log('EVIDENCE FOR "Cairo and Alexandria":', JSON.stringify(evidence2, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
