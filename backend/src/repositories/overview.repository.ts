import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_OVERVIEW, SEED_REGIONS } from '../database/seed_data.js';
import { toNumber } from '../utils/decimal.js';
import { env, syntheticDataAllowed } from '../config/env.js';
import { AppError } from '../utils/response.js';
import { SYNTHETIC_PROVENANCE, Provenance } from '../utils/provenance.js';
import { DatasetService } from '../services/dataset.service.js';

export interface OverviewData {
  as_of: string;
  index: {
    score: number;
    max_score: number;
    change: number;
    compared_with: string;
    band: string;
    regions_count: number;
    population: number;
    at_risk_count: number;
  };
  kpis: Array<{
    key: string;
    label: string;
    arabic_label: string;
    value: number;
    unit: string;
    change: number;
    higher_is_better: boolean;
    sparkline?: number[];
  }>;
  trend: {
    range: '3Y' | '5Y' | '7Y';
    points: Array<{ year: number; value: number }>;
  };
  needs_attention: Array<{
    id: string;
    name: string;
    arabic_name: string;
    score: number;
    population: number;
    priority: string;
    change: number;
  }>;
  ai_insight: {
    text: string;
    arabic_text: string;
  };
  provenance: Provenance;
}

export class OverviewRepository {
  /**
   * Retrieves high-level national dashboard data.
   */
  static async getOverview(range: '3Y' | '5Y' | '7Y' = '7Y'): Promise<OverviewData> {
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing development statistics.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (!syntheticDataAllowed()) {
        throw AppError.internal('Database connection unavailable for overview data.');
      }
      return this.getFallbackOverview(range);
    }

    try {
      const active = await DatasetService.active();
      if (!active) {
        throw AppError.unavailable(
          'No approved dataset is connected. Connect and validate a dataset before viewing development statistics.',
          'DATASET_NOT_CONNECTED'
        );
      }

      // 1. Fetch the latest national index record owned by the active version.
      const latestHistory = await prisma.nationalIndexHistory.findFirst({
        where: { datasetVersionId: active.id },
        orderBy: { year: 'desc' },
      });

      // 2. Fetch trend points for the requested range
      const pointsCount = range === '3Y' ? 3 : range === '5Y' ? 5 : 7;
      const historyPoints = await prisma.nationalIndexHistory.findMany({
        where: { datasetVersionId: active.id },
        take: pointsCount,
        orderBy: { year: 'desc' },
      });

      // Reverse so points are in ascending chronological order (e.g. 2019 to 2025)
      const trendPoints = historyPoints.reverse().map((h) => ({
        year: h.year,
        value: toNumber(h.score),
      }));

      // 3. Fetch lowest scoring regions (needs_attention: 3 lowest)
      const lowestRegions = await prisma.region.findMany({
        where: { datasetVersionId: active.id },
        take: 3,
        orderBy: { score: 'asc' },
      });

      const needsAttention = lowestRegions.map((r) => ({
        id: r.id,
        name: r.name,
        arabic_name: r.arabicName,
        score: toNumber(r.score),
        population: r.population,
        priority: r.priority,
        change: toNumber(r.change),
      }));

      if (!latestHistory) {
        if (syntheticDataAllowed()) return this.getFallbackOverview(range);
        throw AppError.unavailable(
          `Dataset ${active.version} has no national history rows.`,
          'DATASET_NOT_CONNECTED'
        );
      }

      // Batch 3 KPIs. Every value is computed from rows of the ACTIVE version:
      //  - national_index         : national_index_history.score for the latest period
      //  - average_region_score   : unweighted mean of regions.score (latest period)
      //  - regions_at_risk        : national_index_history.at_risk_count
      //  - tracked_indicators     : count of indicators tagged to this version
      //  - data_completeness      : dataset_metadata.completeness_pct for this version
      // Units: score_100, score_100, count, count, percent.
      const [allRegions, indicatorCount, metadataRow] = await Promise.all([
        prisma.region.findMany({
          where: { datasetVersionId: active.id },
          select: { score: true, change: true },
        }),
        prisma.indicator.count({ where: { datasetVersionId: active.id } }),
        prisma.datasetMetadata.findFirst({ where: { datasetVersionId: active.id } }),
      ]);
      const regionScores = allRegions.map((region) => toNumber(region.score));
      const averageRegionScore = regionScores.length
        ? regionScores.reduce((sum, value) => sum + value, 0) / regionScores.length
        : 0;
      const averageRegionChange = allRegions.length
        ? allRegions.reduce((sum, region) => sum + toNumber(region.change), 0) / allRegions.length
        : 0;
      const completeness = metadataRow ? toNumber(metadataRow.completenessPct) : null;

      const kpis: OverviewData['kpis'] = [
        {
          key: 'national_index',
          label: 'National development index',
          arabic_label: 'مؤشر التنمية الوطني',
          value: toNumber(latestHistory.score),
          unit: 'score_100',
          change: toNumber(latestHistory.change),
          higher_is_better: true,
          sparkline: trendPoints.map((point) => point.value),
        },
        {
          key: 'average_region_score',
          label: 'Average regional score',
          arabic_label: 'متوسط الدرجة الإقليمية',
          value: Number(averageRegionScore.toFixed(1)),
          unit: 'score_100',
          change: Number(averageRegionChange.toFixed(1)),
          higher_is_better: true,
          sparkline: [],
        },
        {
          key: 'regions_at_risk',
          label: 'Regions at risk',
          arabic_label: 'مناطق معرضة للخطر',
          value: latestHistory.atRiskCount,
          unit: 'count',
          change: 0,
          higher_is_better: false,
          sparkline: [],
        },
        {
          key: 'tracked_indicators',
          label: 'Tracked indicators',
          arabic_label: 'المؤشرات المتابعة',
          value: indicatorCount,
          unit: 'count',
          change: 0,
          higher_is_better: true,
          sparkline: [],
        },
        ...(completeness === null
          ? []
          : [
              {
                key: 'data_completeness',
                label: 'Data completeness',
                arabic_label: 'اكتمال البيانات',
                value: completeness,
                unit: 'percent',
                change: 0,
                higher_is_better: true,
                sparkline: [],
              },
            ]),
      ];

      return {
        as_of: latestHistory.period,
        index: {
          score: toNumber(latestHistory.score),
          max_score: toNumber(latestHistory.maxScore, 100),
          change: toNumber(latestHistory.change),
          compared_with: latestHistory.comparedWith,
          band: latestHistory.band,
          regions_count: latestHistory.regionsCount,
          population: latestHistory.population,
          at_risk_count: latestHistory.atRiskCount,
        },
        kpis,
        trend: {
          range,
          // Never backfill a verified response with seed points: an empty trend
          // is honest, a substituted one is fabricated.
          points: trendPoints,
        },
        needs_attention: needsAttention,
        ai_insight: {
          text: latestHistory.aiInsightText,
          arabic_text: latestHistory.aiInsightArabicText,
        },
        provenance: syntheticDataAllowed()
          ? SYNTHETIC_PROVENANCE
          : {
              data_classification: 'derived_calculation',
              source_classification: /synthetic|demo|test|illustrative/i.test(
                `${active.source} ${active.license} ${active.coverage}`
              )
                ? 'synthetic_demo'
                : 'official_source',
              source: active.source,
              dataset_version: active.version,
              observation_period: latestHistory.period,
              method: 'Aggregated from the active validated dataset version.',
              verification_status: 'verified',
              disclaimer_en:
                'Derived from the active validated dataset version. It is not an independent official measurement.',
              disclaimer_ar:
                'مشتقة من نسخة مجموعة البيانات الموثقة النشطة، وليست قياساً رسمياً مستقلاً.',
            },
      };
    } catch (error) {
      if (!syntheticDataAllowed()) {
        throw error;
      }
      return this.getFallbackOverview(range);
    }
  }

  private static getFallbackOverview(range: '3Y' | '5Y' | '7Y'): OverviewData {
    if (!syntheticDataAllowed()) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing development statistics.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const pointsCount = range === '3Y' ? 3 : range === '5Y' ? 5 : 7;
    return {
      as_of: SEED_OVERVIEW.as_of,
      index: SEED_OVERVIEW.index,
      kpis: [],
      trend: {
        range,
        points: SEED_OVERVIEW.trend_points_7y.slice(-pointsCount),
      },
      needs_attention: this.getFallbackNeedsAttention(),
      ai_insight: SEED_OVERVIEW.ai_insight,
      provenance: SYNTHETIC_PROVENANCE,
    };
  }

  private static getFallbackNeedsAttention() {
    return [
      SEED_REGIONS.find((r) => r.id === 'frontier'),
      SEED_REGIONS.find((r) => r.id === 'steppe'),
      SEED_REGIONS.find((r) => r.id === 'delta'),
    ]
      .filter(Boolean)
      .map((r) => ({
        id: r!.id,
        name: r!.name,
        arabic_name: r!.arabic_name,
        score: r!.score,
        population: r!.population,
        priority: r!.priority,
        change: r!.change,
      }));
  }
}
