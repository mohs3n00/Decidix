import { apiClient } from './apiClient';
import { SimulationResult, DevelopmentProject, CitizenReport, ProjectStatus, ReportCategory } from '../types';

export const decisionsService = {
  async simulate(
    region_id: string,
    allocations: {
      education: number;
      healthcare: number;
      infrastructure: number;
      economy: number;
    }
  ): Promise<SimulationResult> {
    const res = await apiClient.post<SimulationResult>('/decisions/simulate', {
      region_id,
      allocations,
    });
    return res.data;
  },

  async getProjects(params?: {
    status?: ProjectStatus;
    page?: number;
    per_page?: number;
  }): Promise<{ summary: any; items: DevelopmentProject[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.per_page) query.set('per_page', params.per_page.toString());

    const res = await apiClient.get<{ summary: any; items: DevelopmentProject[] }>(
      `/decisions/projects?${query.toString()}`
    );
    return {
      summary: res.data.summary,
      items: res.data.items || [],
      meta: res.meta,
    };
  },

  async getCitizenReports(params?: {
    category?: ReportCategory;
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ summary: any; items: CitizenReport[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.per_page) query.set('per_page', params.per_page.toString());

    const res = await apiClient.get<{ summary: any; items: CitizenReport[] }>(
      `/decisions/citizen-reports?${query.toString()}`
    );
    return {
      summary: res.data.summary,
      items: res.data.items || [],
      meta: res.meta,
    };
  },

  async toggleLikeReport(id: string): Promise<CitizenReport> {
    const res = await apiClient.post<CitizenReport>(`/decisions/citizen-reports/${encodeURIComponent(id)}/like`);
    return res.data;
  },
};
