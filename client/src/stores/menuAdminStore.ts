import { create } from 'zustand';
import {
  MenuSectionDTO,
  DishDTO,
  CreateDishInput,
  UpdateDishInput,
  RationAdjustmentDTO
} from '@cevicheria/shared';
import {
  menuApi,
  MenuDayDetailResponse,
  UpdateMenuDayData
} from '../api/menu.api';

export function getTodayLimaDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

interface MenuAdminState {
  selectedDate: string;
  menuDay: MenuDayDetailResponse | null;
  dishes: DishDTO[];
  sections: MenuSectionDTO[];
  adjustments: Record<string, RationAdjustmentDTO[]>;
  loading: boolean;
  error: string | null;

  setSelectedDate: (date: string) => void;
  loadDishesAndSections: () => Promise<void>;
  loadDay: (date?: string) => Promise<void>;
  createDay: (date: string, notes?: string) => Promise<void>;
  updateDay: (data: UpdateMenuDayData) => Promise<void>;
  publish: () => Promise<void>;
  createDish: (data: CreateDishInput) => Promise<DishDTO>;
  updateDish: (id: string, data: UpdateDishInput) => Promise<DishDTO>;
  deactivateDish: (id: string) => Promise<void>;
  replenish: (menuItemId: string, quantity: number, reason: string) => Promise<void>;
  adjust: (menuItemId: string, remainingRations: number, reason: string) => Promise<void>;
  soldOut: (menuItemId: string, reason: string) => Promise<void>;
  reactivate: (menuItemId: string, reason?: string) => Promise<void>;
  loadAdjustments: (menuItemId: string) => Promise<RationAdjustmentDTO[]>;
  clearError: () => void;
}

export const useMenuAdminStore = create<MenuAdminState>((set, get) => ({
  selectedDate: getTodayLimaDate(),
  menuDay: null,
  dishes: [],
  sections: [],
  adjustments: {},
  loading: false,
  error: null,

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    get().loadDay(date);
  },

  loadDishesAndSections: async () => {
    set({ loading: true, error: null });
    try {
      const [sections, dishes] = await Promise.all([
        menuApi.getSections(),
        menuApi.getDishes()
      ]);
      set({ sections, dishes, loading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al cargar platos y secciones',
        loading: false
      });
    }
  },

  loadDay: async (dateOverride?: string) => {
    const date = dateOverride || get().selectedDate;
    set({ loading: true, error: null });
    try {
      const menuDay = await menuApi.getMenuDayByDate(date);
      set({ menuDay, loading: false });
    } catch (err: any) {
      if (err.response?.status === 404) {
        set({ menuDay: null, loading: false });
      } else {
        set({
          error: err.response?.data?.error?.message || err.message || 'Error al cargar el menú del día',
          loading: false
        });
      }
    }
  },

  createDay: async (date: string, notes?: string) => {
    set({ loading: true, error: null });
    try {
      await menuApi.createMenuDay(date, notes);
      await get().loadDay(date);
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al crear el menú del día',
        loading: false
      });
      throw err;
    }
  },

  updateDay: async (data: UpdateMenuDayData) => {
    const { menuDay } = get();
    if (!menuDay) throw new Error('No hay menú del día seleccionado');
    set({ loading: true, error: null });
    try {
      await menuApi.updateMenuDay(menuDay.id, data);
      await get().loadDay(menuDay.date);
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al actualizar el menú del día',
        loading: false
      });
      throw err;
    }
  },

  publish: async () => {
    const { menuDay } = get();
    if (!menuDay) throw new Error('No hay menú del día seleccionado');
    set({ loading: true, error: null });
    try {
      await menuApi.publishMenuDay(menuDay.id);
      await get().loadDay(menuDay.date);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Error al publicar menú del día';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  createDish: async (data: CreateDishInput) => {
    set({ loading: true, error: null });
    try {
      const newDish = await menuApi.createDish(data);
      const dishes = await menuApi.getDishes();
      set({ dishes, loading: false });
      return newDish;
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al crear plato',
        loading: false
      });
      throw err;
    }
  },

  updateDish: async (id: string, data: UpdateDishInput) => {
    set({ loading: true, error: null });
    try {
      const updated = await menuApi.updateDish(id, data);
      const dishes = await menuApi.getDishes();
      set({ dishes, loading: false });
      return updated;
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al actualizar plato',
        loading: false
      });
      throw err;
    }
  },

  deactivateDish: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await menuApi.deleteDish(id);
      const dishes = await menuApi.getDishes();
      set({ dishes, loading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al dar de baja el plato',
        loading: false
      });
      throw err;
    }
  },

  replenish: async (menuItemId: string, quantity: number, reason: string) => {
    set({ loading: true, error: null });
    try {
      const updatedItem = await menuApi.replenishRations(menuItemId, quantity, reason);
      const { menuDay } = get();
      if (menuDay) {
        const nextItems = menuDay.items.map((item) =>
          item.id === menuItemId ? { ...item, ...updatedItem } : item
        );
        set({ menuDay: { ...menuDay, items: nextItems }, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al reponer raciones',
        loading: false
      });
      throw err;
    }
  },

  adjust: async (menuItemId: string, remainingRations: number, reason: string) => {
    set({ loading: true, error: null });
    try {
      const updatedItem = await menuApi.adjustRations(menuItemId, remainingRations, reason);
      const { menuDay } = get();
      if (menuDay) {
        const nextItems = menuDay.items.map((item) =>
          item.id === menuItemId ? { ...item, ...updatedItem } : item
        );
        set({ menuDay: { ...menuDay, items: nextItems }, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al ajustar raciones',
        loading: false
      });
      throw err;
    }
  },

  soldOut: async (menuItemId: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const updatedItem = await menuApi.markSoldOut(menuItemId, reason);
      const { menuDay } = get();
      if (menuDay) {
        const nextItems = menuDay.items.map((item) =>
          item.id === menuItemId ? { ...item, ...updatedItem } : item
        );
        set({ menuDay: { ...menuDay, items: nextItems }, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al marcar agotado',
        loading: false
      });
      throw err;
    }
  },

  reactivate: async (menuItemId: string, reason?: string) => {
    set({ loading: true, error: null });
    try {
      const updatedItem = await menuApi.reactivateDish(menuItemId, reason);
      const { menuDay } = get();
      if (menuDay) {
        const nextItems = menuDay.items.map((item) =>
          item.id === menuItemId ? { ...item, ...updatedItem } : item
        );
        set({ menuDay: { ...menuDay, items: nextItems }, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al reactivar plato',
        loading: false
      });
      throw err;
    }
  },

  loadAdjustments: async (menuItemId: string) => {
    try {
      const list = await menuApi.getRationAdjustments(menuItemId);
      set((state) => ({
        adjustments: { ...state.adjustments, [menuItemId]: list }
      }));
      return list;
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || err.message || 'Error al cargar historial de ajustes'
      });
      throw err;
    }
  },

  clearError: () => set({ error: null })
}));
