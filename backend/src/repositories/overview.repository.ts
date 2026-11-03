import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_OVERVIEW, SEED_REGIONS } from '../database/seed_data.js';
import { toNumber } from '../utils/decimal.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';

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
}

export class OverviewRepository {
  /**
   * Retrieves high-level national dashboard data.
   */
  static async getOverview(range: '3Y' | '5Y' | '7Y' = '7Y'): Promise<OverviewData> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV === 'production') {
        throw AppError.internal('Database connection unavailable for overview data.');
      }
      return this.getFallbackOverview(range);
    }

    try {
      // 1. Fetch latest national index record
      const latestHistory = await prisma.nationalIndexHistory.findFirst({
        orderBy: { year: 'desc' },
      });

      // 2. Fetch trend points for the requested range
      const pointsCount = range === '3Y' ? 3 : range === '5Y' ? 5 : 7;
      const historyPoints = await prisma.nationalIndexHistory.findMany({
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
        return this.getFallbackOverview(range);
      }

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
        kpis: SEED_OVERVIEW.kpis, // Authoritative baseline sector KPIs
        trend: {
          range,
          points: trendPoints.length > 0 ? trendPoints : SEED_OVERVIEW.trend_points_7y.slice(-pointsCount),
        },
        needs_attention: needsAttention.length > 0 ? needsAttention : this.getFallbackNeedsAttention(),
        ai_insight: {
          text: latestHistory.aiInsightText,
          arabic_text: latestHistory.aiInsightArabicText,
        },
      };
    } catch (error) {
      if (env.NODE_ENV === 'production') {
        throw error;
      }
      return this.getFallbackOverview(range);
    }
  }

  private static getFallbackOverview(range: '3Y' | '5Y' | '7Y'): OverviewData {
    const pointsCount = range === '3Y' ? 3 : range === '5Y' ? 5 : 7;
    return {
      as_of: SEED_OVERVIEW.as_of,
      index: SEED_OVERVIEW.index,
      kpis: SEED_OVERVIEW.kpis,
      trend: {
        range,
        points: SEED_OVERVIEW.trend_points_7y.slice(-pointsCount),
      },
      needs_attention: this.getFallbackNeedsAttention(),
      ai_insight: SEED_OVERVIEW.ai_insight,
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
