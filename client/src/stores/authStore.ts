import { create } from 'zustand';
import { UserSummary } from '@cevicheria/shared';
import apiClient from '../api/client';

interface AuthState {
  token: string | null;
  user: UserSummary | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<UserSummary>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('auth_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('auth_token'),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      const { token, user } = response.data;

      localStorage.setItem('auth_token', token);
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return user;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Error de conexión al iniciar sesión';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignora errores al cerrar sesión
    } finally {
      localStorage.removeItem('auth_token');
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        error: null
      });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      set({
        user: response.data,
        isAuthenticated: true
      });
    } catch {
      localStorage.removeItem('auth_token');
      set({
        token: null,
        user: null,
        isAuthenticated: false
      });
    }
  }
}));

export default useAuthStore;
