import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewOrderPage } from '../pages/waiter/NewOrderPage';
import { ActiveOrdersPage } from '../pages/waiter/ActiveOrdersPage';
import { WaiterDashboardPage } from '../pages/waiter/WaiterDashboardPage';
import { useAuthStore } from '../stores/authStore';
import { useShiftStore } from '../stores/shiftStore';
import { useMenuPublicStore } from '../stores/menuPublicStore';
import { useTablesStore } from '../stores/tablesStore';
import { useOrdersStore } from '../stores/ordersStore';
import { useOrderDraftStore } from '../stores/orderDraftStore';
import { ordersApi } from '../api/orders.api';
import { menuApi, TodayMenuResponse } from '../api/menu.api';
import { OrderDTO } from '@cevicheria/shared';

vi.mock('../api/orders.api', () => ({
  ordersApi: {
    create: vi.fn(),
    listActive: vi.fn(),
    listReady: vi.fn(),
    getById: vi.fn(),
    deliver: vi.fn(),
    cancel: vi.fn()
  },
  extractApiError: vi.fn((err: any) => ({
    code: err?.response?.data?.error?.code || 'UNKNOWN_ERROR',
    message: err?.response?.data?.error?.message || err?.message || 'Error desconocido'
  }))
}));

vi.mock('../api/menu.api', () => ({
  menuApi: {
    getMenuToday: vi.fn(),
    replenishRations: vi.fn()
  }
}));

describe('Waiter Orders Flow (Spec 003 UI)', () => {
  const mockMenu: TodayMenuResponse = {
    menuDayId: 'mday-1',
    date: '2026-11-18',
    status: 'PUBLICADO',
    sections: [
      {
        name: 'Ceviches',
        key: 'CEVICHES',
        items: [
          {
            id: 'item-1',
            menuDayId: 'mday-1',
            dishId: 'dish-ceviche-1',
            dishName: 'Ceviche Mixto',
            description: 'Con pescado y calamar fresco',
            course: 'FONDO',
            isFixed: false,
            isRotating: false,
            sectionKey: 'CEVICHES',
            priceCents: 3500,
            hasRationsLimit: true,
            totalRations: 10,
            remainingRations: 5,
            lowStockThreshold: 2,
            state: 'DISPONIBLE',
            status: 'DISPONIBLE',
            manuallySoldOut: false,
            active: true,
            updatedAt: '2026-11-18T10:00:00.000Z',
            version: 1,
            variations: [
              { id: 'var-1', name: 'Sin picante' },
              { id: 'var-2', name: 'Picante medio' }
            ]
          },
          {
            id: 'item-2',
            menuDayId: 'mday-1',
            dishId: 'dish-causa-2',
            dishName: 'Causa Limeña',
            description: 'Papa amarilla con pollo',
            course: 'ENTRADA',
            isFixed: false,
            isRotating: false,
            sectionKey: 'ENTRADAS',
            priceCents: 2000,
            hasRationsLimit: true,
            totalRations: 5,
            remainingRations: 0,
            lowStockThreshold: 2,
            state: 'AGOTADO',
            status: 'AGOTADO',
            manuallySoldOut: false,
            active: true,
            updatedAt: '2026-11-18T10:00:00.000Z',
            version: 1
          }
        ]
      }
    ]
  };

  const sampleOrder: OrderDTO = {
    id: 'ord-101',
    orderNumber: 101,
    shiftId: 'shift-1',
    tableId: 'tbl-1',
    tableCode: 'M-01',
    tableSessionId: 'sess-1',
    status: 'ENVIADO',
    items: [
      {
        dishId: 'dish-ceviche-1',
        dishName: 'Ceviche Mixto',
        sectionName: 'CEVICHES',
        unitPriceCents: 3500,
        quantity: 1,
        lineTotalCents: 3500,
        variations: [{ id: 'var-1', name: 'Sin picante' }],
        notes: 'Sin cebolla'
      }
    ],
    notes: 'Mesa con niños',
    totalCents: 3500,
    currency: 'PEN',
    takenByUserId: 'user-mozo-1',
    takenByName: 'Mozo Carlos',
    statusHistory: [],
    manualClose: false,
    enviadoEn: '2026-11-18T12:00:00.000Z',
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z',
    version: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: {
        id: 'user-mozo-1',
        username: 'mozo1',
        displayName: 'Mozo Carlos',
        role: 'MOZO'
      },
      token: 'jwt-token',
      isAuthenticated: true
    });

    useShiftStore.setState({
      currentShift: {
        id: 'shift-1',
        date: '2026-11-18',
        label: 'Turno Mañana',
        status: 'ABIERTO',
        openedAt: '2026-11-18T08:00:00.000Z'
      },
      isOpen: true,
      isLoading: false,
      error: null,
      fetchCurrentShift: vi.fn().mockResolvedValue(undefined)
    });

    useTablesStore.setState({
      tables: [
        { id: 'tbl-1', code: 'M-01', zone: 'Salón', seats: 4, state: 'LIBRE', openSessionId: null },
        { id: 'tbl-2', code: 'M-02', zone: 'Salón', seats: 4, state: 'OCUPADA', openSessionId: 'sess-2' }
      ],
      isLoading: false,
      error: null
    });

    useMenuPublicStore.setState({
      todayMenu: mockMenu,
      loading: false,
      error: null,
      lastUpdatedAt: new Date('2026-11-18T10:00:00.000Z'),
      soldOutToast: null
    });

    useOrdersStore.setState({
      active: [],
      ready: [],
      detail: {},
      loading: false,
      error: null
    });

    useOrderDraftStore.getState().clearDraft();
    (menuApi.getMenuToday as any).mockResolvedValue(mockMenu);
  });

  afterEach(() => {
    cleanup();
  });

  it('NewOrderPage: arms draft with variations, displays exact total S/ 35.00, and sends order idempotently', async () => {
    const createdOrder: OrderDTO = {
      ...sampleOrder,
      id: 'ord-created-1',
      orderNumber: 101
    };
    (ordersApi.create as any).mockResolvedValue(createdOrder);

    render(
      <MemoryRouter initialEntries={['/mozo/pedido/nuevo']}>
        <Routes>
          <Route path="/mozo/pedido/nuevo" element={<NewOrderPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 1. Verify page renders with menu item
    await waitFor(() => {
      expect(screen.getAllByText('Ceviche Mixto').length).toBeGreaterThan(0);
    });

    // 2. Open table selection modal and select table M-01
    const openTableModalBtn = screen.getByRole('button', { name: /Elegir Mesa/i });
    fireEvent.click(openTableModalBtn);

    const tableOption = await screen.findByRole('button', { name: /Mesa M-01/i });
    fireEvent.click(tableOption);

    // Table is now selected
    expect(screen.getByText(/Mesa: M-01/i)).toBeInTheDocument();

    // 3. Click "+ Agregar" on Ceviche Mixto to open variation sheet
    const addDishButtons = screen.getAllByRole('button', { name: /\+ Agregar/i });
    fireEvent.click(addDishButtons[0]);

    // Variation sheet should appear
    expect(screen.getByRole('heading', { name: /Personalizar Plato/i })).toBeInTheDocument();

    // Click variation button "Sin picante"
    const variationBtn = screen.getByRole('button', { name: /Sin picante/i });
    fireEvent.click(variationBtn);

    // Confirm variation
    const confirmVarBtn = screen.getByRole('button', { name: /Confirmar/i });
    fireEvent.click(confirmVarBtn);

    // 4. Item is now in the cart summary
    await waitFor(() => {
      expect(screen.getByText(/Total/i)).toBeInTheDocument();
      expect(screen.getAllByText('S/ 35.00').length).toBeGreaterThan(0);
    });

    // 5. Open Review Order modal
    const reviewBtn = screen.getByRole('button', { name: /Enviar Comanda a Cocina/i });
    expect(reviewBtn).toBeEnabled();
    fireEvent.click(reviewBtn);

    // Verify summary dialog
    expect(screen.getByText(/Confirmar Envío a Cocina/i)).toBeInTheDocument();

    // 6. Click "✓ Enviar a Cocina"
    const sendBtn = screen.getByRole('button', { name: /✓ Enviar a Cocina/i });
    fireEvent.click(sendBtn);

    // Verify ordersApi.create was called with clientRequestId and tableId
    await waitFor(() => {
      expect(ordersApi.create).toHaveBeenCalledTimes(1);
    });

    const callArgs = (ordersApi.create as any).mock.calls[0][0];
    expect(callArgs.tableId).toBe('tbl-1');
    expect(callArgs.items).toHaveLength(1);
    expect(callArgs.items[0].dishId).toBe('dish-ceviche-1');
    expect(callArgs.items[0].variationIds).toEqual(['var-1']);
    expect(typeof callArgs.clientRequestId).toBe('string');

    // 7. Success confirmation dialog shows #101
    await waitFor(() => {
      expect(screen.getByText(/¡Comanda Enviada!/i)).toBeInTheDocument();
      expect(screen.getByText(/#101/i)).toBeInTheDocument();
    });
  });

  it('NewOrderPage (FR-008): blocks order confirmation when shift is closed with ShiftClosedView', async () => {
    useShiftStore.setState({
      isOpen: false,
      currentShift: null,
      fetchCurrentShift: vi.fn().mockResolvedValue(undefined)
    });

    render(
      <MemoryRouter initialEntries={['/mozo/pedido/nuevo']}>
        <Routes>
          <Route path="/mozo/pedido/nuevo" element={<NewOrderPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Turno Finalizado debe ser visible
    expect(screen.getAllByText(/Turno Finalizado/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/El administrador ha cerrado el turno de atención/i)).toBeInTheDocument();
    expect(screen.getByText(/Operaciones bloqueadas/i)).toBeInTheDocument();

    // No debe permitir interactuar con la carta ni enviar comanda
    expect(screen.queryByText(/Confirmar Envío a Cocina/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar Comanda a Cocina/i })).not.toBeInTheDocument();
  });

  it('NewOrderPage: blocks addition of AGOTADO dishes', async () => {
    render(
      <MemoryRouter initialEntries={['/mozo/pedido/nuevo']}>
        <Routes>
          <Route path="/mozo/pedido/nuevo" element={<NewOrderPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Causa Limeña')).toBeInTheDocument();
    });

    // Causa Limeña has remainingRations: 0, status AGOTADO
    const agotadoButton = screen.getByRole('button', { name: /Plato Agotado/i });
    expect(agotadoButton).toBeDisabled();
  });

  it('ActiveOrdersPage: deliver button only enabled for LISTO orders, not ENVIADO orders', async () => {
    const enviadoOrder: OrderDTO = {
      ...sampleOrder,
      id: 'ord-enviado',
      orderNumber: 101,
      status: 'ENVIADO'
    };
    const listoOrder: OrderDTO = {
      ...sampleOrder,
      id: 'ord-listo',
      orderNumber: 102,
      status: 'LISTO',
      listoEn: '2026-11-18T12:15:00.000Z',
      version: 2
    };

    (ordersApi.listActive as any).mockResolvedValue({
      data: [enviadoOrder, listoOrder],
      meta: { total: 2 }
    });
    (ordersApi.listReady as any).mockResolvedValue({
      data: [listoOrder],
      meta: { total: 1 }
    });

    render(
      <MemoryRouter initialEntries={['/mozo/pedidos']}>
        <Routes>
          <Route path="/mozo/pedidos" element={<ActiveOrdersPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/#101/i)).toBeInTheDocument();
      expect(screen.getByText(/#102/i)).toBeInTheDocument();
    });

    // "Entregar a Mesa" button should exist only for ord-listo (LISTO)
    const deliverButton = screen.getByRole('button', { name: /Entregar a Mesa/i });
    expect(deliverButton).toBeInTheDocument();
    expect(deliverButton).toBeEnabled();

    // Delivering ord-listo calls ordersApi.deliver with version 2
    (ordersApi.deliver as any).mockResolvedValue({
      ...listoOrder,
      status: 'ENTREGADO',
      version: 3
    });

    fireEvent.click(deliverButton);

    await waitFor(() => {
      expect(ordersApi.deliver).toHaveBeenCalledWith('ord-listo', 2);
    });
  });

  it('ActiveOrdersPage: cancel modal requires a non-empty reason and warns when order is LISTO', async () => {
    const listoOrder: OrderDTO = {
      ...sampleOrder,
      id: 'ord-listo',
      orderNumber: 103,
      status: 'LISTO',
      version: 2
    };

    (ordersApi.listActive as any).mockResolvedValue({
      data: [listoOrder],
      meta: { total: 1 }
    });
    (ordersApi.listReady as any).mockResolvedValue({
      data: [listoOrder],
      meta: { total: 1 }
    });

    render(
      <MemoryRouter initialEntries={['/mozo/pedidos']}>
        <Routes>
          <Route path="/mozo/pedidos" element={<ActiveOrdersPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/#103/i)).toBeInTheDocument();
    });

    // Click "Cancelar Comanda"
    const cancelTrigger = screen.getByRole('button', { name: /Cancelar Comanda/i });
    fireEvent.click(cancelTrigger);

    // Modal opens
    expect(screen.getByText(/Cancelar Pedido #103/i)).toBeInTheDocument();

    // For LISTO orders, explicit warning "Coordina con cocina" must be visible
    expect(screen.getByText(/Coordina de inmediato con cocina/i)).toBeInTheDocument();

    // The confirm button should be disabled when reason is empty
    const confirmCancelBtn = screen.getByRole('button', { name: /Confirmar Cancelación/i });
    expect(confirmCancelBtn).toBeDisabled();

    // Type reason
    const reasonInput = screen.getByLabelText(/Motivo de la cancelación/i);
    fireEvent.change(reasonInput, { target: { value: 'El cliente tuvo una emergencia' } });
    expect(confirmCancelBtn).toBeEnabled();

    // Confirm cancel
    (ordersApi.cancel as any).mockResolvedValue({
      ...listoOrder,
      status: 'CANCELADO',
      cancelReason: 'El cliente tuvo una emergencia',
      version: 3
    });

    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(ordersApi.cancel).toHaveBeenCalledWith(
        'ord-listo',
        'El cliente tuvo una emergencia',
        2
      );
    });
  });

  it('WaiterDashboardPage: renders table list and allows interacting with tables', async () => {
    (ordersApi.listActive as any).mockResolvedValue({
      data: [sampleOrder],
      meta: { total: 1 }
    });
    (ordersApi.listReady as any).mockResolvedValue({
      data: [],
      meta: { total: 0 }
    });

    render(
      <MemoryRouter initialEntries={['/mozo']}>
        <Routes>
          <Route path="/mozo" element={<WaiterDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Salón$/i })).toBeInTheDocument();
      expect(screen.getByText('M-01')).toBeInTheDocument();
      expect(screen.getByText('M-02')).toBeInTheDocument();
    });

    // Click on Mesa M-01 to open drawer
    const mesa1Btn = screen.getByText('M-01').closest('button')!;
    fireEvent.click(mesa1Btn);

    // Modal popup should show table options
    await waitFor(() => {
      expect(screen.getByText(/Tomar Pedido para Mesa M-01/i)).toBeInTheDocument();
    });
  });

  it('renders ShiftClosedView on WaiterDashboardPage and blocks operations when shift is closed', async () => {
    useShiftStore.setState({
      isOpen: false,
      currentShift: {
        id: 'shift-1',
        date: '2026-11-18',
        label: 'Turno Mañana',
        status: 'CERRADO',
        openedAt: '2026-11-18T08:00:00.000Z'
      },
      isLoading: false,
      error: null,
      fetchCurrentShift: vi.fn().mockResolvedValue(undefined)
    });

    render(
      <MemoryRouter initialEntries={['/mozo']}>
        <Routes>
          <Route path="/mozo" element={<WaiterDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Debe mostrar Turno Finalizado
    expect(screen.getAllByText(/Turno Finalizado/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/El administrador ha cerrado el turno de atención/i)).toBeInTheDocument();
    expect(screen.getByText(/Operaciones bloqueadas/i)).toBeInTheDocument();

    // No debe mostrar la grilla operativa de mesas
    expect(screen.queryByText('M-01')).not.toBeInTheDocument();
    expect(screen.queryByText(/Estado de Mesas del Salón/i)).not.toBeInTheDocument();
  });
});
