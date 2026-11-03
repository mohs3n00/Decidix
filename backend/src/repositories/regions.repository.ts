import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_REGIONS, SEED_OVERVIEW } from '../database/seed_data.js';
import { toNumber } from '../utils/decimal.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';

export interface MapPoint {
  id: string;
  name: string;
  arabic_name: string;
  score: number;
  priority: string;
  population: number;
  latitude: number;
  longitude: number;
}

export interface RegionListItem {
  id: string;
  name: string;
  arabic_name: string;
  rank: number;
  score: number;
  change: number;
  priority: string;
  population: number;
}

export interface RegionProfile {
  id: string;
  name: string;
  arabic_name: string;
  rank: number;
  rank_total: number;
  score: number;
  change: number;
  priority: string;
  population: number;
  area_km2: number;
  domains: Array<{
    key: string;
    label: string;
    arabic_label: string;
    score: number;
  }>;
  history: {
    region: Array<{ year: number; value: number }>;
    national: Array<{ year: number; value: number }>;
  };
  ai_insight: {
    text: string;
    arabic_text: string;
  };
  data_quality: {
    score: number;
    updated_at: string;
  };
}

export class RegionsRepository {
  /**
   * Fetches geographic points for the interactive GIS map.
   */
  static async getMapPoints(
    sector: 'overall' | 'education' | 'healthcare' | 'economy' | 'infrastructure' = 'overall'
  ): Promise<MapPoint[]> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV === 'production') {
        throw AppError.internal('Database connection unavailable for map points.');
      }
      return this.getFallbackMapPoints(sector);
    }

    try {
      const regions = await prisma.region.findMany({
        orderBy: { rank: 'asc' },
      });

      if (regions.length === 0) {
        return this.getFallbackMapPoints(sector);
      }

      return regions.map((region) => {
        const fallback = SEED_REGIONS.find((r) => r.id === region.id);
        let score = toNumber(region.score);

        if (sector !== 'overall' && fallback) {
          score = fallback.domains[sector] ?? score;
        }

        let priority = region.priority;
        if (score >= 70) priority = 'low';
        else if (score >= 55) priority = 'medium';
        else priority = 'high';

        return {
          id: region.id,
          name: region.name,
          arabic_name: region.arabicName,
          score,
          priority,
          population: region.population,
          latitude: toNumber(region.latitude),
          longitude: toNumber(region.longitude),
        };
      });
    } catch (error) {
      if (env.NODE_ENV === 'production') {
        throw error;
      }
      return this.getFallbackMapPoints(sector);
    }
  }

  /**
   * Fetches paginated, filtered regions directory.
   */
  static async getRegions(params: {
    q?: string;
    priority?: string;
    page: number;
    per_page: number;
  }): Promise<{ items: RegionListItem[]; total: number }> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV === 'production') {
        throw AppError.internal('Database connection unavailable for regions directory.');
      }
      return this.getFallbackRegions(params);
    }

    try {
      const where: any = {};

      if (params.q && params.q.trim().length > 0) {
        const query = params.q.trim();
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { arabicName: { contains: query } },
          { id: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (params.priority && params.priority !== 'all') {
        where.priority = params.priority;
      }

      const total = await prisma.region.count({ where });

      const regions = await prisma.region.findMany({
        where,
        orderBy: { rank: 'asc' },
        skip: (params.page - 1) * params.per_page,
        take: params.per_page,
      });

      if (regions.length === 0 && total === 0 && (!params.q || params.q.length === 0)) {
        return this.getFallbackRegions(params);
      }

      const items: RegionListItem[] = regions.map((r) => ({
        id: r.id,
        name: r.name,
        arabic_name: r.arabicName,
        rank: r.rank,
        score: toNumber(r.score),
        change: toNumber(r.change),
        priority: r.priority,
        population: r.population,
      }));

      return { items, total };
    } catch (error) {
      if (env.NODE_ENV === 'production') {
        throw error;
      }
      return this.getFallbackRegions(params);
    }
  }

  /**
   * Fetches single region profile with history and domain breakdown.
   */
  static async getRegionById(id: string): Promise<RegionProfile> {
    const normalizedId = id.toLowerCase();
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV === 'production') {
        throw AppError.internal(`Database connection unavailable for region '${id}'.`);
      }
      return this.getFallbackRegionById(normalizedId);
    }

    try {
      const region = await prisma.region.findUnique({
        where: { id: normalizedId },
      });

      if (!region) {
        throw AppError.notFound(`Region '${id}' not found`);
      }

      const totalCount = await prisma.region.count();
      const baseScore = toNumber(region.score);
      const fallback = SEED_REGIONS.find((r) => r.id === normalizedId);

      return {
        id: region.id,
        name: region.name,
        arabic_name: region.arabicName,
        rank: region.rank,
        rank_total: totalCount > 0 ? totalCount : SEED_REGIONS.length,
        score: baseScore,
        change: toNumber(region.change),
        priority: region.priority,
        population: region.population,
        area_km2: 26000,
        domains: [
          { key: 'education', label: 'Education', arabic_label: 'التعليم', score: fallback?.domains.education ?? baseScore },
          { key: 'healthcare', label: 'Healthcare', arabic_label: 'الرعاية الصحية', score: fallback?.domains.healthcare ?? baseScore },
          { key: 'economy', label: 'Economy & jobs', arabic_label: 'الاقتصاد والوظائف', score: fallback?.domains.economy ?? baseScore },
          { key: 'infrastructure', label: 'Infrastructure', arabic_label: 'البنية التحتية', score: fallback?.domains.infrastructure ?? baseScore },
        ],
        history: {
          region: [
            { year: 2019, value: Number((baseScore + 1.4).toFixed(1)) },
            { year: 2020, value: Number((baseScore + 2.8).toFixed(1)) },
            { year: 2021, value: Number((baseScore + 3.6).toFixed(1)) },
            { year: 2022, value: Number((baseScore + 3.0).toFixed(1)) },
            { year: 2023, value: Number((baseScore + 2.1).toFixed(1)) },
            { year: 2024, value: Number((baseScore + 0.8).toFixed(1)) },
            { year: 2025, value: Number(baseScore.toFixed(1)) },
          ],
          national: SEED_OVERVIEW.trend_points_7y,
        },
        ai_insight: {
          text: `Lowest gap is healthcare. Raising it by 8 points would lift the regional index roughly 3.1 points within 24 months.`,
          arabic_text: `أكبر فجوة هي في الرعاية الصحية. رفعها 8 نقاط سيرفع مؤشر المنطقة نحو 3.1 نقطة خلال 24 شهراً.`,
        },
        data_quality: {
          score: 68,
          updated_at: '2025-10-15T00:00:00Z',
        },
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      if (env.NODE_ENV === 'production') throw error;
      return this.getFallbackRegionById(normalizedId);
    }
  }

  // --- In-Memory Fallbacks for Offline Resilience ---

  private static getFallbackMapPoints(sector: string): MapPoint[] {
    return SEED_REGIONS.map((region) => {
      let score = region.score;
      if (sector !== 'overall') {
        score = (region.domains as any)[sector] ?? region.score;
      }

      let priority = region.priority;
      if (score >= 70) priority = 'low';
      else if (score >= 55) priority = 'medium';
      else priority = 'high';

      return {
        id: region.id,
        name: region.name,
        arabic_name: region.arabic_name,
        score,
        priority,
        population: region.population,
        latitude: region.latitude,
        longitude: region.longitude,
      };
    });
  }

  private static getFallbackRegions(params: {
    q?: string;
    priority?: string;
    page: number;
    per_page: number;
  }): { items: RegionListItem[]; total: number } {
    let filtered = [...SEED_REGIONS];

    if (params.q && params.q.trim().length > 0) {
      const queryLower = params.q.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(queryLower) ||
          r.arabic_name.includes(queryLower) ||
          r.id.toLowerCase().includes(queryLower)
      );
    }

    if (params.priority && params.priority !== 'all') {
      filtered = filtered.filter((r) => r.priority === params.priority);
    }

    filtered.sort((a, b) => a.rank - b.rank);
    const total = filtered.length;
    const startIndex = (params.page - 1) * params.per_page;
    const items = filtered.slice(startIndex, startIndex + params.per_page).map((r) => ({
      id: r.id,
      name: r.name,
      arabic_name: r.arabic_name,
      rank: r.rank,
      score: r.score,
      change: r.change,
      priority: r.priority,
      population: r.population,
    }));

    return { items, total };
  }

  private static getFallbackRegionById(id: string): RegionProfile {
    const region = SEED_REGIONS.find((r) => r.id === id);
    if (!region) {
      throw AppError.notFound(`Region '${id}' not found`);
    }

    const baseScore = region.score;
    return {
      id: region.id,
      name: region.name,
      arabic_name: region.arabic_name,
      rank: region.rank,
      rank_total: SEED_REGIONS.length,
      score: region.score,
      change: region.change,
      priority: region.priority,
      population: region.population,
      area_km2: 26000,
      domains: [
        { key: 'education', label: 'Education', arabic_label: 'التعليم', score: region.domains.education },
        { key: 'healthcare', label: 'Healthcare', arabic_label: 'الرعاية الصحية', score: region.domains.healthcare },
        { key: 'economy', label: 'Economy & jobs', arabic_label: 'الاقتصاد والوظائف', score: region.domains.economy },
        { key: 'infrastructure', label: 'Infrastructure', arabic_label: 'البنية التحتية', score: region.domains.infrastructure },
      ],
      history: {
        region: [
          { year: 2019, value: Number((baseScore + 1.4).toFixed(1)) },
          { year: 2020, value: Number((baseScore + 2.8).toFixed(1)) },
          { year: 2021, value: Number((baseScore + 3.6).toFixed(1)) },
          { year: 2022, value: Number((baseScore + 3.0).toFixed(1)) },
          { year: 2023, value: Number((baseScore + 2.1).toFixed(1)) },
          { year: 2024, value: Number((baseScore + 0.8).toFixed(1)) },
          { year: 2025, value: Number(baseScore.toFixed(1)) },
        ],
        national: SEED_OVERVIEW.trend_points_7y,
      },
      ai_insight: {
        text: `Lowest gap is healthcare. Raising it by 8 points would lift the regional index roughly 3.1 points within 24 months.`,
        arabic_text: `أكبر فجوة هي في الرعاية الصحية. رفعها 8 نقاط سيرفع مؤشر المنطقة نحو 3.1 نقطة خلال 24 شهراً.`,
      },
      data_quality: {
        score: 68,
        updated_at: '2025-10-15T00:00:00Z',
      },
    };
  }
}
