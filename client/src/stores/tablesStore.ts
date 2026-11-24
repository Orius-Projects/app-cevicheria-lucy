import { create } from 'zustand';
import { TableStatus } from '@cevicheria/shared';
import apiClient from '../api/client';

export interface TableItem {
  id: string;
  code: string;
  zone?: string;
  seats?: number;
  active?: boolean;
  state: TableStatus;
  openSessionId: string | null;
}

interface TablesState {
  tables: TableItem[];
  selectedTable: TableItem | null;
  isLoading: boolean;
  error: string | null;
  fetchTables: () => Promise<void>;
  createTable: (payload: { code: string; zone?: string; seats?: number; active?: boolean }) => Promise<TableItem>;
  updateTable: (id: string, payload: { code?: string; zone?: string; seats?: number; active?: boolean }) => Promise<TableItem>;
  selectTable: (table: TableItem | null) => void;
  closeSession: (sessionId: string, notes?: string) => Promise<void>;
  clearError: () => void;
}

export const useTablesStore = create<TablesState>((set, get) => ({
  tables: [],
  selectedTable: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchTables: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/tables');
      const raw = response.data?.data ?? response.data;
      const safeTables = Array.isArray(raw) ? raw : [];
      set({ tables: safeTables, isLoading: false });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Error al obtener la lista de mesas';
      set({ isLoading: false, error: message });
    }
  },

  createTable: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/tables', payload);
      await get().fetchTables();
      set({ isLoading: false });
      return response.data;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Error al crear la mesa';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  updateTable: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.patch(`/tables/${id}`, payload);
      await get().fetchTables();
      set({ isLoading: false });
      return response.data;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Error al actualizar la mesa';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  selectTable: (table) => {
    set({ selectedTable: table });
  },

  closeSession: async (sessionId: string, notes?: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(`/table-sessions/${sessionId}/close`, { notes });
      await get().fetchTables();
      set({ isLoading: false });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Error al cerrar la sesión de mesa';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  }
}));

export default useTablesStore;
