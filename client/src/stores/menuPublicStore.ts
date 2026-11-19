import { create } from 'zustand';
import { DishStatus } from '@cevicheria/shared';
import { menuApi, TodayMenuResponse } from '../api/menu.api';

export interface AvailabilityEventPayload {
  menuItemId: string;
  dishId?: string;
  dishName?: string;
  remainingRations?: number | null;
  manuallySoldOut?: boolean;
  status: DishStatus;
}

interface MenuPublicState {
  todayMenu: TodayMenuResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  soldOutToast: string | null;

  loadToday: (dateOverride?: string) => Promise<void>;
  refreshAfterOrder: () => Promise<void>;
  applyAvailabilityEvent: (payload: AvailabilityEventPayload) => void;
  clearSoldOutToast: () => void;
  clearError: () => void;
}

export const useMenuPublicStore = create<MenuPublicState>((set, get) => ({
  todayMenu: null,
  loading: false,
  error: null,
  lastUpdatedAt: null,
  soldOutToast: null,

  loadToday: async (dateOverride?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await menuApi.getMenuToday(dateOverride);
      set({
        todayMenu: data,
        loading: false,
        lastUpdatedAt: new Date()
      });
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.error?.code === 'MENU_NOT_PUBLISHED') {
        set({
          todayMenu: null,
          error: 'No hay menú publicado para el día de hoy.',
          loading: false
        });
      } else {
        set({
          error: err.response?.data?.error?.message || err.message || 'Error al cargar el menú del día',
          loading: false
        });
      }
    }
  },

  refreshAfterOrder: async () => {
    try {
      const data = await menuApi.getMenuToday();
      set({
        todayMenu: data,
        lastUpdatedAt: new Date()
      });
    } catch {
      // Silencioso tras orden
    }
  },

  applyAvailabilityEvent: (payload: AvailabilityEventPayload) => {
    const { todayMenu } = get();
    if (!todayMenu) return;

    let updatedDishName = payload.dishName;

    const nextSections = todayMenu.sections.map((section) => {
      const nextItems = section.items.map((item) => {
        if (item.id === payload.menuItemId) {
          if (!updatedDishName) updatedDishName = item.dishName;
          return {
            ...item,
            remainingRations:
              payload.remainingRations !== undefined
                ? payload.remainingRations
                : item.remainingRations,
            manuallySoldOut:
              payload.manuallySoldOut !== undefined
                ? payload.manuallySoldOut
                : item.manuallySoldOut,
            status: payload.status
          };
        }
        return item;
      });
      return { ...section, items: nextItems };
    });

    const nextToast =
      payload.status === 'AGOTADO'
        ? `El plato "${updatedDishName || 'Plato'}" se ha agotado. Ofrece una alternativa al cliente.`
        : get().soldOutToast;

    set({
      todayMenu: { ...todayMenu, sections: nextSections },
      lastUpdatedAt: new Date(),
      soldOutToast: nextToast
    });
  },

  clearSoldOutToast: () => set({ soldOutToast: null }),
  clearError: () => set({ error: null })
}));
