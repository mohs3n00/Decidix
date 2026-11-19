import { apiClient } from './apiClient';
import {
  SectorInsightData,
  Sector,
  ComparisonData,
  HistoricalData,
  PriorityQueueData,
  DataQualityData,
} from '../types';

export const insightsService = {
  async getSectorInsight(
    sector: 'education' | 'healthcare' | 'economy' | 'infrastructure'
  ): Promise<SectorInsightData> {
    const res = await apiClient.get<SectorInsightData>(`/insights/${sector}`);
    return res.data;
  },

  async getComparison(regionA: string, regionB: string): Promise<ComparisonData> {
    const res = await apiClient.get<ComparisonData>(
      `/insights/comparison?a=${encodeURIComponent(regionA)}&b=${encodeURIComponent(regionB)}`
    );
    return res.data;
  },

  async getHistorical(sector: Sector = 'overall', range: string = '7Y'): Promise<HistoricalData> {
    const res = await apiClient.get<HistoricalData>(
      `/insights/historical?sector=${sector}&range=${range}`
    );
    return res.data;
  },

  async getPriorityQueue(limit: number = 10): Promise<PriorityQueueData> {
    const res = await apiClient.get<PriorityQueueData>(`/insights/priority?limit=${limit}`);
    return res.data;
  },

  async getDataQuality(): Promise<DataQualityData> {
    const res = await apiClient.get<DataQualityData>('/insights/data-quality');
    return res.data;
  },
};
