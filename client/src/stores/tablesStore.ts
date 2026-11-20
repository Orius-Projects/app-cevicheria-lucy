import { create } from 'zustand';
import { TableStatus } from '@cevicheria/shared';
import apiClient from '../api/client';

export interface TableItem {
  id: string;
  code: string;
  zone?: string;
  seats?: number;
  state: TableStatus;
  openSessionId: string | null;
}

interface TablesState {
  tables: TableItem[];
  selectedTable: TableItem | null;
  isLoading: boolean;
  error: string | null;
  fetchTables: () => Promise<void>;
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
