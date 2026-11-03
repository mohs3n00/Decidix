import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_REGIONS, SEED_DATA_SOURCES, SEED_OVERVIEW } from '../database/seed_data.js';
import { toNumber } from '../utils/decimal.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';

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
  /**
   * Fetches sector deep-dive analytics.
   */
  static async getSectorData(sector: 'education' | 'healthcare' | 'economy' | 'infrastructure') {
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

    return {
      a: { id: regA.id, name: regA.name, arabic_name: regA.arabic_name, score: regA.score },
      b: { id: regB.id, name: regB.name, arabic_name: regB.arabic_name, score: regB.score },
      metrics: [
        { key: 'overall', label: 'Overall', arabic_label: 'الإجمالي', score_a: regA.score, score_b: regB.score },
        { key: 'education', label: 'Education', arabic_label: 'التعليم', score_a: regA.domains.education, score_b: regB.domains.education },
        { key: 'healthcare', label: 'Healthcare', arabic_label: 'الرعاية الصحية', score_a: regA.domains.healthcare, score_b: regB.domains.healthcare },
        { key: 'economy', label: 'Economy', arabic_label: 'الاقتصاد', score_a: regA.domains.economy, score_b: regB.domains.economy },
        { key: 'infrastructure', label: 'Infrastructure', arabic_label: 'البنية التحتية', score_a: regA.domains.infrastructure, score_b: regB.domains.infrastructure },
      ],
      gap_analysis: {
        text: `${leader.name} leads ${trailer.name} by ${diff} index points. The widest disparity occurs in healthcare and economy.`,
        arabic_text: `تتقدم ${leader.arabic_name} على ${trailer.arabic_name} بفارق ${diff} نقطة في المؤشر. وأوسع فجوة في الرعاية الصحية والاقتصاد.`,
      },
    };
  }

  /**
   * Fetches historical milestones and national trend.
   */
  static getHistorical(_sector = 'overall', range: '3Y' | '5Y' | '7Y' = '7Y') {
    const count = range === '3Y' ? 3 : range === '5Y' ? 5 : 7;
    const points = SEED_OVERVIEW.trend_points_7y.slice(-count);

    return {
      range,
      points,
      annual_change: 1.8,
      milestones: [
        { year: 2021, text: 'National Healthcare Access Directive enacted', arabic_text: 'إقرار التوجيه الوطني للوصول إلى الرعاية الصحية' },
        { year: 2023, text: 'Rural Broadband Infrastructure reached 70% coverage', arabic_text: 'وصول تغطية النطاق العريض الريفي إلى 70%' },
        { year: 2025, text: 'Launch of Clean Water Sanitation Initiative across Delta', arabic_text: 'إطلاق مبادرة مياه الشرب النظيفة والصرف في الدلتا' },
      ],
    };
  }

  /**
   * Fetches urgency-ranked priority queue.
   */
  static async getPriorityQueue(limit = 10) {
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

    return {
      score: 96,
      completeness: 98,
      timeliness: 94,
      accuracy: 96,
      coverage: '12 / 12 regions',
      sources: sources.map((s) => ({
        name: s.name,
        arabic_name: s.arabic_name,
        frequency: s.update_frequency,
        status: s.status,
        age_days: s.age_days,
      })),
    };
  }
}

