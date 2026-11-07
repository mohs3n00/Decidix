import { apiClient } from './apiClient';
import { SectorInsightData, Sector } from '../types';

export const insightsService = {
  async getSectorInsight(sector: 'education' | 'healthcare' | 'economy' | 'infrastructure'): Promise<SectorInsightData> {
    const res = await apiClient.get<SectorInsightData>(`/insights/${sector}`);
    return res.data;
  },

  async getComparison(regionA: string, regionB: string): Promise<any> {
    const res = await apiClient.get<any>(
      `/insights/comparison?a=${encodeURIComponent(regionA)}&b=${encodeURIComponent(regionB)}`
    );
    return res.data;
  },

  async getHistorical(sector: Sector = 'overall', range: string = '5Y'): Promise<any> {
    const res = await apiClient.get<any>(`/insights/historical?sector=${sector}&range=${range}`);
    return res.data;
  },

  async getPriorityQueue(limit: number = 10): Promise<any> {
    const res = await apiClient.get<any>(`/insights/priority?limit=${limit}`);
    return res.data;
  },

  async getDataQuality(): Promise<any> {
    const res = await apiClient.get<any>('/insights/data-quality');
    return res.data;
  },
};
