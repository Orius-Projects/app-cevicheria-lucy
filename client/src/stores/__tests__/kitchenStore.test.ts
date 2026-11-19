import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useKitchenStore, sortFifo, dedupeOrders } from '../kitchenStore';
import { kitchenApi } from '../../api/kitchen.api';
import { OrderDTO } from '@cevicheria/shared';

vi.mock('../../api/kitchen.api', () => ({
  kitchenApi: {
    getBoard: vi.fn(),
    markReady: vi.fn()
  },
  extractApiError: vi.fn((err: any) => ({
    code: err?.response?.data?.error?.code || 'UNKNOWN_ERROR',
    message: err?.response?.data?.error?.message || err?.message || 'Error desconocido'
  }))
}));

describe('kitchenStore', () => {
  const createMockOrder = (
    id: string,
    orderNumber: number,
    enviadoEn: string,
    status: 'ENVIADO' | 'LISTO' | 'ENTREGADO' | 'CANCELADO' = 'ENVIADO',
    version = 1
  ): OrderDTO => ({
    id,
    orderNumber,
    shiftId: 'shift-1',
    tableId: `tbl-${orderNumber}`,
    tableCode: `M-0${orderNumber}`,
    tableSessionId: 'sess-1',
    takenByUserId: 'mozo-1',
    takenByName: 'Carlos Mozo',
    status,
    items: [
      {
        dishId: 'dish-1',
        dishName: 'Ceviche Clásico',
        sectionName: 'CEVICHES',
        unitPriceCents: 3500,
        quantity: 1,
        lineTotalCents: 3500,
        variations: [{ id: 'v1', name: 'Sin ají' }],
        notes: 'Bien frío'
      }
    ],
    totalCents: 3500,
    currency: 'PEN',
    statusHistory: [],
    manualClose: false,
    enviadoEn,
    listoEn: status === 'LISTO' ? '2026-11-18T12:30:00.000Z' : null,
    createdAt: enviadoEn,
    updatedAt: enviadoEn,
    version
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useKitchenStore.setState({
      pending: [],
      ready: [],
      loading: false,
      error: null,
      connection: 'connected',
      announcement: null,
      recentOrderIds: []
    });
  });

  it('sortFifo sorts 10 orders strictly in ascending chronological order of arrival (FIFO)', () => {
    // Generar 10 pedidos con marcas de llegada desordenadas
    const timestamps = [
      '2026-11-18T12:09:00.000Z',
      '2026-11-18T12:02:00.000Z',
      '2026-11-18T12:07:00.000Z',
      '2026-11-18T12:01:00.000Z',
      '2026-11-18T12:10:00.000Z',
      '2026-11-18T12:05:00.000Z',
      '2026-11-18T12:03:00.000Z',
      '2026-11-18T12:08:00.000Z',
      '2026-11-18T12:04:00.000Z',
      '2026-11-18T12:06:00.000Z'
    ];

    const unorderedOrders = timestamps.map((ts, idx) =>
      createMockOrder(`ord-${idx + 1}`, idx + 1, ts)
    );

    const sorted = sortFifo(unorderedOrders);

    expect(sorted).toHaveLength(10);
    // Verificar que cada elemento sea menor o igual en marca de llegada al siguiente
    for (let i = 0; i < sorted.length - 1; i++) {
      const t1 = new Date(sorted[i].enviadoEn).getTime();
      const t2 = new Date(sorted[i + 1].enviadoEn).getTime();
      expect(t1).toBeLessThanOrEqual(t2);
    }

    // El primero debe ser el del timestamp 12:01:00 (ord-4)
    expect(sorted[0].id).toBe('ord-4');
    // El último debe ser el del timestamp 12:10:00 (ord-5)
    expect(sorted[9].id).toBe('ord-5');
  });

  it('dedupeOrders keeps the highest version and avoids duplicate IDs', () => {
    const o1 = createMockOrder('ord-1', 1, '2026-11-18T12:00:00.000Z', 'ENVIADO', 1);
    const o1Updated = createMockOrder('ord-1', 1, '2026-11-18T12:00:00.000Z', 'ENVIADO', 2);
    const o2 = createMockOrder('ord-2', 2, '2026-11-18T12:01:00.000Z', 'ENVIADO', 1);

    const deduped = dedupeOrders([o1, o2, o1Updated]);
    expect(deduped).toHaveLength(2);
    const foundO1 = deduped.find((o) => o.id === 'ord-1');
    expect(foundO1?.version).toBe(2);
  });

  it('loadBoard: excludes non-ENVIADO orders from pending and populates ready', async () => {
    const p1 = createMockOrder('ord-1', 1, '2026-11-18T12:05:00.000Z', 'ENVIADO');
    const p2 = createMockOrder('ord-2', 2, '2026-11-18T12:02:00.000Z', 'ENVIADO');
    const r1 = createMockOrder('ord-3', 3, '2026-11-18T11:50:00.000Z', 'LISTO');
    const ent1 = createMockOrder('ord-4', 4, '2026-11-18T11:40:00.000Z', 'ENTREGADO');
    const canc1 = createMockOrder('ord-5', 5, '2026-11-18T11:30:00.000Z', 'CANCELADO');

    (kitchenApi.getBoard as any).mockResolvedValue({
      pending: [p1, ent1, p2, canc1], // Servidor envía mezclado
      ready: [r1]
    });

    await useKitchenStore.getState().loadBoard();

    const state = useKitchenStore.getState();
    // Excluye ENTREGADO y CANCELADO, ordena FIFO (ord-2 antes de ord-1)
    expect(state.pending).toHaveLength(2);
    expect(state.pending[0].id).toBe('ord-2');
    expect(state.pending[1].id).toBe('ord-1');

    // Listos contiene solo ord-3
    expect(state.ready).toHaveLength(1);
    expect(state.ready[0].id).toBe('ord-3');
    expect(state.connection).toBe('connected');
  });

  it('markReady: transitions order from pending to ready and updates announcement', async () => {
    const p1 = createMockOrder('ord-1', 1, '2026-11-18T12:00:00.000Z', 'ENVIADO', 1);
    useKitchenStore.setState({ pending: [p1], ready: [] });

    const readyOrder = { ...p1, status: 'LISTO' as const, version: 2 };
    (kitchenApi.markReady as any).mockResolvedValue(readyOrder);

    const result = await useKitchenStore.getState().markReady('ord-1', 1);

    expect(result.status).toBe('LISTO');
    const state = useKitchenStore.getState();
    expect(state.pending).toHaveLength(0);
    expect(state.ready).toHaveLength(1);
    expect(state.ready[0].id).toBe('ord-1');
    expect(state.ready[0].status).toBe('LISTO');
    expect(state.announcement).toContain('marcado como listo');
  });

  it('markReady: handles 409 VERSION_CONFLICT by setting error and triggering loadBoard()', async () => {
    const p1 = createMockOrder('ord-1', 1, '2026-11-18T12:00:00.000Z', 'ENVIADO', 1);
    useKitchenStore.setState({ pending: [p1], ready: [] });

    const err409 = {
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
    (kitchenApi.markReady as any).mockRejectedValue(err409);
    (kitchenApi.getBoard as any).mockResolvedValue({ pending: [], ready: [] });

    await expect(useKitchenStore.getState().markReady('ord-1', 1)).rejects.toThrow();

    expect(kitchenApi.getBoard).toHaveBeenCalledTimes(1);
    expect(useKitchenStore.getState().error).toContain('concurrentemente');
  });

  it('applyEvent handles order:created, order:ready, order:delivered, order:cancelled', () => {
    const o1 = createMockOrder('ord-1', 1, '2026-11-18T12:00:00.000Z', 'ENVIADO');

    // 1. order:created
    useKitchenStore.getState().applyEvent({ event: 'order:created', order: o1 });
    expect(useKitchenStore.getState().pending).toHaveLength(1);
    expect(useKitchenStore.getState().recentOrderIds).toContain('ord-1');

    // 2. order:ready -> pasa de pending a ready
    const o1Ready = { ...o1, status: 'LISTO' as const, version: 2 };
    useKitchenStore.getState().applyEvent({ event: 'order:ready', order: o1Ready });
    expect(useKitchenStore.getState().pending).toHaveLength(0);
    expect(useKitchenStore.getState().ready).toHaveLength(1);

    // 3. order:delivered -> se retira de ready
    const o1Delivered = { ...o1Ready, status: 'ENTREGADO' as const, version: 3 };
    useKitchenStore.getState().applyEvent({ event: 'order:delivered', order: o1Delivered });
    expect(useKitchenStore.getState().ready).toHaveLength(0);

    // 4. order:cancelled -> se retira y genera aviso
    const o2 = createMockOrder('ord-2', 2, '2026-11-18T12:05:00.000Z', 'ENVIADO');
    useKitchenStore.getState().applyEvent({ event: 'order:created', order: o2 });
    expect(useKitchenStore.getState().pending).toHaveLength(1);

    const o2Cancelled = { ...o2, status: 'CANCELADO' as const, version: 2 };
    useKitchenStore.getState().applyEvent({ event: 'order:cancelled', order: o2Cancelled });
    expect(useKitchenStore.getState().pending).toHaveLength(0);
    expect(useKitchenStore.getState().announcement).toContain('ha sido cancelado');
  });
});
