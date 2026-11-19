import { create } from 'zustand';
import { OrderDTO } from '@cevicheria/shared';
import { ordersApi, extractApiError } from '../api/orders.api';

interface OrdersState {
  active: OrderDTO[];
  ready: OrderDTO[];
  detail: Record<string, OrderDTO>;
  loading: boolean;
  error: string | null;

  // Acciones
  refreshActive: () => Promise<void>;
  refreshReady: () => Promise<void>;
  fetchActive: () => Promise<void>;
  fetchReady: () => Promise<void>;
  refreshAll: () => Promise<void>;
  fetchById: (id: string) => Promise<OrderDTO>;
  deliverOrder: (id: string, version: number) => Promise<OrderDTO>;
  cancelOrder: (id: string, reason: string, version: number) => Promise<OrderDTO>;
  applyOrderEvent: (data: OrderDTO | { event: string; order: OrderDTO }) => void;
  upsertOrder: (order: OrderDTO) => void;
  removeOrder: (id: string) => void;
  clearError: () => void;
}

function dedupeOrders(orders: OrderDTO[]): OrderDTO[] {
  const map = new Map<string, OrderDTO>();
  for (const o of orders) {
    map.set(o.id, o);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.enviadoEn).getTime() - new Date(b.enviadoEn).getTime()
  );
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  active: [],
  ready: [],
  detail: {},
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  refreshActive: async () => {
    try {
      const res = await ordersApi.listActive();
      const activeList = dedupeOrders(res.data);
      const detailMap = { ...get().detail };
      for (const o of activeList) {
        detailMap[o.id] = o;
      }
      set({ active: activeList, detail: detailMap });
    } catch (err: any) {
      const apiErr = extractApiError(err);
      set({ error: apiErr.message });
    }
  },

  fetchActive: async () => {
    return get().refreshActive();
  },

  refreshReady: async () => {
    try {
      const res = await ordersApi.listReady();
      const readyList = dedupeOrders(res.data);
      const detailMap = { ...get().detail };
      for (const o of readyList) {
        detailMap[o.id] = o;
      }
      set({ ready: readyList, detail: detailMap });
    } catch (err: any) {
      const apiErr = extractApiError(err);
      set({ error: apiErr.message });
    }
  },

  fetchReady: async () => {
    return get().refreshReady();
  },

  refreshAll: async () => {
    set({ loading: true, error: null });
    try {
      const [activeRes, readyRes] = await Promise.all([
        ordersApi.listActive(),
        ordersApi.listReady()
      ]);
      const activeList = dedupeOrders(activeRes.data);
      const readyList = dedupeOrders(readyRes.data);
      const detailMap = { ...get().detail };
      for (const o of [...activeList, ...readyList]) {
        detailMap[o.id] = o;
      }
      set({
        active: activeList,
        ready: readyList,
        detail: detailMap,
        loading: false
      });
    } catch (err: any) {
      const apiErr = extractApiError(err);
      set({ loading: false, error: apiErr.message });
    }
  },

  fetchById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const order = await ordersApi.getById(id);
      set((state) => ({
        detail: { ...state.detail, [order.id]: order },
        loading: false
      }));
      return order;
    } catch (err: any) {
      const apiErr = extractApiError(err);
      set({ loading: false, error: apiErr.message });
      throw err;
    }
  },

  deliverOrder: async (id: string, version: number) => {
    set({ error: null });
    try {
      const updated = await ordersApi.deliver(id, version);
      // Remueve de active y ready si pasa a ENTREGADO
      set((state) => ({
        active: state.active.filter((o) => o.id !== id),
        ready: state.ready.filter((o) => o.id !== id),
        detail: { ...state.detail, [id]: updated }
      }));
      return updated;
    } catch (err: any) {
      const apiErr = extractApiError(err);
      // Si hay conflicto de versión o cambio de estado, refrescar listas para sincronizar
      if (apiErr.code === 'VERSION_CONFLICT' || apiErr.code === 'INVALID_TRANSITION') {
        get().refreshAll();
      }
      set({ error: apiErr.message });
      throw err;
    }
  },

  cancelOrder: async (id: string, reason: string, version: number) => {
    set({ error: null });
    try {
      const updated = await ordersApi.cancel(id, reason, version);
      // Remueve de active y ready
      set((state) => ({
        active: state.active.filter((o) => o.id !== id),
        ready: state.ready.filter((o) => o.id !== id),
        detail: { ...state.detail, [id]: updated }
      }));
      return updated;
    } catch (err: any) {
      const apiErr = extractApiError(err);
      if (apiErr.code === 'VERSION_CONFLICT' || apiErr.code === 'INVALID_TRANSITION') {
        get().refreshAll();
      }
      set({ error: apiErr.message });
      throw err;
    }
  },

  upsertOrder: (order: OrderDTO) => {
    get().applyOrderEvent(order);
  },

  removeOrder: (id: string) => {
    set((state) => ({
      active: state.active.filter((o) => o.id !== id),
      ready: state.ready.filter((o) => o.id !== id)
    }));
  },

  applyOrderEvent: (data: OrderDTO | { event: string; order: OrderDTO }) => {
    const order = data && 'order' in data && data.order ? data.order : (data as OrderDTO);
    if (!order || !order.id) return;
    const { active, ready, detail } = get();
    const isTerminal = order.status === 'ENTREGADO' || order.status === 'CANCELADO' || order.manualClose;
    const isReady = order.status === 'LISTO';
    const isActive = order.status === 'ENVIADO' || order.status === 'LISTO';

    let nextActive = [...active];
    let nextReady = [...ready];

    if (isTerminal) {
      nextActive = nextActive.filter((o) => o.id !== order.id);
      nextReady = nextReady.filter((o) => o.id !== order.id);
    } else {
      if (isActive) {
        const idx = nextActive.findIndex((o) => o.id === order.id);
        if (idx >= 0) {
          nextActive[idx] = order;
        } else {
          nextActive.push(order);
        }
        nextActive = dedupeOrders(nextActive);
      }

      if (isReady) {
        const rIdx = nextReady.findIndex((o) => o.id === order.id);
        if (rIdx >= 0) {
          nextReady[rIdx] = order;
        } else {
          nextReady.push(order);
        }
        nextReady = dedupeOrders(nextReady);
      } else {
        nextReady = nextReady.filter((o) => o.id !== order.id);
      }
    }

    set({
      active: nextActive,
      ready: nextReady,
      detail: { ...detail, [order.id]: order }
    });
  }
}));

export default useOrdersStore;
