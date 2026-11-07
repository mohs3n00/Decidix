import { apiClient } from './apiClient';
import { User, AuthResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    if (res.data.access_token) {
      apiClient.setTokens(res.data.access_token, res.data.refresh_token);
      localStorage.setItem('decidix_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    arabic_name?: string;
  }): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    if (res.data.access_token) {
      apiClient.setTokens(res.data.access_token, res.data.refresh_token);
      localStorage.setItem('decidix_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async me(): Promise<User> {
    const res = await apiClient.get<{ user: User }>('/auth/me');
    const user = res.data.user || (res.data as unknown as User);
    localStorage.setItem('decidix_user', JSON.stringify(user));
    return user;
  },

  async changePassword(current_password: string, new_password: string): Promise<void> {
    await apiClient.post('/auth/change-password', { current_password, new_password });
  },

  async logout(): Promise<void> {
    const refreshToken = apiClient.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      apiClient.clearTokens();
    }
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem('decidix_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
