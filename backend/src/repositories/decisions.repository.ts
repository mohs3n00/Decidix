import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_REGIONS } from '../database/seed_data.js';
import { toNumber } from '../utils/decimal.js';
import { env, syntheticDataAllowed } from '../config/env.js';
import { AppError } from '../utils/response.js';
import { SimulatorService, SectorDomain } from '../services/simulator.service.js';
import { DatasetService } from '../services/dataset.service.js';

interface StoredCitizenReport {
  id: string;
  category: string;
  title: string;
  arabic_title: string;
  region: { region_id: string; name: string; arabic_name: string };
  created_at: string;
  likes: number;
  priority: string;
  status: string;
}

const fallbackReports: StoredCitizenReport[] = [
  {
    id: 'rep_delta_bridge_cracks',
    category: 'roads',
    title: 'Bridge deck cracking near market road',
    arabic_title: 'تشقق في سطح الجسر قرب طريق السوق',
    region: { region_id: 'delta', name: 'Delta', arabic_name: 'الدلتا' },
    created_at: '2025-11-03T10:00:00Z',
    likes: 128,
    priority: 'high',
    status: 'escalated',
  },
  {
    id: 'rep_frontier_clinic_medicines',
    category: 'health',
    title: 'Clinic out of essential medicines',
    arabic_title: 'نفاد الأدوية الأساسية في العيادة',
    region: { region_id: 'frontier', name: 'Frontier', arabic_name: 'المنطقة الحدودية' },
    created_at: '2025-11-03T07:00:00Z',
    likes: 214,
    priority: 'medium',
    status: 'under_review',
  },
  {
    id: 'rep_steppe_no_water',
    category: 'water',
    title: 'No drinking water for 6 days',
    arabic_title: 'انقطاع مياه الشرب لمدة 6 أيام',
    region: { region_id: 'steppe', name: 'Steppe', arabic_name: 'السهوب' },
    created_at: '2025-11-02T12:00:00Z',
    likes: 342,
    priority: 'high',
    status: 'escalated',
  },
  {
    id: 'rep_riverside_crowded_classes',
    category: 'schools',
    title: 'Overcrowded classrooms, 52 per class',
    arabic_title: 'فصول مكتظة، 52 طالباً في الفصل',
    region: { region_id: 'riverside', name: 'Riverside', arabic_name: 'ضفة النهر' },
    created_at: '2025-10-31T12:00:00Z',
    likes: 87,
    priority: 'low',
    status: 'resolved',
  },
  {
    id: 'rep_highlands_unlit_highway',
    category: 'roads',
    title: 'Unlit highway section causing accidents',
    arabic_title: 'جزء من الطريق السريع غير مضاء يتسبب بحوادث',
    region: { region_id: 'northern_highlands', name: 'Northern Highlands', arabic_name: 'المرتفعات الشمالية' },
    created_at: '2025-10-30T12:00:00Z',
    likes: 96,
    priority: 'medium',
    status: 'under_review',
  },
];

const fallbackProjects = [
  {
    id: 'prj_delta_clean_water',
    title: 'Delta Clean Water & Sanitation Upgrade',
    arabic_title: 'مشروع مياه الشرب النظيفة والصرف في الدلتا',
    region: { region_id: 'delta', name: 'Delta', arabic_name: 'الدلتا' },
    status: 'in_progress',
    progress: 68,
    budget: { amount: 145000000, currency: 'USD' },
    due_date: '2026-09-30',
    completed_at: null,
  },
  {
    id: 'prj_frontier_solar_grid',
    title: 'Frontier Solar Micro-Grid Expansion',
    arabic_title: 'توسعة شبكات الطاقة الشمسية المصغرة في الحدود',
    region: { region_id: 'frontier', name: 'Frontier', arabic_name: 'المنطقة الحدودية' },
    status: 'delayed',
    progress: 42,
    budget: { amount: 84000000, currency: 'USD' },
    due_date: '2026-03-31',
    completed_at: null,
  },
  {
    id: 'prj_lakeside_logistics_hub',
    title: 'Lakeside Agricultural Logistics Hub',
    arabic_title: 'مركز الخدمات اللوجستية الزراعية بضفاف البحيرة',
    region: { region_id: 'lakeside', name: 'Lakeside', arabic_name: 'ضفاف البحيرة' },
    status: 'planned',
    progress: 15,
    budget: { amount: 110000000, currency: 'USD' },
    due_date: '2027-06-30',
    completed_at: null,
  },
  {
    id: 'prj_central_tech_park',
    title: 'Central Capital Digital Innovation Campus',
    arabic_title: 'مجمع الابتكار الرقمي بالعاصمة المركزية',
    region: { region_id: 'central_capital', name: 'Central Capital', arabic_name: 'العاصمة المركزية' },
    status: 'completed',
    progress: 100,
    budget: { amount: 165000000, currency: 'USD' },
    due_date: null,
    completed_at: '2025-11-20',
  },
  {
    id: 'prj_steppe_health_centers',
    title: 'Steppe Primary Healthcare Network',
    arabic_title: 'شبكة مراكز الرعاية الأولية بالسهوب',
    region: { region_id: 'steppe', name: 'Steppe', arabic_name: 'السهوب' },
    status: 'in_progress',
    progress: 55,
    budget: { amount: 24000000, currency: 'USD' },
    due_date: '2026-12-15',
    completed_at: null,
  },
];

const fallbackLikes = new Set<string>();

export class DecisionsRepository {
  /**
   * Calculates what-if scenario simulations based on sectoral budget allocations
   * using the transparent non-linear concave simulation engine.
   */
  static async simulate(
    regionId: string,
    allocations: Record<SectorDomain, number>
  ) {
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before running simulations.',
        'DATASET_NOT_CONNECTED'
      );
    }
    return SimulatorService.simulate(regionId, allocations);
  }

  /**
   * Fetches development projects portfolio with status filtering and pagination.
   */
  static async getProjects(params: { status: string; page: number; per_page: number }) {
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing development records.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (!syntheticDataAllowed()) {
        throw AppError.internal('Database connection unavailable for development projects.');
      }
      return this.getFallbackProjects(params);
    }

    try {
      const where: any = {};
      if (params.status !== 'all') {
        where.status = params.status;
      }

      const total = await prisma.developmentProject.count({ where });
      const projects = await prisma.developmentProject.findMany({
        where,
        include: { region: true },
        skip: (params.page - 1) * params.per_page,
        take: params.per_page,
      });

      if (projects.length === 0 && total === 0) {
        return this.getFallbackProjects(params);
      }

      const allProjects = await prisma.developmentProject.findMany();
      const totalBudget = allProjects.reduce((acc, p) => acc + toNumber(p.budgetAmount), 0);
      const delayedCount = allProjects.filter((p) => p.status === 'delayed').length;

      const items = projects.map((p) => ({
        id: p.id,
        title: p.title,
        arabic_title: p.arabicTitle,
        region: {
          region_id: p.region.id,
          name: p.region.name,
          arabic_name: p.region.arabicName,
        },
        status: p.status,
        progress: p.progress,
        budget: {
          amount: toNumber(p.budgetAmount),
          currency: p.budgetCurrency,
        },
        due_date: p.dueDate ? p.dueDate.toISOString().split('T')[0] : null,
        completed_at: p.completedAt ? p.completedAt.toISOString().split('T')[0] : null,
      }));

      return {
        summary: {
          projects_count: allProjects.length,
          total_budget: { amount: totalBudget, currency: 'USD' },
          delayed_count: delayedCount,
        },
        items,
        total,
      };
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
      return this.getFallbackProjects(params);
    }
  }

  /**
   * Fetches citizen reports feed with category/status filters and user like state.
   */
  static async getCitizenReports(params: {
    category: string;
    status?: string;
    page: number;
    per_page: number;
    userIdentifier: string;
  }) {
    if (!syntheticDataAllowed() && !(await DatasetService.hasApprovedActiveDataset())) {
      throw AppError.unavailable(
        'No approved dataset is connected. Connect and validate a dataset before viewing citizen reports.',
        'DATASET_NOT_CONNECTED'
      );
    }
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (!syntheticDataAllowed()) {
        throw AppError.internal('Database connection unavailable for citizen reports.');
      }
      return this.getFallbackCitizenReports(params);
    }

    try {
      const where: any = {};
      if (params.category !== 'all') {
        where.category = params.category;
      }
      if (params.status && params.status.trim().length > 0 && params.status !== 'all') {
        where.status = params.status;
      }

      const total = await prisma.citizenReport.count({ where });
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const openThisWeek = await prisma.citizenReport.count({
        where: { createdAt: { gte: weekAgo }, status: { not: 'resolved' } },
      });
      const resolvedCount = await prisma.citizenReport.count({ where: { status: 'resolved' } });
      const resolvedRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
      const reports = await prisma.citizenReport.findMany({
        where,
        include: { region: true, likes: { where: { userId: params.userIdentifier } } },
        skip: (params.page - 1) * params.per_page,
        take: params.per_page,
        orderBy: { createdAt: 'desc' },
      });

      if (reports.length === 0 && total === 0) {
        return this.getFallbackCitizenReports(params);
      }

      const items = reports.map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        arabic_title: r.arabicTitle,
        region: {
          region_id: r.region.id,
          name: r.region.name,
          arabic_name: r.region.arabicName,
        },
        created_at: r.createdAt.toISOString(),
        likes: r.likesCount,
        priority: 'high',
        status: r.status,
        liked_by_me: r.likes.length > 0,
      }));

      return {
        summary: {
          open_this_week: { value: openThisWeek, change: 0, higher_is_better: false },
          resolved_rate: { value: resolvedRate, change: 0, higher_is_better: true },
        },
        items,
        total,
      };
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
      return this.getFallbackCitizenReports(params);
    }
  }

  /**
   * Atomically toggles a like on a citizen report.
   */
  static async toggleLike(reportId: string, userIdentifier: string) {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (!syntheticDataAllowed()) {
        throw AppError.unavailable(
          'Citizen report interactions are unavailable until the database is connected.',
          'DATABASE_NOT_CONNECTED'
        );
      }
      const report = fallbackReports.find((r) => r.id === reportId);
      if (!report) {
        throw AppError.notFound(`Citizen report '${reportId}' not found`);
      }

      const likeKey = `${userIdentifier}:${reportId}`;
      const currentlyLiked = fallbackLikes.has(likeKey);

      if (currentlyLiked) {
        fallbackLikes.delete(likeKey);
        report.likes = Math.max(0, report.likes - 1);
      } else {
        fallbackLikes.add(likeKey);
        report.likes += 1;
      }

      return {
        id: report.id,
        likes: report.likes,
        liked_by_me: !currentlyLiked,
      };
    }

    try {
      const report = await prisma.citizenReport.findUnique({ where: { id: reportId } });
      if (!report) {
        throw AppError.notFound(`Citizen report '${reportId}' not found`);
      }

      const existingLike = await prisma.citizenReportLike.findUnique({
        where: { reportId_userId: { reportId, userId: userIdentifier } },
      });

      if (existingLike) {
        // Unlike via transaction
        const updated = await prisma.$transaction(async (tx) => {
          await tx.citizenReportLike.delete({
            where: { reportId_userId: { reportId, userId: userIdentifier } },
          });
          return tx.citizenReport.update({
            where: { id: reportId },
            data: { likesCount: { decrement: 1 } },
          });
        });

        return {
          id: updated.id,
          likes: updated.likesCount,
          liked_by_me: false,
        };
      } else {
        // Like via transaction
        const updated = await prisma.$transaction(async (tx) => {
          await tx.citizenReportLike.create({
            data: { reportId, userId: userIdentifier },
          });
          return tx.citizenReport.update({
            where: { id: reportId },
            data: { likesCount: { increment: 1 } },
          });
        });

        return {
          id: updated.id,
          likes: updated.likesCount,
          liked_by_me: true,
        };
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (env.NODE_ENV === 'production') throw err;

      // Fallback
      return this.toggleLikeFallback(reportId, userIdentifier);
    }
  }

  // --- Fallbacks ---

  private static getFallbackProjects(params: { status: string; page: number; per_page: number }) {
    let items = [...fallbackProjects];
    if (params.status !== 'all') {
      items = items.filter((p) => p.status === params.status);
    }

    const totalBudget = fallbackProjects.reduce((acc, p) => acc + p.budget.amount, 0);
    const delayedCount = fallbackProjects.filter((p) => p.status === 'delayed').length;

    const total = items.length;
    const startIndex = (params.page - 1) * params.per_page;
    const paginatedItems = items.slice(startIndex, startIndex + params.per_page);

    return {
      summary: {
        projects_count: fallbackProjects.length,
        total_budget: { amount: totalBudget, currency: 'USD' },
        delayed_count: delayedCount,
      },
      items: paginatedItems,
      total,
    };
  }

  private static getFallbackCitizenReports(params: {
    category: string;
    status?: string;
    page: number;
    per_page: number;
    userIdentifier: string;
  }) {
    let items = [...fallbackReports];
    if (params.category !== 'all') {
      items = items.filter((r) => r.category === params.category);
    }
    if (params.status && params.status.trim().length > 0 && params.status !== 'all') {
      items = items.filter((r) => r.status === params.status);
    }

    const total = items.length;
    const startIndex = (params.page - 1) * params.per_page;
    const weekAgoFallback = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const openThisWeek = items.filter(
      (r) => r.status !== 'resolved' && new Date(r.created_at).getTime() >= weekAgoFallback.getTime()
    ).length;
    const resolvedRate =
      items.length > 0
        ? Math.round((items.filter((r) => r.status === 'resolved').length / items.length) * 100)
        : 0;
    const paginatedItems = items.slice(startIndex, startIndex + params.per_page).map((r) => {
      const likeKey = `${params.userIdentifier}:${r.id}`;
      return {
        ...r,
        liked_by_me: fallbackLikes.has(likeKey),
      };
    });

    return {
      summary: {
        open_this_week: { value: openThisWeek, change: 0, higher_is_better: false },
        resolved_rate: { value: resolvedRate, change: 0, higher_is_better: true },
      },
      items: paginatedItems,
      total,
    };
  }

  private static toggleLikeFallback(reportId: string, userIdentifier: string) {
    const report = fallbackReports.find((r) => r.id === reportId);
    if (!report) {
      throw AppError.notFound(`Citizen report '${reportId}' not found`);
    }

    const likeKey = `${userIdentifier}:${reportId}`;
    const currentlyLiked = fallbackLikes.has(likeKey);

    if (currentlyLiked) {
      fallbackLikes.delete(likeKey);
      report.likes = Math.max(0, report.likes - 1);
    } else {
      fallbackLikes.add(likeKey);
      report.likes += 1;
    }

    return {
      id: report.id,
      likes: report.likes,
      liked_by_me: !currentlyLiked,
    };
  }
}
