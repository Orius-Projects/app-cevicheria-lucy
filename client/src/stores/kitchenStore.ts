import { create } from 'zustand';
import { OrderDTO, KitchenConnectionState } from '@cevicheria/shared';
import { kitchenApi, extractApiError } from '../api/kitchen.api';

export function sortFifo(orders: OrderDTO[]): OrderDTO[] {
  return [...orders].sort(
    (a, b) => new Date(a.enviadoEn).getTime() - new Date(b.enviadoEn).getTime()
  );
}

export function dedupeOrders(orders: OrderDTO[]): OrderDTO[] {
  const map = new Map<string, OrderDTO>();
  for (const o of orders) {
    const existing = map.get(o.id);
    if (!existing || o.version >= existing.version) {
      map.set(o.id, o);
    }
  }
  return Array.from(map.values());
}

export interface KitchenState {
  pending: OrderDTO[];
  ready: OrderDTO[];
  loading: boolean;
  error: string | null;
  connection: KitchenConnectionState;
  announcement: string | null;
  recentOrderIds: string[];

  // Acciones
  loadBoard: () => Promise<void>;
  markReady: (id: string, version: number) => Promise<OrderDTO>;
  applyEvent: (
    data:
      | { event: string; order: OrderDTO }
      | { type: string; order: OrderDTO }
      | OrderDTO
  ) => void;
  setConnection: (status: KitchenConnectionState) => void;
  clearError: () => void;
  clearAnnouncement: () => void;
}

export const useKitchenStore = create<KitchenState>((set, get) => ({
  pending: [],
  ready: [],
  loading: false,
  error: null,
  connection: 'connected',
  announcement: null,
  recentOrderIds: [],

  clearError: () => set({ error: null }),
  clearAnnouncement: () => set({ announcement: null }),

  setConnection: (connection) => set({ connection }),

  loadBoard: async () => {
    set({ loading: true, error: null });
    try {
      const board = await kitchenApi.getBoard();
      // Filtrar y ordenar estrictamente
      const cleanPending = sortFifo(
        dedupeOrders((board.pending || []).filter((o) => o.status === 'ENVIADO'))
      );
      const cleanReady = dedupeOrders(
        (board.ready || []).filter((o) => o.status === 'LISTO')
      );

      set({
        pending: cleanPending,
        ready: cleanReady,
        loading: false,
        connection: 'connected'
      });
    } catch (err: any) {
      const apiErr = extractApiError(err);
      set({
        loading: false,
        error: apiErr.message,
        connection: 'disconnected'
      });
    }
  },

  markReady: async (id: string, version: number) => {
    set({ error: null });
    try {
      const updated = await kitchenApi.markReady(id, version);

      // Transición en el store: retirar de pending y agregar a ready
      const currentPending = get().pending.filter((o) => o.id !== id);
      const currentReady = dedupeOrders([
        ...get().ready.filter((o) => o.id !== id),
        updated
      ]);

      set({
        pending: currentPending,
        ready: currentReady,
        announcement: `Pedido #${updated.orderNumber} (Mesa ${updated.tableCode}) marcado como listo.`
      });

      return updated;
    } catch (err: any) {
      const apiErr = extractApiError(err);

      // Si hay conflicto de versión o transición inválida, resincronizar inmediatamente
      if (apiErr.code === 'VERSION_CONFLICT' || apiErr.code === 'INVALID_TRANSITION') {
        try {
          await get().loadBoard();
        } catch {
          // Si falla el refresco, el error original de markReady prevalece
        }
      }
      set({ error: apiErr.message, announcement: `Error: ${apiErr.message}` });
      throw err;
    }
  },

  applyEvent: (data) => {
    let eventName = 'order:created';
    let order: OrderDTO;

    if ('order' in data && data.order) {
      order = data.order;
      eventName = 'event' in data ? data.event : data.type;
    } else {
      order = data as OrderDTO;
      if (order.status === 'LISTO') eventName = 'order:ready';
      else if (order.status === 'ENTREGADO') eventName = 'order:delivered';
      else if (order.status === 'CANCELADO') eventName = 'order:cancelled';
    }

    if (!order || !order.id) return;

    const { pending, ready, recentOrderIds } = get();

    if (eventName === 'order:created' || eventName === 'created') {
      if (order.status !== 'ENVIADO') return;

      const deduplicated = dedupeOrders([...pending.filter((o) => o.id !== order.id), order]);
      const sorted = sortFifo(deduplicated);

      // Agregar a recentOrderIds para animación durante 2s
      set({
        pending: sorted,
        recentOrderIds: [...recentOrderIds, order.id],
        announcement: `Nuevo pedido #${order.orderNumber} para Mesa ${order.tableCode}.`
      });

      // Limpiar animación después de 2s
      setTimeout(() => {
        set((state) => ({
          recentOrderIds: state.recentOrderIds.filter((oid) => oid !== order.id)
        }));
      }, 2000);
    } else if (eventName === 'order:ready' || eventName === 'ready') {
      const nextPending = pending.filter((o) => o.id !== order.id);
      const nextReady = dedupeOrders([...ready.filter((o) => o.id !== order.id), order]);

      set({
        pending: nextPending,
        ready: nextReady
      });
    } else if (eventName === 'order:delivered' || eventName === 'delivered') {
      // Retirar de listos y pendientes
      set({
        pending: pending.filter((o) => o.id !== order.id),
        ready: ready.filter((o) => o.id !== order.id)
      });
    } else if (eventName === 'order:cancelled' || eventName === 'cancelled') {
      // Retirar de listos y pendientes y avisar
      set({
        pending: pending.filter((o) => o.id !== order.id),
        ready: ready.filter((o) => o.id !== order.id),
        announcement: `Pedido #${order.orderNumber} para Mesa ${order.tableCode} ha sido cancelado.`
      });
    }
  }
}));

export default useKitchenStore;
