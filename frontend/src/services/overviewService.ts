import { apiClient } from './apiClient';
import { OverviewData, MapPoint, RegionListItem, RegionProfile, Range, Sector } from '../types';

export const overviewService = {
  async getOverview(range: Range = '5Y'): Promise<OverviewData> {
    const res = await apiClient.get<OverviewData>(`/overview?range=${range}`);
    return res.data;
  },

  async getMapPoints(sector: Sector = 'overall'): Promise<MapPoint[]> {
    const res = await apiClient.get<MapPoint[]>(`/regions/map-points?sector=${sector}`);
    return res.data;
  },

  async getRegions(params?: {
    q?: string;
    priority?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ items: RegionListItem[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.priority && params.priority !== 'all') query.set('priority', params.priority);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.per_page) query.set('per_page', params.per_page.toString());

    const res = await apiClient.get<RegionListItem[]>(`/regions?${query.toString()}`);
    return { items: res.data, meta: res.meta };
  },

  async getRegionProfile(id: string): Promise<RegionProfile> {
    const res = await apiClient.get<RegionProfile>(`/regions/${encodeURIComponent(id)}`);
    return res.data;
  },
};
