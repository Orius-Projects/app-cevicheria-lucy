import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOrderEvents } from '../hooks/useOrderEvents';
import { useKitchenEvents } from '../hooks/useKitchenEvents';
import { ordersApi } from '../api/orders.api';
import { kitchenApi } from '../api/kitchen.api';
import { useAuthStore } from '../stores/authStore';
import { resetSocketInstance, getSocket } from '../api/socket';

type ListenerFn = (...args: any[]) => void;

// Mock de socket.io-client
const socketListeners: Record<string, ListenerFn[]> = {};

const mockSocket = {
  connected: false,
  auth: { token: 'mock-token' },
  on: vi.fn((event: string, callback: ListenerFn) => {
    if (!socketListeners[event]) socketListeners[event] = [];
    socketListeners[event].push(callback);
  }),
  off: vi.fn((event: string, callback: ListenerFn) => {
    if (socketListeners[event]) {
      socketListeners[event] = socketListeners[event].filter((cb) => cb !== callback);
    }
  }),
  emit: vi.fn((event: string, ...args: any[]) => {
    if (socketListeners[event]) {
      socketListeners[event].forEach((cb) => cb(...args));
    }
  }),
  connect: vi.fn(() => {
    mockSocket.connected = true;
    if (socketListeners['connect']) {
      socketListeners['connect'].forEach((cb) => cb());
    }
  }),
  disconnect: vi.fn(() => {
    mockSocket.connected = false;
    if (socketListeners['disconnect']) {
      socketListeners['disconnect'].forEach((cb) => cb());
    }
  })
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

vi.mock('../api/orders.api', () => ({
  ordersApi: {
    listActive: vi.fn().mockResolvedValue({ data: [] }),
    listReady: vi.fn().mockResolvedValue({ data: [] })
  },
  extractApiError: vi.fn((err: any) => ({
    code: err?.response?.data?.error?.code || 'UNKNOWN_ERROR',
    message: err?.response?.data?.error?.message || err?.message || 'Error desconocido'
  }))
}));

vi.mock('../api/kitchen.api', () => ({
  kitchenApi: {
    getBoard: vi.fn().mockResolvedValue({ pending: [], ready: [] }),
    markReady: vi.fn()
  },
  extractApiError: vi.fn((err: any) => ({
    code: err?.response?.data?.error?.code || 'UNKNOWN_ERROR',
    message: err?.response?.data?.error?.message || err?.message || 'Error desconocido'
  }))
}));

vi.mock('../api/tables.api', () => ({
  tablesApi: {
    list: vi.fn().mockResolvedValue({ data: [] })
  }
}));

const WaiterHarness: React.FC = () => {
  useOrderEvents({ pollingIntervalMs: 60000 });
  return <div data-testid="waiter-harness">Salón Mozo</div>;
};

const KitchenHarness: React.FC = () => {
  useKitchenEvents({ pollingIntervalMs: 60000 });
  return <div data-testid="kitchen-harness">Cocina KDS</div>;
};

describe('Realtime Resync on Reconnect (Spec 005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSocketInstance();
    for (const key of Object.keys(socketListeners)) {
      delete socketListeners[key];
    }

    useAuthStore.setState({
      user: {
        id: 'user-1',
        username: 'mozo1',
        displayName: 'Mozo Uno',
        role: 'MOZO'
      },
      token: 'mock-jwt-token',
      isAuthenticated: true
    });
  });

  it('waiter hook (useOrderEvents) triggers refreshAll on socket reconnect', async () => {
    render(<WaiterHarness />);

    // Sincronización inicial al montar
    await waitFor(() => {
      expect(ordersApi.listActive).toHaveBeenCalledTimes(1);
      expect(ordersApi.listReady).toHaveBeenCalledTimes(1);
    });

    const socket = getSocket();

    // Simular evento de reconexión del socket ('connect')
    act(() => {
      socket.emit('connect');
    });

    // Se debe volver a solicitar la lista completa de pedidos al reconectar
    await waitFor(() => {
      expect(ordersApi.listActive).toHaveBeenCalledTimes(2);
      expect(ordersApi.listReady).toHaveBeenCalledTimes(2);
    });
  });

  it('kitchen hook (useKitchenEvents) triggers getBoard on socket reconnect', async () => {
    render(<KitchenHarness />);

    // Carga inicial al montar
    await waitFor(() => {
      expect(kitchenApi.getBoard).toHaveBeenCalledTimes(1);
    });

    const socket = getSocket();

    // Simular evento de reconexión del socket ('connect')
    act(() => {
      socket.emit('connect');
    });

    // Se debe volver a solicitar el tablero de cocina al reconectar
    await waitFor(() => {
      expect(kitchenApi.getBoard).toHaveBeenCalledTimes(2);
    });
  });
});
