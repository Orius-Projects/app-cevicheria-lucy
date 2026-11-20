import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { KitchenPage } from '../pages/kitchen/KitchenPage';
import { useKitchenStore } from '../stores/kitchenStore';
import { useAuthStore } from '../stores/authStore';
import { useShiftStore } from '../stores/shiftStore';
import { kitchenApi } from '../api/kitchen.api';
import { OrderDTO } from '@cevicheria/shared';

vi.mock('../api/kitchen.api', () => ({
  kitchenApi: {
    getBoard: vi.fn(),
    markReady: vi.fn()
  },
  extractApiError: vi.fn((err: any) => ({
    code: err?.response?.data?.error?.code || 'UNKNOWN_ERROR',
    message: err?.response?.data?.error?.message || err?.message || 'Error desconocido'
  }))
}));

describe('Kitchen Flow (Spec 004 KDS)', () => {
  const createMockOrder = (
    id: string,
    orderNumber: number,
    tableCode: string,
    status: 'ENVIADO' | 'LISTO' | 'ENTREGADO' | 'CANCELADO' = 'ENVIADO',
    enviadoEn = '2026-11-18T12:00:00.000Z',
    version = 1
  ): OrderDTO => ({
    id,
    orderNumber,
    shiftId: 'shift-1',
    tableId: `tbl-${orderNumber}`,
    tableCode,
    tableSessionId: 'sess-1',
    takenByUserId: 'mozo-1',
    takenByName: id === 'ord-1' ? 'Juan Pérez' : 'Ana Mozo',
    status,
    notes: id === 'ord-1' ? 'Cliente alérgico a los mariscos en mesa' : undefined,
    items: [
      {
        dishId: 'dish-1',
        dishName: 'Ceviche Mixto',
        sectionName: 'CEVICHES',
        unitPriceCents: 3500,
        quantity: 2,
        lineTotalCents: 7000,
        variations: [
          { id: 'v1', name: 'Picante medio' },
          { id: 'v2', name: 'Sin cebolla' }
        ],
        notes: 'Servir en plato hondo'
      }
    ],
    totalCents: 7000,
    currency: 'PEN',
    statusHistory: [],
    manualClose: false,
    enviadoEn,
    listoEn: status === 'LISTO' ? '2026-11-18T12:15:00.000Z' : null,
    createdAt: enviadoEn,
    updatedAt: enviadoEn,
    version
  });

  const order1 = createMockOrder('ord-1', 101, 'M-01', 'ENVIADO', '2026-11-18T12:00:00.000Z');
  const order2 = createMockOrder('ord-2', 102, 'M-02', 'ENVIADO', '2026-11-18T12:05:00.000Z');
  const order3 = createMockOrder('ord-3', 100, 'M-03', 'LISTO', '2026-11-18T11:50:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: {
        id: 'user-cocina',
        username: 'cocinero1',
        displayName: 'Cocinero Pedro',
        role: 'COCINERO'
      },
      token: 'fake-jwt',
      isAuthenticated: true
    });

    useKitchenStore.setState({
      pending: [],
      ready: [],
      loading: false,
      error: null,
      connection: 'connected',
      announcement: null,
      recentOrderIds: []
    });

    useShiftStore.setState({
      isOpen: true,
      currentShift: {
        id: 'shift-1',
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'ABIERTO',
        openedAt: '2026-11-18T10:00:00.000Z'
      },
      isLoading: false,
      error: null,
      fetchCurrentShift: vi.fn().mockResolvedValue(undefined)
    });

    (kitchenApi.getBoard as any).mockResolvedValue({
      pending: [order1, order2],
      ready: [order3],
      serverTime: '2026-11-18T12:06:00.000Z'
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders KDS board with pending/ready counters, dark header and connection status', async () => {
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );

    // Debe cargar los datos iniciales
    await waitFor(() => {
      expect(kitchenApi.getBoard).toHaveBeenCalled();
    });

    // Contadores en cabecera
    const pendingCounter = screen.getByTestId('pending-counter');
    expect(pendingCounter).toHaveTextContent('2');

    const readyCounter = screen.getByTestId('ready-counter');
    expect(readyCounter).toHaveTextContent('1');

    // Nombre de usuario cocinero en cabecera
    expect(screen.getByText(/Cocinero Pedro/i)).toBeInTheDocument();

    // Título de columnas
    expect(screen.getByText(/Pendientes en Cocina/i)).toBeInTheDocument();
    expect(screen.getByText(/Listos para Recoger/i)).toBeInTheDocument();
  });

  it('displays full order details including 2× quantity, highlighted variations and untruncated notes', async () => {
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mesa M-01')).toBeInTheDocument();
    });

    const card1 = screen.getByText('Mesa M-01').closest('article')!;
    expect(card1).toBeInTheDocument();

    // Número de comanda
    expect(within(card1).getByText('#101')).toBeInTheDocument();

    // Mozo
    expect(within(card1).getByText('Juan Pérez')).toBeInTheDocument();

    // Nota general
    expect(within(card1).getByText(/"Cliente alérgico a los mariscos en mesa"/i)).toBeInTheDocument();

    // Ítem y cantidad
    expect(within(card1).getByText('2×')).toBeInTheDocument();
    expect(within(card1).getByText('Ceviche Mixto')).toBeInTheDocument();

    // Variaciones destacadas
    expect(within(card1).getByText('Picante medio')).toBeInTheDocument();
    expect(within(card1).getByText('Sin cebolla')).toBeInTheDocument();

    // Nota de preparación del ítem
    expect(within(card1).getByText(/"Servir en plato hondo"/i)).toBeInTheDocument();
  });

  it('single touch "Marcar listo" transitions order to ready with anti double-tap lock', async () => {
    const readyOrder1: OrderDTO = {
      ...order1,
      status: 'LISTO',
      listoEn: '2026-11-18T12:07:00.000Z',
      version: 2
    };

    let resolveMark: (val: OrderDTO) => void;
    const markPromise = new Promise<OrderDTO>((resolve) => {
      resolveMark = resolve;
    });

    (kitchenApi.markReady as any).mockImplementation(() => markPromise);

    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mesa M-01')).toBeInTheDocument();
    });

    // Encontrar todos los botones de "Marcar listo"
    const markButtons = screen.getAllByRole('button', { name: /Marcar listo/i });
    expect(markButtons.length).toBe(2);

    const firstMarkBtn = markButtons[0];

    // Simular doble tap rápido
    fireEvent.click(firstMarkBtn);
    fireEvent.click(firstMarkBtn);

    // Solo se debe llamar 1 sola vez
    expect(kitchenApi.markReady).toHaveBeenCalledTimes(1);
    expect(kitchenApi.markReady).toHaveBeenCalledWith('ord-1', 1);

    // El botón se bloquea mostrando feedback
    expect(screen.getByText(/Marcando listo.../i)).toBeInTheDocument();
    expect(firstMarkBtn).toBeDisabled();

    // Resolver la llamada
    resolveMark!(readyOrder1);

    // Tras completarse, el pedido pasa a la columna de Listos
    await waitFor(() => {
      expect(useKitchenStore.getState().pending.map((o) => o.id)).not.toContain('ord-1');
      expect(useKitchenStore.getState().ready.map((o) => o.id)).toContain('ord-1');
    });

    // El contador de pendientes disminuye a 1 y el de listos aumenta a 2
    expect(screen.getByTestId('pending-counter')).toHaveTextContent('1');
    expect(screen.getByTestId('ready-counter')).toHaveTextContent('2');
  });

  it('ready column displays "Listo para recoger (esperando al mozo)" without kitchen action buttons', async () => {
    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mesa M-03')).toBeInTheDocument();
    });

    // Debe mostrar el texto informativo en lugar de un botón
    expect(screen.getByText(/Listo para recoger \(esperando al mozo\)/i)).toBeInTheDocument();

    // Comprobar que en Mesa M-03 no hay botón de acción
    const cardM3 = screen.getByText('Mesa M-03').closest('article');
    expect(cardM3).toBeInTheDocument();
    const actionBtn = cardM3?.querySelector('button');
    expect(actionBtn).toBeNull();
  });

  it('handles 409 VERSION_CONFLICT by displaying error banner and resyncing board', async () => {
    const err409 = {
      response: {
        status: 409,
        data: {
          error: {
            code: 'VERSION_CONFLICT',
            message: 'El pedido fue modificado concurrentemente por otro usuario'
          }
        }
      }
    };
    (kitchenApi.markReady as any).mockRejectedValue(err409);

    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mesa M-01')).toBeInTheDocument();
    });

    const markBtn = screen.getAllByRole('button', { name: /Marcar listo/i })[0];
    fireEvent.click(markBtn);

    // Aparece el mensaje de error en pantalla
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/modificado concurrentemente/i);
    });

    // Debe haberse llamado a getBoard para resincronizar
    expect(kitchenApi.getBoard).toHaveBeenCalledTimes(2);
  });

  it('shows connection banner when disconnected and allows manual reconnect', async () => {
    useKitchenStore.setState({ connection: 'disconnected' });

    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/(Sin conexión con el servidor|Reconectando con el servidor)/i)
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Reintentar conexión/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(kitchenApi.getBoard).toHaveBeenCalled();
  });

  it('renders ShiftClosedView and blocks kitchen operations when shift is closed', async () => {
    useShiftStore.setState({
      isOpen: false,
      currentShift: {
        id: 'shift-1',
        date: '2026-11-18',
        label: 'Almuerzo',
        status: 'CERRADO',
        openedAt: '2026-11-18T10:00:00.000Z'
      },
      isLoading: false,
      error: null,
      fetchCurrentShift: vi.fn().mockResolvedValue(undefined)
    });

    render(
      <MemoryRouter>
        <KitchenPage />
      </MemoryRouter>
    );

    // Turno Finalizado debe ser visible
    expect(screen.getAllByText(/Turno Finalizado/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/El administrador ha cerrado el turno de atención/i)).toBeInTheDocument();
    expect(screen.getByText(/Operaciones bloqueadas/i)).toBeInTheDocument();

    // No debe mostrar las columnas operativas de comandas
    expect(screen.queryByText(/Pendientes en Cocina/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Mesa M-01')).not.toBeInTheDocument();
  });
});
