/// <reference types="vite/client" />
const API_BASE = import.meta.env.VITE_API_URL || '/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retryRes = await fetch(url, { ...options, headers });
      if (!retryRes.ok) {
        const error = await retryRes.json().catch(() => ({ error: retryRes.statusText }));
        throw new Error(error.error || `HTTP ${retryRes.status}`);
      }
      return retryRes.json();
    }
    throw new Error(errorBody.error || 'Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
