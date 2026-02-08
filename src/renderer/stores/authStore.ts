import { create } from 'zustand';
import { api, setAccessToken } from '../api/client';
import type { User } from '../../shared/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; grade?: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,

  login: async (email, password) => {
    const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, isAuthenticated: true });
  },

  register: async (regData) => {
    const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', regData);
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    set({ loading: true });
    try {
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, loading: false });
    } catch {
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },
}));
