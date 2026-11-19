import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useShiftCloseStore } from '../shiftCloseStore';
import { shiftCloseApi } from '../../api/shiftClose.api';
import {
  ShiftDTO,
  OrderDTO,
  TableWithSession,
  ShiftSummary,
  ManualRecord
} from '@cevicheria/shared';

vi.mock('../../api/shiftClose.api', () => ({
  shiftCloseApi: {
    getCurrentShift: vi.fn(),
    getActiveOrders: vi.fn(),
    getTables: vi.fn(),
    getSummary: vi.fn(),
    closeShift: vi.fn(),
    closeTableSession: vi.fn(),
    manualCloseOrder: vi.fn(),
    getManualRecords: vi.fn(),
    createManualRecord: vi.fn(),
    adjustRations: vi.fn(),
    getRationAdjustments: vi.fn(),
    getTodayMenu: vi.fn()
  },
  extractShiftCloseApiError: vi.fn((err: any) => ({
    code: err?.code || err?.response?.data?.error?.code || 'UNKNOWN_ERROR',
    message: err?.message || err?.response?.data?.error?.message || 'Error en la operación',
    status: err?.status || err?.response?.status
  }))
}));

describe('shiftCloseStore', () => {
  const mockShift: ShiftDTO = {
    id: 'shift-100',
    date: '2026-11-18',
    label: 'Almuerzo',
    status: 'ABIERTO',
    openedBy: 'user-1',
    openedAt: '2026-11-18T12:00:00.000Z',
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z'
  };

  const mockOpenOrders: OrderDTO[] = [
    {
      id: 'ord-1',
      orderNumber: 101,
      shiftId: 'shift-100',
      tableId: 'tbl-1',
      tableCode: 'Mesa 1',
      tableSessionId: 'sess-1',
      takenByUserId: 'waiter-1',
      takenByName: 'Carlos',
      status: 'ENVIADO',
      items: [
        {
          dishId: 'dish-1',
          dishName: 'Ceviche Clásico',
          sectionName: 'MARINO',
          unitPriceCents: 3500,
          quantity: 2,
          lineTotalCents: 7000
        }
      ],
      totalCents: 7000,
      currency: 'PEN',
      statusHistory: [],
      manualClose: false,
      version: 1,
      enviadoEn: '2026-11-18T12:10:00.000Z',
      createdAt: '2026-11-18T12:10:00.000Z',
      updatedAt: '2026-11-18T12:10:00.000Z'
    }
  ];

  const mockTables: TableWithSession[] = [
    {
      id: 'tbl-1',
      code: 'Mesa 1',
      state: 'OCUPADA',
      openSessionId: 'sess-1',
      active: true
    },
    {
      id: 'tbl-2',
      code: 'Mesa 2',
      state: 'LIBRE',
      openSessionId: null,
      active: true
    }
  ];

  const mockSummary: ShiftSummary = {
    shiftId: 'shift-100',
    date: '2026-11-18',
    label: 'Almuerzo',
    soldDishes: [
      {
        dishId: 'dish-1',
        dishName: 'Ceviche Clásico',
        quantity: 5,
        amountCents: 17500
      }
    ],
    remainingRations: [
      {
        dishId: 'dish-1',
        dishName: 'Ceviche Clásico',
        remainingRations: 8
      }
    ],
    soldOutDishes: [
      {
        dishId: 'dish-2',
        dishName: 'Arroz con Mariscos',
        reason: 'Raciones agotadas'
      }
    ],
    cancellations: [
      {
        orderNumber: 99,
        reason: 'Error en comanda',
        cancelledBy: 'Carlos'
      }
    ],
    manualRecords: [],
    manualTotalCents: 0,
    totalAmountCents: 17500,
    observations: 'Sin observaciones',
    closedAt: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useShiftCloseStore.setState({
      shift: null,
      openOrders: [],
      openTables: [],
      summary: null,
      manualRecords: [],
      todayMenuItems: [],
      loading: false,
      error: null,
      highlightedTableCode: null
    });
  });

  it('carga: loadAll recupera turno, pedidos pendientes, mesas abiertas y resumen', async () => {
    vi.mocked(shiftCloseApi.getCurrentShift).mockResolvedValue(mockShift);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue(mockOpenOrders);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue(mockTables);
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue(mockSummary);
    vi.mocked(shiftCloseApi.getManualRecords).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTodayMenu).mockResolvedValue({
      sections: [
        {
          key: 'MARINO',
          name: 'Marino',
          items: [
            {
              id: 'menu-item-1',
              dishId: 'dish-1',
              dishName: 'Ceviche Clásico',
              sectionKey: 'MARINO',
              priceCents: 3500,
              active: true,
              hasRationsLimit: true,
              remainingRations: 8,
              lowStockThreshold: 5,
              manuallySoldOut: false,
              updatedAt: '2026-11-18T12:00:00.000Z',
              version: 1
            }
          ]
        }
      ]
    });

    await useShiftCloseStore.getState().loadAll();

    const state = useShiftCloseStore.getState();
    expect(state.loading).toBe(false);
    expect(state.shift?.id).toBe('shift-100');
    expect(state.openOrders).toHaveLength(1);
    expect(state.openOrders[0].orderNumber).toBe(101);
    // Solo mesas con sesión abierta
    expect(state.openTables).toHaveLength(1);
    expect(state.openTables[0].code).toBe('Mesa 1');
    expect(state.summary?.totalAmountCents).toBe(17500);
    expect(state.todayMenuItems).toHaveLength(1);
  });

  it('409 de cierre: closeShift captura conflicto y refresca pendientes', async () => {
    useShiftCloseStore.setState({
      shift: mockShift,
      openOrders: mockOpenOrders,
      openTables: [mockTables[0]],
      summary: mockSummary
    });

    const conflictErr = {
      code: 'OPEN_ORDERS_REMAIN',
      message: 'Existen pedidos pendientes o listos sin entregar'
    };
    vi.mocked(shiftCloseApi.closeShift).mockRejectedValue(conflictErr);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue(mockOpenOrders);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue(mockTables);

    await expect(
      useShiftCloseStore.getState().closeShift('Observación')
    ).rejects.toEqual(conflictErr);

    const state = useShiftCloseStore.getState();
    expect(state.error).toBe('Existen pedidos pendientes o listos sin entregar');
    // Verifica que se hayan consultado los pendientes tras el 409
    expect(shiftCloseApi.getActiveOrders).toHaveBeenCalled();
    expect(shiftCloseApi.getTables).toHaveBeenCalled();
  });

  it('cierre de mesa: cierra sesión exitosamente y refresca resumen', async () => {
    useShiftCloseStore.setState({
      shift: mockShift,
      openTables: [mockTables[0]],
      summary: mockSummary
    });

    vi.mocked(shiftCloseApi.closeTableSession).mockResolvedValue({
      id: 'sess-1',
      status: 'CERRADA'
    });
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue(mockSummary);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue([
      { ...mockTables[0], openSessionId: null, state: 'LIBRE' }
    ]);

    await useShiftCloseStore.getState().closeTable('sess-1');

    const state = useShiftCloseStore.getState();
    expect(shiftCloseApi.closeTableSession).toHaveBeenCalledWith('sess-1', undefined);
    expect(state.openTables).toHaveLength(0);
    expect(shiftCloseApi.getSummary).toHaveBeenCalledWith('shift-100');
  });

  it('cierre de mesa fallido por TABLE_HAS_ACTIVE_ORDERS: almacena error en store', async () => {
    useShiftCloseStore.setState({
      shift: mockShift,
      openTables: [mockTables[0]],
      summary: mockSummary
    });

    const activeOrdersErr = {
      code: 'TABLE_HAS_ACTIVE_ORDERS',
      message: 'No se puede cerrar la mesa: existen pedidos activos'
    };
    vi.mocked(shiftCloseApi.closeTableSession).mockRejectedValue(activeOrdersErr);

    await expect(
      useShiftCloseStore.getState().closeTable('sess-1')
    ).rejects.toEqual(activeOrdersErr);

    const state = useShiftCloseStore.getState();
    expect(state.error).toBe('No se puede cerrar la mesa: existen pedidos activos');
  });

  it('manualCloseOrder: cierra pedido manualmente, actualiza lista y refresca resumen', async () => {
    useShiftCloseStore.setState({
      shift: mockShift,
      openOrders: mockOpenOrders,
      summary: mockSummary
    });

    vi.mocked(shiftCloseApi.manualCloseOrder).mockResolvedValue({
      ...mockOpenOrders[0],
      status: 'ENTREGADO',
      manualClose: true,
      manualCloseReason: 'Entregado en mesa sin registrar'
    });
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue(mockSummary);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue([]);

    await useShiftCloseStore
      .getState()
      .manualCloseOrder('ord-1', 'Entregado en mesa sin registrar');

    expect(shiftCloseApi.manualCloseOrder).toHaveBeenCalledWith(
      'ord-1',
      'Entregado en mesa sin registrar'
    );
    expect(useShiftCloseStore.getState().openOrders).toHaveLength(0);
  });

  it('addManualRecord: registra comanda en papel y actualiza manualRecords', async () => {
    useShiftCloseStore.setState({
      shift: mockShift,
      manualRecords: [],
      summary: mockSummary
    });

    const createdRecord: ManualRecord = {
      id: 'rec-1',
      tableCode: 'Mesa 4',
      items: [{ name: 'Ceviche Mixto', quantity: 1, amountCents: 4000 }],
      totalCents: 4000,
      notes: 'Por corte de red',
      source: 'PAPER',
      createdAt: '2026-11-18T13:00:00.000Z'
    };

    vi.mocked(shiftCloseApi.createManualRecord).mockResolvedValue(createdRecord);
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue({
      ...mockSummary,
      manualRecords: [createdRecord],
      manualTotalCents: 4000
    });
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue([]);

    await useShiftCloseStore.getState().addManualRecord({
      tableCode: 'Mesa 4',
      items: [{ name: 'Ceviche Mixto', quantity: 1, amountCents: 4000 }],
      totalCents: 4000,
      notes: 'Por corte de red'
    });

    expect(shiftCloseApi.createManualRecord).toHaveBeenCalled();
    expect(useShiftCloseStore.getState().manualRecords).toHaveLength(1);
    expect(useShiftCloseStore.getState().manualRecords[0].tableCode).toBe('Mesa 4');
  });
});
