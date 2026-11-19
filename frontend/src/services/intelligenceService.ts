import { apiClient } from './apiClient';
import { PredictionsData, AssistantChatMessage, Recommendation } from '../types';

export const intelligenceService = {
  async getPredictions(
    target_year: number = 2028,
    validation_status: string = 'experimental'
  ): Promise<PredictionsData> {
    const res = await apiClient.get<PredictionsData>(
      `/intelligence/predictions?target_year=${target_year}&validation_status=${validation_status}`
    );
    return res.data;
  },

  async chatAssistant(params: {
    message: string;
    language?: 'en' | 'ar';
    conversation_id?: string | null;
    dataset_context?: any;
  }): Promise<{ reply: { text: string; sources?: any[] }; conversation_id: string; provenance?: any }> {
    const res = await apiClient.post<{
      reply: { text: string; sources?: any[] };
      conversation_id: string;
      provenance?: any;
    }>('/intelligence/assistant/chat', {
      message: params.message,
      language: params.language || 'en',
      conversation_id: params.conversation_id || null,
      dataset_context: params.dataset_context || undefined,
    });
    return res.data;
  },

  async askAssistant(message: string, language: 'en' | 'ar' = 'en', conversation_id?: string | null, dataset_context?: any) {
    return this.chatAssistant({ message, language, conversation_id, dataset_context });
  },

  async getRecommendations(priority?: string): Promise<Recommendation[]> {
    const query = priority ? `?priority=${priority}` : '';
    const res = await apiClient.get<Recommendation[]>(`/intelligence/recommendations${query}`);
    return res.data;
  },

  async acceptRecommendation(id: string): Promise<Recommendation> {
    const res = await apiClient.post<Recommendation>(`/intelligence/recommendations/${encodeURIComponent(id)}/accept`);
    return res.data;
  },

  async dismissRecommendation(id: string): Promise<Recommendation> {
    const res = await apiClient.post<Recommendation>(`/intelligence/recommendations/${encodeURIComponent(id)}/dismiss`);
    return res.data;
  },
};
