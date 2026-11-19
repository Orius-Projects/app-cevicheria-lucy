import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ShiftClosePage } from '../pages/encargado/ShiftClosePage';
import { useAuthStore } from '../stores/authStore';
import { useShiftCloseStore } from '../stores/shiftCloseStore';
import { shiftCloseApi } from '../api/shiftClose.api';
import {
  ShiftDTO,
  OrderDTO,
  TableWithSession,
  ShiftSummary
} from '@cevicheria/shared';

vi.mock('../api/shiftClose.api', () => ({
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

describe('Shift Close Flow (Spec 006 Frontend)', () => {
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
      id: 'ord-101',
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
          dishName: 'Ceviche Mixto',
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
      enviadoEn: '2026-11-18T12:15:00.000Z',
      createdAt: '2026-11-18T12:15:00.000Z',
      updatedAt: '2026-11-18T12:15:00.000Z'
    }
  ];

  const mockOpenTables: TableWithSession[] = [
    {
      id: 'tbl-2',
      code: 'Mesa 2',
      state: 'OCUPADA',
      openSessionId: 'sess-2',
      active: true
    }
  ];

  const mockSummaryExact: ShiftSummary = {
    shiftId: 'shift-100',
    date: '2026-11-18',
    label: 'Almuerzo',
    soldDishes: [
      {
        dishId: 'dish-1',
        dishName: 'Ceviche Mixto',
        quantity: 2,
        amountCents: 12350
      }
    ],
    remainingRations: [
      {
        dishId: 'dish-1',
        dishName: 'Ceviche Mixto',
        remainingRations: 5
      }
    ],
    soldOutDishes: [
      {
        dishId: 'dish-2',
        dishName: 'Chicha Morada',
        reason: 'Agotado por mozo'
      }
    ],
    cancellations: [
      {
        orderNumber: 98,
        reason: 'Cliente se retiró',
        cancelledBy: 'Mozo 1'
      }
    ],
    manualRecords: [],
    manualTotalCents: 0,
    totalAmountCents: 12350,
    observations: '',
    closedAt: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'enc-1',
        username: 'encargado1',
        displayName: 'Lucy Encargada',
        role: 'ENCARGADO'
      },
      isAuthenticated: true
    });

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

  it('pendientes visibles: muestra pedidos activos y mesas con sesión abierta', async () => {
    vi.mocked(shiftCloseApi.getCurrentShift).mockResolvedValue(mockShift);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue(mockOpenOrders);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue(mockOpenTables);
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue(mockSummaryExact);
    vi.mocked(shiftCloseApi.getManualRecords).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTodayMenu).mockResolvedValue({ sections: [] });

    render(
      <MemoryRouter>
        <ShiftClosePage />
      </MemoryRouter>
    );

    // Espera carga de datos
    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Pedido visible
    expect(screen.getByText('Mesa 1')).toBeInTheDocument();
    expect(screen.getByText(/2x Ceviche Mixto/i)).toBeInTheDocument();
    expect(screen.getByText('Cerrar manualmente')).toBeInTheDocument();

    // Mesa visible
    expect(screen.getByText('Mesa 2')).toBeInTheDocument();
    expect(screen.getByText('Cerrar mesa')).toBeInTheDocument();
  });

  it('resumen con montos exactos: muestra S/ 123.50, raciones, agotados y cancelaciones', async () => {
    vi.mocked(shiftCloseApi.getCurrentShift).mockResolvedValue(mockShift);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue(mockSummaryExact);
    vi.mocked(shiftCloseApi.getManualRecords).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTodayMenu).mockResolvedValue({ sections: [] });

    render(
      <MemoryRouter>
        <ShiftClosePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Verifica monto exacto formateado S/ 123.50
      const exactAmounts = screen.getAllByText('S/ 123.50');
      expect(exactAmounts.length).toBeGreaterThanOrEqual(1);
    });

    // Etiquetas y secciones requeridas
    expect(screen.getAllByText('Total informativo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Chicha Morada')).toBeInTheDocument();
    expect(screen.getByText(/Agotado por mozo/i)).toBeInTheDocument();
    expect(screen.getByText('#98')).toBeInTheDocument();
    expect(screen.getByText(/Cliente se retiró/i)).toBeInTheDocument();
    expect(screen.getByText('Mozo 1')).toBeInTheDocument();
  });

  it('cierre bloqueado con pendientes: botón deshabilitado cuando hay pedidos o mesas', async () => {
    vi.mocked(shiftCloseApi.getCurrentShift).mockResolvedValue(mockShift);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue(mockOpenOrders);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue(mockOpenTables);
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue(mockSummaryExact);
    vi.mocked(shiftCloseApi.getManualRecords).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTodayMenu).mockResolvedValue({ sections: [] });

    render(
      <MemoryRouter>
        <ShiftClosePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /Cerrar Turno/i });
    expect(closeBtn).toBeDisabled();
    expect(
      screen.getByText(/Hay pedidos o mesas abiertas pendientes/i)
    ).toBeInTheDocument();
  });

  it('cierre exitoso muestra snapshot: cierra turno sin pendientes y activa badge CERRADO', async () => {
    vi.mocked(shiftCloseApi.getCurrentShift).mockResolvedValue(mockShift);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue({
      ...mockSummaryExact,
      observations: ''
    });
    vi.mocked(shiftCloseApi.getManualRecords).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTodayMenu).mockResolvedValue({ sections: [] });

    const closedSummary: ShiftSummary = {
      ...mockSummaryExact,
      observations: 'Turno sin inconvenientes operativos',
      closedAt: '2026-11-18T16:00:00.000Z'
    };
    vi.mocked(shiftCloseApi.closeShift).mockResolvedValue(closedSummary);

    render(
      <MemoryRouter>
        <ShiftClosePage />
      </MemoryRouter>
    );

    // Estado "Todo cerrado" presente
    await waitFor(() => {
      const badges = screen.getAllByText('Todo cerrado');
      expect(badges.length).toBeGreaterThan(0);
    });

    const closeBtn = screen.getByRole('button', { name: /Cerrar Turno/i });
    expect(closeBtn).not.toBeDisabled();

    // Escribir observación opcional
    const obsInput = screen.getByLabelText(/Observaciones de Cierre/i);
    fireEvent.change(obsInput, {
      target: { value: 'Turno sin inconvenientes operativos' }
    });

    // Abrir modal de confirmación
    fireEvent.click(closeBtn);

    expect(
      screen.getByText(/¿Cerrar el turno\? No se podrán crear pedidos nuevos/i)
    ).toBeInTheDocument();

    // Confirmar cierre en modal
    const confirmBtn = screen.getByRole('button', {
      name: /Confirmar cierre/i
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(shiftCloseApi.closeShift).toHaveBeenCalledWith(
        'shift-100',
        'Turno sin inconvenientes operativos'
      );
    });

    // Badge CERRADO y modo snapshot visibles
    await waitFor(() => {
      expect(screen.getByText('CERRADO')).toBeInTheDocument();
      expect(
        screen.getByText(/Turno cerrado — Snapshot histórico inmutable/i)
      ).toBeInTheDocument();
    });
  });

  it('modal de cierre manual exige motivo: rechaza vacío o < 3 caracteres y confirma con motivo', async () => {
    vi.mocked(shiftCloseApi.getCurrentShift).mockResolvedValue(mockShift);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue(mockOpenOrders);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue(mockSummaryExact);
    vi.mocked(shiftCloseApi.getManualRecords).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTodayMenu).mockResolvedValue({ sections: [] });

    vi.mocked(shiftCloseApi.manualCloseOrder).mockResolvedValue({
      ...mockOpenOrders[0],
      status: 'ENTREGADO',
      manualClose: true,
      manualCloseReason: 'Entregado en mesa sin marcar'
    });

    render(
      <MemoryRouter>
        <ShiftClosePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cerrar manualmente')).toBeInTheDocument();
    });

    // Abrir modal
    fireEvent.click(screen.getByText('Cerrar manualmente'));

    expect(
      screen.getByText(/Cierre Manual de Pedido/i)
    ).toBeInTheDocument();

    const reasonInput = screen.getByLabelText(/Motivo del cierre manual/i);
    const submitBtn = screen.getByRole('button', {
      name: /Confirmar cierre manual/i
    });

    // Intento con motivo demasiado corto (< 3 caracteres)
    fireEvent.change(reasonInput, { target: { value: 'ok' } });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText(/El motivo debe tener al menos 3 caracteres/i)
    ).toBeInTheDocument();
    expect(shiftCloseApi.manualCloseOrder).not.toHaveBeenCalled();

    // Motivo válido
    fireEvent.change(reasonInput, {
      target: { value: 'Entregado en mesa sin marcar' }
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(shiftCloseApi.manualCloseOrder).toHaveBeenCalledWith(
        'ord-101',
        'Entregado en mesa sin marcar'
      );
    });
  });

  it('registro manual válido e inválido: valida campos y registra comanda PAPER', async () => {
    vi.mocked(shiftCloseApi.getCurrentShift).mockResolvedValue(mockShift);
    vi.mocked(shiftCloseApi.getActiveOrders).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTables).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getSummary).mockResolvedValue(mockSummaryExact);
    vi.mocked(shiftCloseApi.getManualRecords).mockResolvedValue([]);
    vi.mocked(shiftCloseApi.getTodayMenu).mockResolvedValue({ sections: [] });

    vi.mocked(shiftCloseApi.createManualRecord).mockResolvedValue({
      id: 'rec-1',
      tableCode: 'Mesa 8',
      items: [{ name: 'Arroz con Mariscos', quantity: 2, amountCents: 6000 }],
      totalCents: 6000,
      notes: 'Por caída de red',
      source: 'PAPER',
      createdAt: '2026-11-18T13:30:00.000Z'
    });

    render(
      <MemoryRouter>
        <ShiftClosePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Registrar en papel')).toBeInTheDocument();
    });

    // Abrir modal de comanda en papel
    fireEvent.click(screen.getByText('+ Registrar en papel'));

    expect(
      screen.getByText(/Registrar Pedido Manual \(PAPER\)/i)
    ).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', {
      name: /Registrar consumo/i
    });

    // Intento inválido (mesa vacía, nombre de plato vacío)
    fireEvent.click(saveBtn);

    expect(
      screen.getByText(/El código de mesa es obligatorio/i)
    ).toBeInTheDocument();
    expect(shiftCloseApi.createManualRecord).not.toHaveBeenCalled();

    // Llenar campos válidos
    const tableInput = screen.getByLabelText(/^Mesa \*/i);
    fireEvent.change(tableInput, { target: { value: 'Mesa 8' } });

    const dishNameInput = screen.getByPlaceholderText(/Nombre del plato/i);
    fireEvent.change(dishNameInput, {
      target: { value: 'Arroz con Mariscos' }
    });

    const qtyInput = screen.getByPlaceholderText(/Cant\./i);
    fireEvent.change(qtyInput, { target: { value: '2' } });

    const priceInput = screen.getByPlaceholderText(/00\.00/i);
    fireEvent.change(priceInput, { target: { value: '60.00' } });

    // Total informativo calculado debe reflejar S/ 60.00
    expect(screen.getByText('S/ 60.00')).toBeInTheDocument();

    // Guardar
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(shiftCloseApi.createManualRecord).toHaveBeenCalledWith(
        'shift-100',
        expect.objectContaining({
          tableCode: 'Mesa 8',
          totalCents: 6000,
          items: [
            {
              name: 'Arroz con Mariscos',
              quantity: 2,
              amountCents: 6000
            }
          ]
        })
      );
    });
  });
});
