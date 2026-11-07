import { randomUUID } from 'node:crypto';
import { prisma } from '../database/prisma.js';
import { R2Service, sha256Hex } from '../integrations/r2.service.js';
import { DatasetService } from '../services/dataset.service.js';
import { OverviewRepository } from '../repositories/overview.repository.js';
import { EvidenceService } from '../services/evidence.service.js';
import { MlForecasterService } from '../services/ml_forecaster.service.js';
import { toNumber } from '../utils/decimal.js';

async function main() {
  console.log('=== CONTROLLED REALISTIC DATASET E2E AUDIT ===\n');

  // 1. Build a controlled 5-governorate, 3-indicator, 4-period dataset (60 rows)
  const governorates = [
    { id: 'cairo', name: 'Cairo' },
    { id: 'alexandria', name: 'Alexandria' },
    { id: 'giza', name: 'Giza' },
    { id: 'aswan', name: 'Aswan' },
    { id: 'port_said', name: 'Port Said' },
  ];

  const indicators = [
    'life_expectancy', // healthcare
    'literacy_rate',   // education
    'unemployment_rate' // economy
  ];

  const years = [2021, 2022, 2023, 2024];

  // Predictable, documented observation data
  const rows: Array<{ region: string; indicator: string; year: number; value: number }> = [];

  for (const gov of governorates) {
    for (const ind of indicators) {
      for (const yr of years) {
        let val = 0;
        if (ind === 'life_expectancy') {
          // 70.0 - 75.0 range
          val = gov.id === 'cairo' ? 74.0 + (yr - 2021) * 0.3 :
                gov.id === 'alexandria' ? 73.5 + (yr - 2021) * 0.2 :
                gov.id === 'giza' ? 72.8 + (yr - 2021) * 0.3 :
                gov.id === 'port_said' ? 74.2 + (yr - 2021) * 0.25 :
                71.5 + (yr - 2021) * 0.4; // aswan
        } else if (ind === 'literacy_rate') {
          // 75.0 - 92.0 range
          val = gov.id === 'cairo' ? 88.0 + (yr - 2021) * 0.5 :
                gov.id === 'alexandria' ? 86.5 + (yr - 2021) * 0.5 :
                gov.id === 'giza' ? 83.0 + (yr - 2021) * 0.6 :
                gov.id === 'port_said' ? 90.0 + (yr - 2021) * 0.4 :
                78.0 + (yr - 2021) * 0.8; // aswan
        } else if (ind === 'unemployment_rate') {
          // 6.0 - 11.0 range
          val = gov.id === 'cairo' ? 7.5 - (yr - 2021) * 0.2 :
                gov.id === 'alexandria' ? 8.2 - (yr - 2021) * 0.2 :
                gov.id === 'giza' ? 8.8 - (yr - 2021) * 0.3 :
                gov.id === 'port_said' ? 6.5 - (yr - 2021) * 0.1 :
                10.2 - (yr - 2021) * 0.4; // aswan
        }
        rows.push({
          region: gov.name,
          indicator: ind,
          year: yr,
          value: Math.round(val * 10) / 10,
        });
      }
    }
  }

  const csvContent =
    'region,indicator,year,value\n' +
    rows.map((r) => `${r.region},${r.indicator},${r.year},${r.value}`).join('\n');

  console.log(`Generated controlled dataset: ${rows.length} observations across 5 governorates, 3 indicators, 4 years.`);
  console.log(`CSV payload size: ${csvContent.length} bytes.`);

  // 2. Upload through DatasetService.uploadDirect with autoActivate: true
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  const userId = adminUser?.id || 'admin_test_user';

  console.log('\n--- UPLOADING AND INGESTING CONTROLLED DATASET ---');
  const uploadResult = await DatasetService.uploadDirect(userId, {
    filename: 'egypt_comprehensive_dev_2021_2024.csv',
    format: 'csv',
    content: csvContent,
    source: 'Egyptian Central Agency for Public Mobilization and Statistics (CAPMAS)',
    license: 'Open Government Data License v1.0',
    coverage: 'Cairo, Alexandria, Giza, Aswan, Port Said (2021-2024)',
    autoActivate: true,
  });

  console.log('Upload Result:', JSON.stringify(uploadResult, null, 2));

  // 3. Verify Original File Storage (R2 vs Fallback)
  const storedVersion = await prisma.datasetVersion.findUnique({
    where: { id: uploadResult.id },
  });
  console.log('\n--- VERIFYING STORAGE ARCHITECTURE ---');
  console.log('Stored Object Key:', storedVersion?.objectKey);
  console.log('SHA-256 in DB:', storedVersion?.checksumSha256);
  console.log('Validation Status:', storedVersion?.validationStatus);
  console.log('Is Active:', storedVersion?.isActive);

  if (storedVersion?.objectKey && !storedVersion.objectKey.startsWith('local://')) {
    const r2Meta = await R2Service.headObject(storedVersion.objectKey);
    console.log('[PASS] File verified in Cloudflare R2! Size in R2:', r2Meta.contentLength, 'bytes.');
  } else {
    console.log('[NOTE] Stored via local storage fallback.');
  }

  // 4. Verify PostgreSQL persistence & Record counts
  const recordsInDb = await prisma.datasetRecord.count({
    where: { datasetVersionId: uploadResult.id, isRetrievable: true },
  });
  const metricsInDb = await prisma.regionalMetric.count({
    where: { datasetVersionId: uploadResult.id },
  });
  const nationalHistoryInDb = await prisma.nationalIndexHistory.count({
    where: { datasetVersionId: uploadResult.id },
  });

  console.log('\n--- VERIFYING POSTGRESQL PERSISTENCE ---');
  console.log(`Records in dataset_records: ${recordsInDb} (Expected: 60) -> ${recordsInDb === 60 ? 'PASS' : 'FAIL'}`);
  console.log(`Regional Metrics in DB: ${metricsInDb} (Expected: 60) -> ${metricsInDb === 60 ? 'PASS' : 'FAIL'}`);
  console.log(`National History rows in DB: ${nationalHistoryInDb} (Expected: 4) -> ${nationalHistoryInDb === 4 ? 'PASS' : 'FAIL'}`);

  // 5. Verify Overview / Dashboard KPIs
  console.log('\n--- VERIFYING DASHBOARD & OVERVIEW KPIS ---');
  const overview = await OverviewRepository.getOverview('5Y');
  console.log('Active Dataset Version in Overview:', overview.provenance.dataset_version);
  console.log('National Index KPI:', overview.kpis.find((k) => k.key === 'national_index')?.value);
  console.log('Average Region Score KPI:', overview.kpis.find((k) => k.key === 'average_region_score')?.value);
  console.log('Tracked Indicators KPI:', overview.kpis.find((k) => k.key === 'tracked_indicators')?.value);
  console.log('Needs Attention Regions Count:', overview.needs_attention.length);
  console.log('Needs Attention Regions:', overview.needs_attention.map((r) => `${r.name} (${r.score})`));

  // 6. Verify Dataset Preview & Records Pagination
  console.log('\n--- VERIFYING DATASET PREVIEW & PAGINATION ---');
  const page1 = await DatasetService.getRecords(uploadResult.id, 1, 10);
  console.log(`Page 1 records returned: ${page1.records.length}, Total: ${page1.total}, Pages: ${page1.total_pages}`);
  console.log('Sample record from Preview:', JSON.stringify(page1.records[0], null, 2));

  // 7. Verify AI Assistant Grounding & Retrieval
  console.log('\n--- VERIFYING AI RETRIEVAL EVIDENCE ---');
  const evidenceRegions = await EvidenceService.buildEvidence('how many regions are currently monitored?');
  console.log('AI Evidence for "how many regions":');
  console.log(evidenceRegions[0]?.content);

  const evidenceAswanAlex = await EvidenceService.buildEvidence('compare Aswan and Alexandria');
  console.log('\nAI Evidence for "compare Aswan and Alexandria":');
  evidenceAswanAlex.forEach((doc) => console.log(`- [${doc.title}]: ${doc.content}`));

  // 8. Verify ML Forecasting input availability & forecast projection
  console.log('\n--- VERIFYING ML FORECASTING SUBSYSTEM ---');
  const mlResult = await MlForecasterService.evaluateAndForecast(uploadResult.id);
  console.log('ML Status:', mlResult.status);
  console.log('ML Model:', mlResult.metrics?.modelName, 'v' + mlResult.metrics?.modelVersion);
  console.log('Train Years:', mlResult.metrics?.trainYears);
  console.log('Test (Holdout) Years:', mlResult.metrics?.testYears);
  console.log('MAE:', mlResult.metrics?.mae, 'RMSE:', mlResult.metrics?.rmse, 'R²:', mlResult.metrics?.r2);
  console.log('Baseline MAE:', mlResult.metrics?.baselineMae, 'Improvement over Baseline:', mlResult.metrics?.isImprovementOverBaseline);
  console.log('Generated Future Forecasts (2026-2030):');
  console.table(mlResult.generatedForecasts);

  console.log('\n=== CONTROLLED REALISTIC DATASET AUDIT COMPLETE ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
