import { apiClient } from './apiClient';
import { User, AuthResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/login', { email, password });
    const payload = res.data;
    const token = payload.access_token || payload.token;
    if (token) {
      apiClient.setTokens(token, payload.refresh_token);
      localStorage.setItem('decidix_user', JSON.stringify(payload.user));
    }
    return payload as AuthResponse;
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    arabic_name?: string;
  }): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/register', data);
    const payload = res.data;
    const token = payload.access_token || payload.token;
    if (token) {
      apiClient.setTokens(token, payload.refresh_token);
      localStorage.setItem('decidix_user', JSON.stringify(payload.user));
    }
    return payload as AuthResponse;
  },

  async googleLogin(id_token: string): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/google', { id_token });
    const payload = res.data;
    const token = payload.access_token || payload.token;
    if (token) {
      apiClient.setTokens(token, payload.refresh_token);
      localStorage.setItem('decidix_user', JSON.stringify(payload.user));
    }
    return payload as AuthResponse;
  },

  async me(): Promise<User> {
    const res = await apiClient.get<{ user: User }>('/auth/me');
    const user = res.data.user || (res.data as unknown as User);
    localStorage.setItem('decidix_user', JSON.stringify(user));
    return user;
  },

  async changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>('/auth/change-password', {
      current_password,
      new_password,
    });
    return res.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      password,
    });
    return res.data;
  },

  async verifyEmail(token: string): Promise<{ message: string; email_verified: boolean; user: any }> {
    const res = await apiClient.post<{ message: string; email_verified: boolean; user: any }>(
      '/auth/verify-email',
      { token }
    );
    return res.data;
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>('/auth/resend-verification', { email });
    return res.data;
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
