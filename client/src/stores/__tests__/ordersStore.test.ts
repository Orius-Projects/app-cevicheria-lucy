import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOrdersStore } from '../ordersStore';
import { ordersApi } from '../../api/orders.api';
import { OrderDTO } from '@cevicheria/shared';

vi.mock('../../api/orders.api', () => ({
  ordersApi: {
    listActive: vi.fn(),
    listReady: vi.fn(),
    getById: vi.fn(),
    deliver: vi.fn(),
    cancel: vi.fn(),
    create: vi.fn()
  },
  extractApiError: vi.fn((err: any) => ({
    code: err?.response?.data?.error?.code || 'UNKNOWN_ERROR',
    message: err?.response?.data?.error?.message || err?.message || 'Error desconocido'
  }))
}));

describe('ordersStore', () => {
  const baseOrder: OrderDTO = {
    id: 'ord-1',
    orderNumber: 1,
    shiftId: 'shift-1',
    tableId: 'tbl-1',
    tableCode: 'M-01',
    tableSessionId: 'sess-1',
    status: 'ENVIADO',
    items: [
      {
        dishId: 'dish-1',
        dishName: 'Ceviche Clásico',
        sectionName: 'CEVICHES',
        unitPriceCents: 3500,
        quantity: 2,
        lineTotalCents: 7000,
        notes: 'Sin cebolla'
      }
    ],
    totalCents: 7000,
    currency: 'PEN',
    takenByUserId: 'user-1',
    takenByName: 'Mozo Juan',
    statusHistory: [],
    manualClose: false,
    enviadoEn: '2026-11-18T12:00:00.000Z',
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z',
    version: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useOrdersStore.setState({
      active: [],
      ready: [],
      detail: {},
      loading: false,
      error: null
    });
  });

  it('fetches active and ready orders and stores them', async () => {
    const readyOrder: OrderDTO = {
      ...baseOrder,
      id: 'ord-2',
      orderNumber: 2,
      status: 'LISTO',
      listoEn: '2026-11-18T12:10:00.000Z'
    };

    (ordersApi.listActive as any).mockResolvedValue({
      data: [baseOrder, readyOrder],
      meta: { total: 2 }
    });
    (ordersApi.listReady as any).mockResolvedValue({
      data: [readyOrder],
      meta: { total: 1 }
    });

    await useOrdersStore.getState().refreshAll();

    const state = useOrdersStore.getState();
    expect(state.active).toHaveLength(2);
    expect(state.ready).toHaveLength(1);
    expect(state.ready[0].id).toBe('ord-2');
  });

  it('deduplicates orders by ID on fetchActive', async () => {
    (ordersApi.listActive as any).mockResolvedValue({
      data: [baseOrder, baseOrder],
      meta: { total: 2 }
    });

    await useOrdersStore.getState().fetchActive();

    expect(useOrdersStore.getState().active).toHaveLength(1);
  });

  it('delivers order: updates detail and removes from active and ready list', async () => {
    const readyOrder: OrderDTO = {
      ...baseOrder,
      id: 'ord-ready',
      status: 'LISTO',
      version: 2
    };

    const deliveredOrder: OrderDTO = {
      ...readyOrder,
      status: 'ENTREGADO',
      deliveredByUserId: 'mozo-2',
      deliveredByName: 'Mozo Maria',
      entregadoEn: '2026-11-18T12:20:00.000Z',
      version: 3
    };

    useOrdersStore.setState({
      active: [readyOrder],
      ready: [readyOrder],
      detail: { [readyOrder.id]: readyOrder }
    });

    (ordersApi.deliver as any).mockResolvedValue(deliveredOrder);

    const result = await useOrdersStore.getState().deliverOrder('ord-ready', 2);

    expect(result.status).toBe('ENTREGADO');
    const state = useOrdersStore.getState();
    expect(state.active).toHaveLength(0);
    expect(state.ready).toHaveLength(0);
    expect(state.detail['ord-ready']?.status).toBe('ENTREGADO');
  });

  it('cancels order: updates detail and removes from active and ready list', async () => {
    useOrdersStore.setState({
      active: [baseOrder],
      ready: [],
      detail: { [baseOrder.id]: baseOrder }
    });

    const cancelledOrder: OrderDTO = {
      ...baseOrder,
      status: 'CANCELADO',
      cancelReason: 'Cliente desistió',
      cancelledByUserId: 'mozo-1',
      cancelledByName: 'Mozo Juan',
      canceladoEn: '2026-11-18T12:05:00.000Z',
      version: 2
    };

    (ordersApi.cancel as any).mockResolvedValue(cancelledOrder);

    const result = await useOrdersStore.getState().cancelOrder('ord-1', 'Cliente desistió', 1);

    expect(result.status).toBe('CANCELADO');
    expect(result.cancelReason).toBe('Cliente desistió');
    const state = useOrdersStore.getState();
    expect(state.active).toHaveLength(0);
    expect(state.detail['ord-1']?.status).toBe('CANCELADO');
  });

  it('handles 409 VERSION_CONFLICT during deliver by refreshing data and setting error', async () => {
    const error409 = {
      response: {
        status: 409,
        data: {
          error: {
            code: 'VERSION_CONFLICT',
            message: 'El pedido fue modificado concurrentemente'
          }
        }
      }
    };
    (ordersApi.deliver as any).mockRejectedValue(error409);
    (ordersApi.listActive as any).mockResolvedValue({ data: [], meta: { total: 0 } });
    (ordersApi.listReady as any).mockResolvedValue({ data: [], meta: { total: 0 } });

    await expect(useOrdersStore.getState().deliverOrder('ord-1', 1)).rejects.toThrow();

    expect(ordersApi.listActive).toHaveBeenCalled();
    expect(useOrdersStore.getState().error).toContain('concurrentemente');
  });

  it('applies realtime events from Socket.IO: order:created, order:ready, order:delivered, order:cancelled', () => {
    // 1. order:created
    useOrdersStore.getState().applyOrderEvent({
      event: 'order:created',
      order: baseOrder
    });
    expect(useOrdersStore.getState().active).toHaveLength(1);
    expect(useOrdersStore.getState().ready).toHaveLength(0);

    // 2. order:ready -> moved into ready list as well
    const readyOrder: OrderDTO = {
      ...baseOrder,
      status: 'LISTO',
      listoEn: '2026-11-18T12:15:00.000Z',
      version: 2
    };
    useOrdersStore.getState().applyOrderEvent({
      event: 'order:ready',
      order: readyOrder
    });
    expect(useOrdersStore.getState().active).toHaveLength(1);
    expect(useOrdersStore.getState().ready).toHaveLength(1);
    expect(useOrdersStore.getState().ready[0].status).toBe('LISTO');

    // 3. order:delivered -> removed from active and ready
    const deliveredOrder: OrderDTO = {
      ...readyOrder,
      status: 'ENTREGADO',
      deliveredByUserId: 'mozo-2',
      entregadoEn: '2026-11-18T12:20:00.000Z',
      version: 3
    };
    useOrdersStore.getState().applyOrderEvent({
      event: 'order:delivered',
      order: deliveredOrder
    });
    expect(useOrdersStore.getState().active).toHaveLength(0);
    expect(useOrdersStore.getState().ready).toHaveLength(0);
  });
});
