// Decidix Centralized API Client
// Handles authentication token injection, refresh token rotation, and error normalization

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1';

export interface ApiErrorPayload {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export class DecidixApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, error: ApiErrorPayload) {
    super(error.message || 'An unexpected API error occurred');
    this.name = 'DecidixApiError';
    this.status = status;
    this.code = error.code || 'UNKNOWN_ERROR';
    this.fields = error.fields;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export const apiClient = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  getAccessToken(): string | null {
    return localStorage.getItem('decidix_access_token');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('decidix_refresh_token');
  },

  setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem('decidix_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('decidix_refresh_token', refreshToken);
    }
  },

  clearTokens() {
    localStorage.removeItem('decidix_access_token');
    localStorage.removeItem('decidix_refresh_token');
    localStorage.removeItem('decidix_user');
  },

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; meta?: any }> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAccessToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized with token refresh rotation
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newAccessToken =
                refreshData.data?.access_token ||
                refreshData.data?.token ||
                refreshData.access_token ||
                refreshData.token;
              const newRefreshToken =
                refreshData.data?.refresh_token || refreshData.refresh_token;
              this.setTokens(newAccessToken, newRefreshToken);
              onRefreshed(newAccessToken);
              isRefreshing = false;

              // Retry original request with new token
              headers['Authorization'] = `Bearer ${newAccessToken}`;
              response = await fetch(url, { ...options, headers });
            } else {
              isRefreshing = false;
              this.clearTokens();
              window.dispatchEvent(new CustomEvent('decidix:auth:logout'));
            }
          } catch {
            isRefreshing = false;
            this.clearTokens();
            window.dispatchEvent(new CustomEvent('decidix:auth:logout'));
          }
        } else {
          // Wait for the active refresh to finish
          const retryToken = await new Promise<string>((resolve) => {
            subscribeTokenRefresh((newToken) => resolve(newToken));
          });
          headers['Authorization'] = `Bearer ${retryToken}`;
          response = await fetch(url, { ...options, headers });
        }
      }
    }

    if (!response.ok) {
      let errorPayload: ApiErrorPayload = {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Request failed',
      };
      try {
        const body = await response.json();
        if (body.error) {
          errorPayload = body.error;
        } else if (body.message) {
          errorPayload.message = body.message;
        }
      } catch {
        // Response wasn't valid JSON, fallback to standard error
      }
      throw new DecidixApiError(response.status, errorPayload);
    }

    // 204 No Content
    if (response.status === 204) {
      return { data: {} as T };
    }

    const json = await response.json();
    // Support envelope { data: ..., meta: ... } or raw json
    if (json && typeof json === 'object' && 'data' in json) {
      return { data: json.data as T, meta: json.meta };
    }
    return { data: json as T };
  },

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
