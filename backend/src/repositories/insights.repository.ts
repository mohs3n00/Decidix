import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_REGIONS, SEED_DATA_SOURCES, SEED_OVERVIEW } from '../database/seed_data.js';
import { toNumber } from '../utils/decimal.js';
import { compositeScore, finiteMean, normalizeToScore } from '../utils/analytics.js';
import { env, syntheticDataAllowed } from '../config/env.js';
import { AppError } from '../utils/response.js';
import { DatasetService } from '../services/dataset.service.js';

const SECTOR_CONFIGS: Record<string, {
  label: string;
  arabic_label: string;
  index: { score: number; change: number };
  kpis: Array<{ key: string; label: string; arabic_label: string; value: number; unit: string; change: number; higher_is_better: boolean }>;
  breakdown: { title: string; arabic_title: string; unit: string; bars: Array<{ key: string; label: string; arabic_label: string; value: number }> };
  indicators: Array<{ key: string; label: string; arabic_label: string; value: number; unit: string }>;
  ai_insight: { text: string; arabic_text: string };
}> = {
  education: {
    label: 'Education',
    arabic_label: 'التعليم',
    index: { score: 74.2, change: 1.8 },
    kpis: [
      { key: 'literacy_rate', label: 'Literacy rate', arabic_label: 'معدل القراءة والكتابة', value: 96.2, unit: 'percent', change: 0.6, higher_is_better: true },
      { key: 'school_enrolment', label: 'School enrolment', arabic_label: 'الالتحاق بالمدارس', value: 91.8, unit: 'percent', change: 1.4, higher_is_better: true },
      { key: 'teacher_pupil', label: 'Teacher : pupil', arabic_label: 'المعلم : الطالب', value: 19, unit: 'pupils_per_teacher', change: -2.1, higher_is_better: false },
      { key: 'tertiary_completion', label: 'Tertiary completion', arabic_label: 'إتمام التعليم العالي', value: 34.5, unit: 'percent', change: 3.2, higher_is_better: true },
    ],
    breakdown: {
      title: 'Enrolment by level',
      arabic_title: 'الالتحاق حسب المرحلة',
      unit: 'percent',
      bars: [
        { key: 'pre', label: 'Pre', arabic_label: 'ما قبل', value: 48 },
        { key: 'primary', label: 'Prim', arabic_label: 'ابتدائي', value: 62 },
        { key: 'secondary', label: 'Sec', arabic_label: 'ثانوي', value: 71 },
        { key: 'vocational', label: 'Voc', arabic_label: 'مهني', value: 79 },
        { key: 'university', label: 'Uni', arabic_label: 'جامعي', value: 88 },
      ],
    },
    indicators: [
      { key: 'primary_completion', label: 'Primary completion', arabic_label: 'إتمام المرحلة الابتدائية', value: 94, unit: 'percent' },
      { key: 'secondary_completion', label: 'Secondary completion', arabic_label: 'إتمام المرحلة الثانوية', value: 81, unit: 'percent' },
      { key: 'stem_graduates', label: 'STEM graduates', arabic_label: 'خريجو العلوم والتقنية', value: 43, unit: 'percent' },
      { key: 'digital_classrooms', label: 'Digital classrooms', arabic_label: 'الفصول الرقمية', value: 58, unit: 'percent' },
    ],
    ai_insight: {
      text: 'Tertiary completion rose 3.2% while teacher-to-pupil ratios stabilized at 19 across northern districts.',
      arabic_text: 'ارتفع معدل إتمام التعليم العالي بنسبة 3.2% مع استقرار نسبة المعلمين إلى الطلاب عند 19 في المناطق الشمالية.',
    },
  },
  healthcare: {
    label: 'Healthcare',
    arabic_label: 'الرعاية الصحية',
    index: { score: 66.9, change: 1.2 },
    kpis: [
      { key: 'life_expectancy', label: 'Life expectancy', arabic_label: 'متوسط العمر المتوقع', value: 74.8, unit: 'years', change: 0.4, higher_is_better: true },
      { key: 'physicians_density', label: 'Doctors / 1k', arabic_label: 'أطباء / ألف', value: 2.8, unit: 'per_thousand', change: 0.2, higher_is_better: true },
      { key: 'bed_capacity', label: 'Beds / 1k', arabic_label: 'أسرة / ألف', value: 3.1, unit: 'per_thousand', change: -0.1, higher_is_better: true },
      { key: 'maternal_mortality', label: 'Maternal mortality', arabic_label: 'وفيات الأمهات', value: 12.4, unit: 'per_mille', change: -1.1, higher_is_better: false },
    ],
    breakdown: {
      title: 'Facility distribution',
      arabic_title: 'توزيع المرافق',
      unit: 'percent',
      bars: [
        { key: 'primary', label: 'Primary clinics', arabic_label: 'عيادات أولية', value: 54 },
        { key: 'general', label: 'General hospitals', arabic_label: 'مستشفيات عامة', value: 28 },
        { key: 'specialized', label: 'Specialized', arabic_label: 'تخصصية', value: 18 },
      ],
    },
    indicators: [
      { key: 'immunization_rate', label: 'Child immunization', arabic_label: 'تطعيم الأطفال', value: 96, unit: 'percent' },
      { key: 'emergency_response', label: 'Emergency response time', arabic_label: 'زمن الاستجابة للطوارئ', value: 14, unit: 'minutes' },
    ],
    ai_insight: {
      text: 'Frontier and Steppe lack specialized maternity beds; mobile medical units have mitigated early mortality by 12%.',
      arabic_text: 'تفتقر المنطقة الحدودية والسهوب إلى أسرّة الولادة التخصصية؛ وساهمت العيادات المتنقلة في تقليص وفيات الأمهات بنسبة 12%.',
    },
  },
  economy: {
    label: 'Economy & jobs',
    arabic_label: 'الاقتصاد والوظائف',
    index: { score: 64.1, change: 0.8 },
    kpis: [
      { key: 'unemployment', label: 'Unemployment', arabic_label: 'البطالة', value: 6.1, unit: 'percent', change: -0.4, higher_is_better: false },
      { key: 'labor_participation', label: 'Participation', arabic_label: 'المشاركة الاقتصادية', value: 58.2, unit: 'percent', change: 1.1, higher_is_better: true },
      { key: 'gdp_per_capita', label: 'GDP per capita', arabic_label: 'نصيب الفرد من الناتج', value: 14200, unit: 'usd', change: 2.3, higher_is_better: true },
      { key: 'sme_growth', label: 'SME growth', arabic_label: 'نمو المنشآت الصغيرة', value: 8.4, unit: 'percent', change: 1.5, higher_is_better: true },
    ],
    breakdown: {
      title: 'Employment by sector',
      arabic_title: 'التوظيف حسب القطاع',
      unit: 'percent',
      bars: [
        { key: 'services', label: 'Services', arabic_label: 'خدمات', value: 46 },
        { key: 'industry', label: 'Industry', arabic_label: 'صناعة', value: 26 },
        { key: 'agriculture', label: 'Agri', arabic_label: 'زراعة', value: 16 },
        { key: 'public', label: 'Public', arabic_label: 'حكومي', value: 12 },
      ],
    },
    indicators: [
      { key: 'female_participation', label: 'Female participation', arabic_label: 'مشاركة المرأة', value: 37, unit: 'percent' },
      { key: 'digital_adoption', label: 'Business digital adoption', arabic_label: 'التحول الرقمي للأعمال', value: 64, unit: 'percent' },
    ],
    ai_insight: {
      text: 'Central Capital accounts for 44% of new tech SME creation. Delta agricultural diversification is showing positive early yield.',
      arabic_text: 'تستحوذ العاصمة المركزية على 44% من المنشآت التقنية الناشئة. يُظهر التنويع الزراعي بالدلتا مؤشرات أولية إيجابية.',
    },
  },
  infrastructure: {
    label: 'Infrastructure',
    arabic_label: 'البنية التحتية',
    index: { score: 63.5, change: 0.9 },
    kpis: [
      { key: 'paved_roads', label: 'Paved road coverage', arabic_label: 'شبكة الطرق المعبدة', value: 84.6, unit: 'percent', change: 1.2, higher_is_better: true },
      { key: 'potable_water', label: 'Potable water access', arabic_label: 'مياه الشرب النظيفة', value: 89.1, unit: 'percent', change: 0.8, higher_is_better: true },
      { key: 'grid_reliability', label: 'Power reliability', arabic_label: 'موثوقية شبكة الكهرباء', value: 92.4, unit: 'percent', change: 0.5, higher_is_better: true },
      { key: 'broadband_coverage', label: 'Broadband', arabic_label: 'النطاق العريض', value: 76.2, unit: 'percent', change: 4.1, higher_is_better: true },
    ],
    breakdown: {
      title: 'Infrastructure investment share',
      arabic_title: 'توزيع الاستثمار في البنية التحتية',
      unit: 'percent',
      bars: [
        { key: 'roads', label: 'Roads & transport', arabic_label: 'طرق ونقل', value: 40 },
        { key: 'water', label: 'Water & sanitation', arabic_label: 'مياه وصرف', value: 28 },
        { key: 'energy', label: 'Energy', arabic_label: 'طاقة', value: 20 },
        { key: 'telecom', label: 'Telecom', arabic_label: 'اتصالات', value: 12 },
      ],
    },
    indicators: [
      { key: 'sanitation_access', label: 'Sanitation access', arabic_label: 'الصرف الصحي الآمن', value: 78, unit: 'percent' },
      { key: 'renewable_share', label: 'Renewable grid share', arabic_label: 'حصة الطاقة المتجددة', value: 18, unit: 'percent' },
    ],
    ai_insight: {
      text: 'Water sanitation in rural Delta and Steppe remains prioritized; highway bridge expansions are 82% on schedule.',
      arabic_text: 'تطهير المياه والصرف الصحي بريف الدلتا والسهوب يحظى بالأولوية؛ مشاريع توسعة الجسور السريعة مكتملة بنسبة 82%.',
    },
  },
};

export class InsightsRepository {
  private static async requireVerifiedDataset() {
    if (!(await DatasetService.hasApprovedActiveDataset()) || !(await testPrismaConnection())) {
      throw AppError.unavailable(
        'No verified analytical dataset is available for this output.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const active = await DatasetService.active();
    if (!active) {
      throw AppError.unavailable(
        'No verified analytical dataset is available for this output.',
        'DATASET_NOT_CONNECTED'
      );
    }
    return active;
  }

  private static async assertDatasetAvailable(): Promise<void> {
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing insights.',
        'DATASET_NOT_CONNECTED'
      );
    }
  }

  /**
   * Batch 2 provenance guard: a version whose source/licence says synthetic,
   * demo, test or illustrative must never be returned as official data.
   * (The verified paths previously hard-coded `is_official: true`.)
   */
  private static isSyntheticDataset(active: {
    source: string;
    license: string;
    coverage: string;
  }): boolean {
    return /(synthetic|demo|test|illustrative)/i.test(
      `${active.source} ${active.license} ${active.coverage}`
    );
  }

  /**
   * Fetches sector deep-dive analytics.
   */
  static async getSectorData(sector: 'education' | 'healthcare' | 'economy' | 'infrastructure') {
    if (!syntheticDataAllowed()) {
      return this.getVerifiedSectorData(sector);
    }
    await this.assertDatasetAvailable();
    const config = SECTOR_CONFIGS[sector];
    const isDbReady = await testPrismaConnection();

    let sorted = [...SEED_REGIONS];
    if (isDbReady) {
      try {
        const regions = await prisma.region.findMany({
          orderBy: { rank: 'asc' },
        });
        if (regions.length > 0) {
          sorted = regions.map((r) => {
            const fallback = SEED_REGIONS.find((sr) => sr.id === r.id);
            return {
              id: r.id,
              name: r.name,
              arabic_name: r.arabicName,
              score: toNumber(r.score),
              domains: fallback?.domains ?? { education: toNumber(r.score), healthcare: toNumber(r.score), economy: toNumber(r.score), infrastructure: toNumber(r.score) },
            } as any;
          });
        }
      } catch (err) {
        if (env.NODE_ENV === 'production') throw err;
      }
    }

    sorted.sort((a, b) => (b.domains[sector] ?? b.score) - (a.domains[sector] ?? a.score));
    const top = sorted.slice(0, 5).map((r, i) => ({
      rank: i + 1,
      region_id: r.id,
      name: r.name,
      arabic_name: r.arabic_name,
      score: r.domains[sector] ?? r.score,
    }));
    const bottom = sorted.slice(-5).reverse().map((r, i) => ({
      rank: sorted.length - i,
      region_id: r.id,
      name: r.name,
      arabic_name: r.arabic_name,
      score: r.domains[sector] ?? r.score,
    }));

    return {
      sector,
      data_classification: 'synthetic_reference_model',
      is_official: false,
      index: config.index,
      kpis: config.kpis,
      trend: { points: SEED_OVERVIEW.trend_points_7y },
      breakdown: config.breakdown,
      indicators: config.indicators,
      ranking: { top, bottom },
      ai_insight: config.ai_insight,
    };
  }

  /**
   * Compares 2 regions side by side.
   */
  static async getComparison(aId: string, bId: string) {
    if (!syntheticDataAllowed()) {
      return this.getVerifiedComparison(aId, bId);
    }
    await this.assertDatasetAvailable();
    const isDbReady = await testPrismaConnection();

    let regA = SEED_REGIONS.find((r) => r.id === aId.toLowerCase());
    let regB = SEED_REGIONS.find((r) => r.id === bId.toLowerCase());

    if (isDbReady) {
      try {
        const dbA = await prisma.region.findUnique({ where: { id: aId.toLowerCase() } });
        const dbB = await prisma.region.findUnique({ where: { id: bId.toLowerCase() } });
        if (dbA && regA) {
          regA = { ...regA, score: toNumber(dbA.score), name: dbA.name, arabic_name: dbA.arabicName };
        }
        if (dbB && regB) {
          regB = { ...regB, score: toNumber(dbB.score), name: dbB.name, arabic_name: dbB.arabicName };
        }
      } catch (err) {
        if (env.NODE_ENV === 'production') throw err;
      }
    }

    if (!regA || !regB) {
      throw AppError.notFound(`One or both regions ('${aId}', '${bId}') could not be found.`);
    }

    const diff = Math.abs(regA.score - regB.score);
    const leader = regA.score >= regB.score ? regA : regB;
    const trailer = regA.score >= regB.score ? regB : regA;

    const domainMetrics = [
      { key: 'education', label: 'Education', arabic_label: 'التعليم', score_a: regA.domains.education, score_b: regB.domains.education },
      { key: 'healthcare', label: 'Healthcare', arabic_label: 'الرعاية الصحية', score_a: regA.domains.healthcare, score_b: regB.domains.healthcare },
      { key: 'economy', label: 'Economy', arabic_label: 'الاقتصاد', score_a: regA.domains.economy, score_b: regB.domains.economy },
      { key: 'infrastructure', label: 'Infrastructure', arabic_label: 'البنية التحتية', score_a: regA.domains.infrastructure, score_b: regB.domains.infrastructure },
    ];
    const widest = [...domainMetrics].sort(
      (x, y) => Math.abs(y.score_a - y.score_b) - Math.abs(x.score_a - x.score_b)
    )[0];
    const widestGap = Number(Math.abs(widest.score_a - widest.score_b).toFixed(1));

    return {
      a: { id: regA.id, name: regA.name, arabic_name: regA.arabic_name, score: regA.score },
      b: { id: regB.id, name: regB.name, arabic_name: regB.arabic_name, score: regB.score },
      metrics: [
        { key: 'overall', label: 'Overall', arabic_label: 'الإجمالي', score_a: regA.score, score_b: regB.score },
        ...domainMetrics,
      ],
      gap_analysis: {
        text: `${leader.name} leads ${trailer.name} by ${diff} index points. The widest domain gap is ${widest.label} at ${widestGap} points.`,
        arabic_text: `${leader.arabic_name} على ${trailer.arabic_name} بفارق ${diff} نقطة في المؤشر. وأوسع فجوة قطاعية في ${widest.arabic_label} بفارق ${widestGap} نقطة.`,
      },
    };
  }

  /**
   * Fetches historical milestones and national trend.
   */
  static async getHistorical(_sector = 'overall', range: '3Y' | '5Y' | '7Y' = '7Y') {
    if (!syntheticDataAllowed()) {
      return this.getVerifiedHistorical(_sector, range);
    }
    await this.assertDatasetAvailable();
    const count = range === '3Y' ? 3 : range === '5Y' ? 5 : 7;
    const points = SEED_OVERVIEW.trend_points_7y.slice(-count);
    const first = points[0];
    const last = points[points.length - 1];
    const annualChange =
      points.length > 1 && last && first
        ? Number(((last.value - first.value) / (points.length - 1)).toFixed(2))
        : 0;

    return {
      range,
      points,
      annual_change: annualChange,
      // No verified policy events are ingested for this dataset, so the list is
      // intentionally empty instead of being populated with invented events.
      milestones: [],
      milestones_note:
        'No verified policy milestone records are ingested; this list is intentionally empty rather than populated with invented events.',
      data_classification: 'synthetic',
      is_official: false,
    };
  }

  /**
   * Fetches urgency-ranked priority queue.
   */
  static async getPriorityQueue(limit = 10) {
    if (!syntheticDataAllowed()) {
      return this.getVerifiedPriorityQueue(limit);
    }
    await this.assertDatasetAvailable();
    const isDbReady = await testPrismaConnection();
    let regions = [...SEED_REGIONS];

    if (isDbReady) {
      try {
        const dbRegions = await prisma.region.findMany({ orderBy: { score: 'asc' } });
        if (dbRegions.length > 0) {
          regions = dbRegions.map((r) => {
            const fallback = SEED_REGIONS.find((sr) => sr.id === r.id);
            return {
              id: r.id,
              name: r.name,
              arabic_name: r.arabicName,
              score: toNumber(r.score),
              priority: r.priority,
              domains: fallback?.domains ?? { healthcare: toNumber(r.score) },
            } as any;
          });
        }
      } catch (err) {
        if (env.NODE_ENV === 'production') throw err;
      }
    }

    const sortedByNeed = regions
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map((r, idx) => ({
        rank: idx + 1,
        region_id: r.id,
        name: r.name,
        arabic_name: r.arabic_name,
        priority: r.priority,
        need_score: Math.round(100 - r.score),
        weakest_domain: {
          key: 'healthcare',
          label: 'Healthcare',
          arabic_label: 'الرعاية الصحية',
          score: r.domains.healthcare ?? r.score,
        },
      }));

    return {
      summary: {
        high: regions.filter((r) => r.priority === 'high' || r.priority === 'critical').length,
        medium: regions.filter((r) => r.priority === 'medium').length,
        low: regions.filter((r) => r.priority === 'low').length,
      },
      queue: sortedByNeed,
    };
  }

  /**
   * Fetches dataset provenance and data quality report.
   */
  static async getDataQuality() {
    if (!syntheticDataAllowed()) {
      return this.getVerifiedDataQuality();
    }
    await this.assertDatasetAvailable();
    const isDbReady = await testPrismaConnection();
    let sources = SEED_DATA_SOURCES;

    if (isDbReady) {
      try {
        const dbSources = await prisma.datasetMetadata.findMany();
        if (dbSources.length > 0) {
          sources = dbSources.map((s) => ({
            id: s.id,
            name: s.name,
            arabic_name: s.arabicName,
            original_source: s.originalSource,
            license: s.license,
            geographic_coverage: s.geographicCoverage,
            time_coverage: s.timeCoverage,
            update_frequency: s.updateFrequency,
            record_count: s.recordCount,
            completeness_pct: toNumber(s.completenessPct),
            timeliness_pct: toNumber(s.timelinessPct),
            accuracy_pct: toNumber(s.accuracyPct),
            age_days: s.ageDays,
            status: s.status as any,
            last_synced_at: s.lastSyncedAt.toISOString(),
          }));
        }
      } catch (err) {
        if (env.NODE_ENV === 'production') throw err;
      }
    }

    const avg = (values: number[]) =>
      values.length === 0
        ? 0
        : Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));

    const completeness = avg(sources.map((s) => s.completeness_pct));
    const timeliness = avg(sources.map((s) => s.timeliness_pct));
    const accuracy = avg(sources.map((s) => s.accuracy_pct));
    const score = Number(((completeness + timeliness + accuracy) / 3).toFixed(1));

    return {
      score,
      completeness,
      timeliness,
      accuracy,
      coverage: '12 / 12 regions',
      data_classification: 'synthetic',
      is_official: false,
      accuracy_definition: 'structural_schema_and_range_validation',
      provenance_note:
        'All datasets are generated locally by scripts/pipeline_ingest.py from a fixed 12-region baseline. They are not official statistics. The reported dimensions describe structural integrity of the generated files (completeness, recency against the declared coverage window, schema/range validation), not statistical accuracy against a real population.',
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        arabic_name: s.arabic_name,
        original_source: s.original_source,
        license: s.license,
        record_count: s.record_count,
        frequency: s.update_frequency,
        status: s.status,
        age_days: s.age_days,
      })),
    };
  }

  private static async getVerifiedSectorData(
    sector: 'education' | 'healthcare' | 'economy' | 'infrastructure'
  ) {
    const active = await this.requireVerifiedDataset();
    const indicators = await prisma.indicator.findMany({
      where: { domain: sector, datasetVersionId: active.id },
      select: { key: true, label: true, arabicLabel: true, unit: true, higherIsBetter: true },
    });
    if (indicators.length === 0) {
      throw AppError.unavailable(
        `No verified ${sector} indicators are available for dataset ${active.id}.`,
        'DATASET_NOT_CONNECTED'
      );
    }

    const metrics = await prisma.regionalMetric.findMany({
      where: {
        indicatorKey: { in: indicators.map((indicator) => indicator.key) },
        datasetVersionId: active.id,
        region: { datasetVersionId: active.id },
      },
      orderBy: { year: 'desc' },
      include: { region: true },
    });
    if (metrics.length === 0) {
      throw AppError.unavailable(
        `No verified regional ${sector} observations are available for dataset ${active.id}.`,
        'DATASET_NOT_CONNECTED'
      );
    }

    const yearsDesc = [...new Set(metrics.map((metric) => metric.year))].sort((a, b) => b - a);
    const latestYear = yearsDesc[0];
    const previousYear = yearsDesc[1] ?? null;

    /**
     * Batch 3: raw values with different units are NEVER averaged. Each
     * indicator is min-max normalised to 0..100 against its observed regional
     * range in the reference year (direction applied), then equal-weighted.
     * Missing observations are excluded and reported, not treated as zero.
     */
    const components = indicators
      .map((indicator) => {
        const atYear = (year: number) =>
          metrics
            .filter((metric) => metric.indicatorKey === indicator.key && metric.year === year)
            .map((metric) => ({ regionId: metric.regionId, value: toNumber(metric.value) }));
        const latest = atYear(latestYear);
        if (latest.length === 0) return null;
        const previous = previousYear === null ? [] : atYear(previousYear);
        const values = latest.map((entry) => entry.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const national = finiteMean(values);
        if (national === null) return null;
        const previousNational = finiteMean(previous.map((entry) => entry.value));
        return {
          indicator,
          latest,
          min,
          max,
          national,
          previousNational,
          normalized: normalizeToScore({ value: national, min, max, higherIsBetter: indicator.higherIsBetter }),
          previousNormalized:
            previousNational === null
              ? null
              : normalizeToScore({
                  value: previousNational,
                  min,
                  max,
                  higherIsBetter: indicator.higherIsBetter,
                }),
        };
      })
      .filter((component): component is NonNullable<typeof component> => component !== null);

    if (components.length === 0) {
      throw AppError.unavailable(
        `No verified ${sector} observations can be normalised for dataset ${active.id}.`,
        'DATASET_NOT_CONNECTED'
      );
    }

    const kpis = components.map((component) => ({
      key: component.indicator.key,
      label: component.indicator.label,
      arabic_label: component.indicator.arabicLabel,
      value: Number(component.national.toFixed(2)),
      unit: component.indicator.unit,
      change:
        component.previousNational === null
          ? 0
          : Number((component.national - component.previousNational).toFixed(2)),
      higher_is_better: component.indicator.higherIsBetter,
    }));

    const composite = compositeScore(components.map((component) => ({ normalized: component.normalized })));
    const previousComposite = compositeScore(
      components.map((component) => ({ normalized: component.previousNormalized }))
    );
    if (composite.score === null) {
      throw AppError.unavailable(
        `No comparable ${sector} score can be computed for dataset ${active.id}.`,
        'DATASET_NOT_CONNECTED'
      );
    }

    const regionIds = [...new Set(metrics.filter((metric) => metric.year === latestYear).map((metric) => metric.regionId))];
    const ranking = regionIds
      .map((regionId) => {
        const metric = metrics.find(
          (candidate) => candidate.regionId === regionId && candidate.year === latestYear
        )!;
        const regionScore = compositeScore(
          components.map((component) => {
            const entry = component.latest.find((candidate) => candidate.regionId === regionId);
            return {
              normalized:
                entry === undefined
                  ? null
                  : normalizeToScore({
                      value: entry.value,
                      min: component.min,
                      max: component.max,
                      higherIsBetter: component.indicator.higherIsBetter,
                    }),
            };
          })
        ).score;
        return {
          region_id: regionId,
          name: metric.region.name,
          arabic_name: metric.region.arabicName,
          score: regionScore ?? 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    return {
      sector,
      data_classification: 'derived_calculation',
      is_official: !this.isSyntheticDataset(active),
      source_classification: this.isSyntheticDataset(active) ? 'synthetic_demo' : 'official_source',
      dataset_version: active.id,
      index: {
        score: composite.score,
        change:
          previousComposite.score === null
            ? 0
            : Number((composite.score - previousComposite.score).toFixed(1)),
      },
      normalization: {
        method: 'min_max_across_regions_per_indicator',
        scale: [0, 100],
        direction_adjusted: true,
        weights: 'equal',
        reference_year: latestYear,
        previous_year: previousYear,
        indicators_used: composite.used,
        indicators_missing: composite.missing,
        note:
          'Raw values in different units are never averaged. Each indicator is normalised against its observed regional range for the reference year, direction applied, then equal-weighted.',
      },
      kpis,
      trend: { points: [] },
      breakdown: { title: sector, arabic_title: sector, unit: 'value', bars: [] },
      indicators: kpis.map(({ key, label, arabic_label, value, unit }) => ({
        key,
        label,
        arabic_label,
        value,
        unit,
      })),
      ranking: {
        basis: 'normalized_sector_composite',
        top: ranking.slice(0, 5),
        bottom: ranking.slice(-5).reverse(),
      },
      ai_insight: {
        text: 'No generated narrative is available; review the verified observations above.',
        arabic_text: 'لا توجد رواية مولدة متاحة؛ راجع الملاحظات الموثقة أعلاه.',
      },
      provenance: {
        dataset_version: active.id,
        source: active.source,
        source_file: active.filename,
        license: active.license,
        geographic_coverage: active.coverage,
        observation_period:
          previousYear === null ? String(latestYear) : `${previousYear}-${latestYear}`,
        method: 'Aggregated from version-matched indicator and regional metric observations.',
        data_classification: 'derived_calculation',
        verification_status: 'verified_dataset_derived',
      },
    };
  }

  private static async getVerifiedHistorical(sector: string, range: '3Y' | '5Y' | '7Y') {
    const active = await this.requireVerifiedDataset();
    const count = range === '3Y' ? 3 : range === '5Y' ? 5 : 7;
    const rows =
      sector === 'overall'
        ? await prisma.nationalIndexHistory.findMany({
            where: { datasetVersionId: active.id },
            orderBy: { year: 'desc' },
            take: count,
          })
        : await prisma.regionalMetric.findMany({
            where: {
              indicatorKey: sector,
              datasetVersionId: active.id,
              indicator: { datasetVersionId: active.id },
            },
            orderBy: { year: 'desc' },
            take: count,
          });
    if (rows.length === 0) {
      throw AppError.unavailable(
        `No verified historical ${sector} observations are available for dataset ${active.id}.`,
        'DATASET_NOT_CONNECTED'
      );
    }
    const points = rows
      .reverse()
      .map((row) => ({ year: row.year, value: toNumber('score' in row ? row.score : row.value) }));
    const first = points[0];
    const last = points[points.length - 1];
    return {
      range,
      points,
      annual_change:
        points.length > 1 ? Number(((last.value - first.value) / (points.length - 1)).toFixed(2)) : 0,
      milestones: [],
      milestones_note: 'No verified policy milestone records are ingested.',
      data_classification: this.isSyntheticDataset(active)
        ? 'derived_calculation'
        : 'official_observed',
      is_official: !this.isSyntheticDataset(active),
      source_classification: this.isSyntheticDataset(active) ? 'synthetic_demo' : 'official_source',
      dataset_version: active.id,
      provenance: {
        dataset_version: active.id,
        source: active.source,
        source_file: active.filename,
        license: active.license,
        geographic_coverage: active.coverage,
        observation_period: points.length ? `${points[0].year}-${points[points.length - 1].year}` : null,
        method: 'Version-matched persisted historical observations.',
        data_classification: this.isSyntheticDataset(active)
          ? 'derived_calculation'
          : 'official_observed',
        verification_status: 'verified_dataset_observed',
      },
    };
  }

  private static async getVerifiedPriorityQueue(limit: number) {
    const active = await this.requireVerifiedDataset();
    const regions = await prisma.region.findMany({
      where: { datasetVersionId: active.id },
      orderBy: { score: 'asc' },
      take: Math.max(limit, 1),
    });
    if (regions.length === 0) {
      throw AppError.unavailable(
        `No verified regional observations are available for dataset ${active.id}.`,
        'DATASET_NOT_CONNECTED'
      );
    }
    return {
      summary: {
        high: regions.filter((region) => region.priority === 'high' || region.priority === 'critical').length,
        medium: regions.filter((region) => region.priority === 'medium').length,
        low: regions.filter((region) => region.priority === 'low').length,
      },
      queue: regions.map((region, index) => ({
        rank: index + 1,
        region_id: region.id,
        name: region.name,
        arabic_name: region.arabicName,
        priority: region.priority,
        need_score: Math.round(100 - toNumber(region.score)),
        weakest_domain: null,
      })),
      data_classification: 'derived_calculation',
      is_official: !this.isSyntheticDataset(active),
      source_classification: this.isSyntheticDataset(active) ? 'synthetic_demo' : 'official_source',
      dataset_version: active.id,
      provenance: {
        dataset_version: active.id,
        source: active.source,
        source_file: active.filename,
        license: active.license,
        geographic_coverage: active.coverage,
        observation_period: null,
        method: 'Priority derived from version-matched regional scores.',
        data_classification: 'derived_calculation',
        verification_status: 'verified_dataset_derived',
      },
    };
  }

  private static async getVerifiedDataQuality() {
    const active = await this.requireVerifiedDataset();
    const sources = await prisma.datasetMetadata.findMany({
      where: { datasetVersionId: active.id },
    });
    if (sources.length === 0) {
      throw AppError.unavailable(
        `No verified provenance metadata is available for dataset ${active.id}.`,
        'DATASET_NOT_CONNECTED'
      );
    }
    const average = (values: number[]) =>
      Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
    const completeness = average(sources.map((source) => toNumber(source.completenessPct)));
    const timeliness = average(sources.map((source) => toNumber(source.timelinessPct)));
    const accuracy = average(sources.map((source) => toNumber(source.accuracyPct)));
    return {
      score: Number(((completeness + timeliness + accuracy) / 3).toFixed(1)),
      completeness,
      timeliness,
      accuracy,
      coverage: active.coverage,
      data_classification: 'derived_calculation',
      is_official: !this.isSyntheticDataset(active),
      source_classification: this.isSyntheticDataset(active) ? 'synthetic_demo' : 'official_source',
      dataset_version: active.id,
      accuracy_definition: 'dataset validation metadata',
      provenance: {
        dataset_version: active.id,
        source: active.source,
        source_file: active.filename,
        license: active.license,
        geographic_coverage: active.coverage,
        observation_period: null,
        method: 'Aggregated from version-matched dataset metadata.',
        data_classification: 'derived_calculation',
        verification_status: 'verified_dataset_derived',
      },
      sources: sources.map((source) => ({
        id: source.id,
        name: source.name,
        arabic_name: source.arabicName,
        original_source: source.originalSource,
        license: source.license,
        record_count: source.recordCount,
        frequency: source.updateFrequency,
        status: source.status,
        age_days: source.ageDays,
      })),
    };
  }

  private static async getVerifiedComparison(aId: string, bId: string) {
    const active = await this.requireVerifiedDataset();
    const regions = await prisma.region.findMany({
      where: { id: { in: [aId.toLowerCase(), bId.toLowerCase()] }, datasetVersionId: active.id },
      include: {
        metrics: {
          where: { datasetVersionId: active.id },
          orderBy: { year: 'desc' },
        },
      },
    });
    if (regions.length !== 2) {
      throw AppError.unavailable(
        `No verified comparison observations are available for dataset ${active.id}.`,
        'DATASET_NOT_CONNECTED'
      );
    }
    const [a, b] = [aId.toLowerCase(), bId.toLowerCase()].map((id) => regions.find((region) => region.id === id)!);
    const scoreA = toNumber(a.score);
    const scoreB = toNumber(b.score);
    return {
      a: { id: a.id, name: a.name, arabic_name: a.arabicName, score: scoreA },
      b: { id: b.id, name: b.name, arabic_name: b.arabicName, score: scoreB },
      metrics: [{ key: 'overall', label: 'Overall', arabic_label: 'الإجمالي', score_a: scoreA, score_b: scoreB }],
      gap_analysis: {
        text: 'Comparison is limited to the verified overall observations.',
        arabic_text: 'تقتصر المقارنة على الملاحظات الإجمالية الموثقة.',
      },
      data_classification: 'derived_calculation',
      is_official: !this.isSyntheticDataset(active),
      source_classification: this.isSyntheticDataset(active) ? 'synthetic_demo' : 'official_source',
      dataset_version: active.id,
      provenance: {
        dataset_version: active.id,
        source: active.source,
        source_file: active.filename,
        license: active.license,
        geographic_coverage: active.coverage,
        observation_period: null,
        method: 'Comparison derived from version-matched regional observations.',
        data_classification: 'derived_calculation',
        verification_status: 'verified_dataset_derived',
      },
    };
  }
}
