import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { prisma, testPrismaConnection } from './prisma.js';
import { runForecastSeed } from './seed_forecasts.js';
import {
  SEED_REGIONS,
  SEED_OVERVIEW,
  SEED_PROJECTS,
  SEED_REPORTS,
  SEED_RECOMMENDATIONS,
  SEED_DATA_SOURCES,
  SEED_RAG_DOCUMENTS,
} from './seed_data.js';
import { logger } from '../utils/logger.js';

export async function runSeed(): Promise<void> {
  const isAvailable = await testPrismaConnection();
  if (!isAvailable) {
    logger.warn('Skipping Prisma database seeding: PostgreSQL is not currently reachable at DATABASE_URL.');
    return;
  }

  try {
    logger.info('Starting Prisma database seed transaction with authoritative records...');

    await prisma.$transaction(async (tx) => {
      // 1. Seed default administrative and analyst users
      const passwordHash = await bcrypt.hash('DecidixAdmin2026!', 10);
      const seedUsers = [
        { id: 'usr_admin', email: 'admin@decidix.gov', name: 'System Administrator', arabicName: 'مدير النظام', role: 'admin', department: 'National Digital Operations' },
        { id: 'usr_analyst', email: 'analyst@decidix.gov', name: 'Lead Policy Analyst', arabicName: 'كبير محللي السياسات', role: 'analyst', department: 'Regional Development Council' },
        { id: 'usr_decision_maker', email: 'decision_maker@decidix.gov', name: 'Executive Decision Maker', arabicName: 'متخذ القرار التنفيذي', role: 'decision_maker', department: 'Cabinet Secretariat' },
        { id: 'usr_planner', email: 'planner@decidix.gov', name: 'Strategic Planner', arabicName: 'مخطط استراتيجي', role: 'planner', department: 'Ministry of Economy & Planning' },
      ];

      for (const u of seedUsers) {
        await tx.user.upsert({
          where: { id: u.id },
          update: { name: u.name, arabicName: u.arabicName, role: u.role, department: u.department },
          create: { ...u, passwordHash, isActive: true },
        });
      }

      // 2. Seed 12 Regions
      for (const r of SEED_REGIONS) {
        await tx.region.upsert({
          where: { id: r.id },
          update: {
            name: r.name,
            arabicName: r.arabic_name,
            rank: r.rank,
            score: r.score,
            change: r.change,
            priority: r.priority,
            population: r.population,
            latitude: r.latitude,
            longitude: r.longitude,
          },
          create: {
            id: r.id,
            name: r.name,
            arabicName: r.arabic_name,
            rank: r.rank,
            score: r.score,
            change: r.change,
            priority: r.priority,
            population: r.population,
            latitude: r.latitude,
            longitude: r.longitude,
          },
        });
      }

      // 3. Seed Indicators
      const indicators = [
        { key: 'education', label: 'Education', arabicLabel: 'التعليم', domain: 'education', unit: 'score_100', higherIsBetter: true },
        { key: 'healthcare', label: 'Healthcare', arabicLabel: 'الرعاية الصحية', domain: 'healthcare', unit: 'score_100', higherIsBetter: true },
        { key: 'unemployment', label: 'Unemployment', arabicLabel: 'البطالة', domain: 'economy', unit: 'percent', higherIsBetter: false },
        { key: 'infrastructure', label: 'Infrastructure', arabicLabel: 'البنية التحتية', domain: 'infrastructure', unit: 'score_100', higherIsBetter: true },
      ];

      for (const ind of indicators) {
        await tx.indicator.upsert({
          where: { key: ind.key },
          update: { label: ind.label, arabicLabel: ind.arabicLabel, domain: ind.domain, unit: ind.unit, higherIsBetter: ind.higherIsBetter },
          create: ind,
        });
      }

      // 4. Seed National Index History
      const existingHistory = await tx.nationalIndexHistory.findFirst({
        where: { year: 2025, period: SEED_OVERVIEW.as_of },
      });

      if (!existingHistory) {
        await tx.nationalIndexHistory.create({
          data: {
            period: SEED_OVERVIEW.as_of,
            year: 2025,
            score: SEED_OVERVIEW.index.score,
            maxScore: SEED_OVERVIEW.index.max_score,
            change: SEED_OVERVIEW.index.change,
            comparedWith: SEED_OVERVIEW.index.compared_with,
            band: SEED_OVERVIEW.index.band,
            population: SEED_OVERVIEW.index.population,
            regionsCount: SEED_OVERVIEW.index.regions_count,
            atRiskCount: SEED_OVERVIEW.index.at_risk_count,
            aiInsightText: SEED_OVERVIEW.ai_insight.text,
            aiInsightArabicText: SEED_OVERVIEW.ai_insight.arabic_text,
          },
        });
      }

      // 5. Seed Projects
      for (const p of SEED_PROJECTS) {
        await tx.developmentProject.upsert({
          where: { id: p.id },
          update: {
            title: p.title,
            arabicTitle: p.arabic_title,
            status: p.status,
            progress: p.progress,
            budgetAmount: p.budget.amount,
            budgetCurrency: p.budget.currency,
          },
          create: {
            id: p.id,
            title: p.title,
            arabicTitle: p.arabic_title,
            regionId: p.region.region_id,
            status: p.status,
            progress: p.progress,
            budgetAmount: p.budget.amount,
            budgetCurrency: p.budget.currency,
            dueDate: p.due_date ? new Date(p.due_date) : null,
            completedAt: p.completed_at ? new Date(p.completed_at) : null,
          },
        });
      }

      // 6. Seed Citizen Reports
      for (const rep of SEED_REPORTS) {
        await tx.citizenReport.upsert({
          where: { id: rep.id },
          update: {
            title: rep.title,
            arabicTitle: rep.arabic_title,
            category: rep.category,
            status: rep.status,
            likesCount: rep.likes_count,
          },
          create: {
            id: rep.id,
            title: rep.title,
            arabicTitle: rep.arabic_title,
            category: rep.category,
            status: rep.status,
            regionId: rep.region.region_id,
            likesCount: rep.likes_count,
            createdAt: new Date(rep.created_at),
          },
        });
      }

      // 7. Seed AI Recommendations
      for (const rec of SEED_RECOMMENDATIONS) {
        await tx.aiRecommendation.upsert({
          where: { id: rec.id },
          update: {
            priority: rec.priority,
            domain: rec.domain,
            title: rec.title,
            arabicTitle: rec.arabic_title,
            summary: rec.summary,
            arabicSummary: rec.arabic_summary,
            indexImpact: rec.index_impact,
            estimatedCostAmount: rec.estimated_cost.amount,
            estimatedCostCurrency: rec.estimated_cost.currency,
            confidence: rec.confidence,
            status: rec.status,
          },
          create: {
            id: rec.id,
            priority: rec.priority,
            regionId: rec.region.region_id,
            domain: rec.domain,
            title: rec.title,
            arabicTitle: rec.arabic_title,
            summary: rec.summary,
            arabicSummary: rec.arabic_summary,
            indexImpact: rec.index_impact,
            estimatedCostAmount: rec.estimated_cost.amount,
            estimatedCostCurrency: rec.estimated_cost.currency,
            confidence: rec.confidence,
            status: rec.status,
          },
        });
      }

      // 8. Seed Dataset Metadata
      for (const s of SEED_DATA_SOURCES) {
        await tx.datasetMetadata.upsert({
          where: { id: s.id },
          update: {
            name: s.name,
            arabicName: s.arabic_name,
            originalSource: s.original_source,
            license: s.license,
            geographicCoverage: s.geographic_coverage,
            timeCoverage: s.time_coverage,
            updateFrequency: s.update_frequency,
            recordCount: s.record_count,
            completenessPct: s.completeness_pct,
            timelinessPct: s.timeliness_pct,
            accuracyPct: s.accuracy_pct,
            ageDays: s.age_days,
            status: s.status,
            lastSyncedAt: new Date(s.last_synced_at),
          },
          create: {
            id: s.id,
            name: s.name,
            arabicName: s.arabic_name,
            originalSource: s.original_source,
            license: s.license,
            geographicCoverage: s.geographic_coverage,
            timeCoverage: s.time_coverage,
            updateFrequency: s.update_frequency,
            recordCount: s.record_count,
            completenessPct: s.completeness_pct,
            timelinessPct: s.timeliness_pct,
            accuracyPct: s.accuracy_pct,
            ageDays: s.age_days,
            status: s.status,
            lastSyncedAt: new Date(s.last_synced_at),
          },
        });
      }

      // 9. Seed RAG Documents
      for (const doc of SEED_RAG_DOCUMENTS) {
        await tx.ragDocument.upsert({
          where: { id: doc.id },
          update: {
            title: doc.title,
            arabicTitle: doc.arabic_title,
            content: doc.content,
            arabicContent: doc.arabic_content,
            source: doc.source,
            category: doc.category,
            regionId: doc.region_id,
            metadata: { period: doc.period },
          },
          create: {
            id: doc.id,
            title: doc.title,
            arabicTitle: doc.arabic_title,
            content: doc.content,
            arabicContent: doc.arabic_content,
            source: doc.source,
            category: doc.category,
            regionId: doc.region_id,
            metadata: { period: doc.period },
          },
        });
      }
    }, {
      maxWait: 15000,
      timeout: 60000,
    });

    // 8. Seed ML Forecasts
    await runForecastSeed();

    logger.info('Database seeded successfully via Prisma Client transaction.');
  } catch (error) {
    logger.error('Failed to seed database via Prisma Client', error);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
