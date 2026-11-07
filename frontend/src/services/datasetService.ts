import { apiClient } from './apiClient';
import { DatasetItem, DatasetStats } from '../types';

export interface UploadDirectPayload {
  filename: string;
  format: 'json' | 'csv' | 'tsv' | 'xlsx' | 'xls' | 'jsonl' | 'ndjson';
  source?: string;
  license?: string;
  coverage?: string;
  content: string; // UTF-8 text for csv/tsv/json/jsonl, base64 for xls/xlsx
  auto_activate?: boolean;
  sheetName?: string;
  name?: string;
  description?: string;
}

export const datasetService = {
  async list(params?: { search?: string; status?: string }): Promise<DatasetItem[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);

    const res = await apiClient.get<DatasetItem[]>(`/datasets?${query.toString()}`);
    return res.data;
  },

  async stats(): Promise<DatasetStats> {
    const res = await apiClient.get<DatasetStats>('/datasets/stats');
    return res.data;
  },

  async active(): Promise<any> {
    const res = await apiClient.get<any>('/datasets/active');
    return res.data;
  },

  async uploadDirect(payload: UploadDirectPayload): Promise<any> {
    const res = await apiClient.post<any>('/datasets/upload-direct', {
      source: 'Decidix Web Platform',
      license: 'CC-BY-4.0',
      coverage: 'Egypt Regions 2018-2025',
      auto_activate: true,
      ...payload,
    });
    return res.data;
  },

  async activateVersion(datasetId: string, version: string): Promise<any> {
    const res = await apiClient.post<any>(
      `/datasets/${encodeURIComponent(datasetId)}/versions/${encodeURIComponent(version)}/activate`
    );
    return res.data;
  },
};
