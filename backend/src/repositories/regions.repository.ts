import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_REGIONS, SEED_OVERVIEW } from '../database/seed_data.js';
import { toNumber } from '../utils/decimal.js';
import { env, syntheticDataAllowed } from '../config/env.js';
import { AppError } from '../utils/response.js';
import { DatasetService } from '../services/dataset.service.js';

export interface MapPoint {
  id: string;
  name: string;
  arabic_name: string;
  score: number;
  priority: string;
  population: number;
  latitude: number;
  longitude: number;
  /** False when the requested sector has no stored metric and the overall score is shown instead. */
  sector_value_available?: boolean;
  score_source?: string;
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
  /** Region has no stored area value; false tells the client not to present it as measured. */
  area_available?: boolean;
  domains: Array<{
    key: string;
    label: string;
    arabic_label: string;
    score: number;
    is_measured?: boolean;
  }>;
  history: {
    region: Array<{ year: number; value: number }>;
    national: Array<{ year: number; value: number }>;
  };
  history_source?: string;
  history_is_observed?: boolean;
  ai_insight: {
    text: string;
    arabic_text: string;
  };
  data_quality: {
    score: number;
    updated_at: string;
    source?: string;
    is_official?: boolean;
  };
}

export class RegionsRepository {
  /**
   * Fetches geographic points for the interactive GIS map.
   */
  static async getMapPoints(
    sector: 'overall' | 'education' | 'healthcare' | 'economy' | 'infrastructure' = 'overall'
  ): Promise<MapPoint[]> {
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing map locations.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (!syntheticDataAllowed()) {
        throw AppError.internal('Database connection unavailable for map points.');
      }
      return this.getFallbackMapPoints(sector);
    }

    try {
      const regions = await prisma.region.findMany({
        orderBy: { rank: 'asc' },
      });

      if (regions.length === 0) {
        return [];
      }

      // Region names and coordinates in the development fixtures are fictional.
      // Do not expose map pins until an approved administrative boundary is stored.
      const mappableRegions = regions.filter((region) => region.boundaryGeojson != null);
      if (mappableRegions.length === 0) return [];

      // Sector filters must come from stored regional metrics. When no metric
      // exists for a region/sector the stored overall score is returned and the
      // value is flagged, instead of substituting a fabricated domain score.
      const sectorMetrics =
        sector === 'overall'
          ? []
          : await prisma.regionalMetric.findMany({
              where: { indicatorKey: sector },
              orderBy: { year: 'desc' },
            });
      const measuredByRegion = new Map<string, number>();
      for (const metric of sectorMetrics) {
        if (!measuredByRegion.has(metric.regionId)) {
          measuredByRegion.set(metric.regionId, toNumber(metric.value));
        }
      }

      return mappableRegions.map((region) => {
        const overall = toNumber(region.score);
        const measured = sector === 'overall' ? undefined : measuredByRegion.get(region.id);
        const score = measured ?? overall;

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
          sector_value_available: sector === 'overall' || measured !== undefined,
          score_source: measured === undefined ? 'regions.score' : `regional_metrics.${sector}`,
        };
      });
    } catch (error) {
      if (!syntheticDataAllowed()) {
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
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing regions.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (!syntheticDataAllowed()) {
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
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing regions.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (!syntheticDataAllowed()) {
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

      // Only stored regional metrics may provide observed history or domain
      // values. Anything else is labelled as derived and illustrative.
      const metricRows = await prisma.regionalMetric.findMany({
        where: { regionId: normalizedId },
        orderBy: { year: 'asc' },
      });
      const latestValue = (key: string): number | undefined => {
        const rows = metricRows.filter((m) => m.indicatorKey === key);
        return rows.length > 0 ? toNumber(rows[rows.length - 1].value) : undefined;
      };
      const observedHistory = metricRows
        .filter((m) => m.indicatorKey === 'development_index')
        .map((m) => ({ year: m.year, value: toNumber(m.value) }));

      const derivedHistory = [
        { year: 2019, value: Number((baseScore + 1.4).toFixed(1)) },
        { year: 2020, value: Number((baseScore + 2.8).toFixed(1)) },
        { year: 2021, value: Number((baseScore + 3.6).toFixed(1)) },
        { year: 2022, value: Number((baseScore + 3.0).toFixed(1)) },
        { year: 2023, value: Number((baseScore + 2.1).toFixed(1)) },
        { year: 2024, value: Number((baseScore + 0.8).toFixed(1)) },
        { year: 2025, value: Number(baseScore.toFixed(1)) },
      ];

      const domains = [
        { key: 'education', label: 'Education', arabic_label: 'التعليم', measured: latestValue('education'), synthetic: fallback?.domains.education },
        { key: 'healthcare', label: 'Healthcare', arabic_label: 'الرعاية الصحية', measured: latestValue('healthcare'), synthetic: fallback?.domains.healthcare },
        { key: 'economy', label: 'Economy & jobs', arabic_label: 'الاقتصاد والوظائف', measured: latestValue('economy'), synthetic: fallback?.domains.economy },
        { key: 'infrastructure', label: 'Infrastructure', arabic_label: 'البنية التحتية', measured: latestValue('infrastructure'), synthetic: fallback?.domains.infrastructure },
      ].map((d) => ({
        key: d.key,
        label: d.label,
        arabic_label: d.arabic_label,
        score: d.measured ?? d.synthetic ?? baseScore,
        is_measured: d.measured !== undefined,
      }));

      const weakest = [...domains].sort((a, b) => a.score - b.score)[0];
      const gap = Number((baseScore - weakest.score).toFixed(1));

      const metadata = await prisma.datasetMetadata.findMany();
      const avgCompleteness =
        metadata.length > 0
          ? Number(
              (
                metadata.reduce((sum, d) => sum + toNumber(d.completenessPct), 0) /
                metadata.length
              ).toFixed(1)
            )
          : 0;

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
        area_km2: 0,
        area_available: false,
        domains,
        history: {
          region: observedHistory.length > 0 ? observedHistory : derivedHistory,
          national: SEED_OVERVIEW.trend_points_7y,
        },
        history_source:
          observedHistory.length > 0 ? 'regional_metrics.development_index' : 'derived_illustrative',
        history_is_observed: observedHistory.length > 0,
        ai_insight: {
          text: `${weakest.label} is the lowest scoring domain in ${region.name} at ${weakest.score}/100, ${gap} points below the regional index. This is a descriptive comparison of stored values, not a validated forecast.`,
          arabic_text: `${weakest.arabic_label} هو أدنى قطاع في ${region.arabicName} بمقدار ${weakest.score}/100، أي أقل بـ ${gap} نقطة عن مؤشر المنطقة. هذا وصف مقارن للقيم المخزنة وليس توقعاً معتمداً.`,
        },
        data_quality: {
          score: avgCompleteness,
          updated_at: region.updatedAt.toISOString(),
          source: 'dataset_metadata.completeness_pct',
          is_official: false,
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
    // Fixture coordinates are placeholders and must never become map pins.
    return [];
  }

  private static getFallbackRegions(params: {
    q?: string;
    priority?: string;
    page: number;
    per_page: number;
  }): { items: RegionListItem[]; total: number } {
    if (!syntheticDataAllowed()) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing regions.',
        'DATASET_NOT_CONNECTED'
      );
    }
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
    if (!syntheticDataAllowed()) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing regions.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const region = SEED_REGIONS.find((r) => r.id === id);
    if (!region) {
      throw AppError.notFound(`Region '${id}' not found`);
    }

    const baseScore = region.score;
    const domains = [
      { key: 'education', label: 'Education', arabic_label: 'التعليم', score: region.domains.education },
      { key: 'healthcare', label: 'Healthcare', arabic_label: 'الرعاية الصحية', score: region.domains.healthcare },
      { key: 'economy', label: 'Economy & jobs', arabic_label: 'الاقتصاد والوظائف', score: region.domains.economy },
      { key: 'infrastructure', label: 'Infrastructure', arabic_label: 'البنية التحتية', score: region.domains.infrastructure },
    ].map((d) => ({ ...d, is_measured: false }));

    const weakest = [...domains].sort((a, b) => a.score - b.score)[0];
    const gap = Number((baseScore - weakest.score).toFixed(1));

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
      area_km2: 0,
      area_available: false,
      domains,
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
      history_source: 'derived_illustrative_synthetic_baseline',
      history_is_observed: false,
      ai_insight: {
        text: `Synthetic baseline: ${weakest.label} is the lowest domain in ${region.name} at ${weakest.score}/100 (${gap} points below the synthetic index). Illustrative comparison only, not a validated forecast.`,
        arabic_text: `خط أساس تجريبي: ${weakest.arabic_label} هو أدنى قطاع في ${region.arabic_name} بمقدار ${weakest.score}/100 (أقل بـ ${gap} نقطة عن المؤشر التجريبي). مقارنة توضيحية فقط وليست توقعاً معتمداً.`,
      },
      data_quality: {
        score: 0,
        updated_at: new Date(0).toISOString(),
        source: 'unavailable_in_synthetic_fallback',
        is_official: false,
      },
    };
  }
}
