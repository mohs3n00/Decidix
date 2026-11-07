import { apiClient } from './apiClient';
import { AdminDashboardData, User, NotificationDispatch } from '../types';

export interface SendNotificationPayload {
  title: string;
  body: string;
  target_audience: 'all' | 'user' | 'test';
  target_user_id?: string;
  arabic_title?: string;
  arabic_body?: string;
  data?: Record<string, string>;
}

export const adminService = {
  async getDashboard(period: string = '30d'): Promise<AdminDashboardData> {
    const res = await apiClient.get<AdminDashboardData>(`/admin/dashboard?period=${period}`);
    return res.data;
  },

  async getAnalytics(period: string = '30d'): Promise<any> {
    const res = await apiClient.get<any>(`/admin/analytics?period=${period}`);
    return res.data;
  },

  async listUsers(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await apiClient.get<User[]>(`/admin/users?${query.toString()}`);
    return { users: res.data, meta: res.meta };
  },

  async getUserDetails(id: string): Promise<any> {
    const res = await apiClient.get<any>(`/admin/users/${encodeURIComponent(id)}`);
    return res.data;
  },

  async suspendUser(id: string): Promise<User> {
    const res = await apiClient.post<User>(`/admin/users/${encodeURIComponent(id)}/suspend`);
    return res.data;
  },

  async reactivateUser(id: string): Promise<User> {
    const res = await apiClient.post<User>(`/admin/users/${encodeURIComponent(id)}/reactivate`);
    return res.data;
  },

  async revokeSessions(id: string): Promise<any> {
    const res = await apiClient.post<any>(`/admin/users/${encodeURIComponent(id)}/revoke-sessions`);
    return res.data;
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${encodeURIComponent(id)}`);
  },

  async sendNotification(payload: SendNotificationPayload): Promise<any> {
    const res = await apiClient.post<any>('/admin/notifications/send', payload);
    return res.data;
  },

  async getNotificationHistory(): Promise<NotificationDispatch[]> {
    const res = await apiClient.get<NotificationDispatch[]>('/admin/notifications/history');
    return res.data;
  },

  async getDatasetStatistics(): Promise<any> {
    const res = await apiClient.get<any>('/admin/datasets/statistics');
    return res.data;
  },
};
