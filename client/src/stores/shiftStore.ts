import { create } from 'zustand';
import { ShiftStatus } from '@cevicheria/shared';
import apiClient from '../api/client';

export interface CurrentShift {
  id: string;
  date: string;
  label: string;
  status: ShiftStatus;
  openedAt: string;
}

interface ShiftState {
  currentShift: CurrentShift | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  fetchCurrentShift: () => Promise<void>;
  openShift: (label: string, date?: string) => Promise<void>;
  closeShift: (shiftId: string, observations?: string) => Promise<any>;
  markClosed: () => void;
  clearError: () => void;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  isOpen: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  markClosed: () =>
    set((state) => ({
      currentShift: state.currentShift
        ? { ...state.currentShift, status: 'CERRADO' }
        : null,
      isOpen: false
    })),

  fetchCurrentShift: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/shifts/current');
      set({
        currentShift: response.data,
        isOpen: response.data.status === 'ABIERTO',
        isLoading: false
      });
    } catch (err: any) {
      if (err.response?.status === 404) {
        set({ currentShift: null, isOpen: false, isLoading: false, error: null });
      } else {
        const message =
          err.response?.data?.error?.message || 'Error al consultar el turno actual';
        set({ isLoading: false, error: message });
      }
    }
  },

  openShift: async (label: string, date?: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/shifts', { label, date });
      await get().fetchCurrentShift();
      set({ isLoading: false });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Error al abrir el turno';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  closeShift: async (shiftId: string, observations?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post(`/shifts/${shiftId}/close`, { observations });
      set({ currentShift: null, isOpen: false, isLoading: false });
      return response.data;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'Error al cerrar el turno';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  }
}));

export default useShiftStore;
