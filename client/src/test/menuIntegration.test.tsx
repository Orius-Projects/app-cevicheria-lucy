import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { MenuView } from '../pages/shared/MenuView';
import { useMenuPublicStore } from '../stores/menuPublicStore';
import { useAuthStore } from '../stores/authStore';
import { menuApi, TodayMenuResponse } from '../api/menu.api';

vi.mock('../api/menu.api', () => ({
  menuApi: {
    getMenuToday: vi.fn(),
    replenishRations: vi.fn()
  }
}));

describe('Menu Integration & Flow: Publicar -> Menú Mozo -> Agotar -> Bloqueo', () => {
  const mockMenuResponse: TodayMenuResponse = {
    menuDayId: 'day-today',
    date: '2026-11-18',
    status: 'PUBLICADO',
    sections: [
      {
        name: 'Ceviches',
        key: 'CEVICHES',
        items: [
          {
            id: 'item-ceviche-mixto',
            menuDayId: 'day-today',
            dishId: 'dish-ceviche-mixto',
            dishName: 'Ceviche Mixto Especial',
            description: 'Pescado fresco y mariscos con ají limo',
            course: 'FONDO',
            isFixed: false,
            isRotating: true,
            sectionKey: 'CEVICHES',
            priceCents: 4200,
            hasRationsLimit: true,
            totalRations: 10,
            remainingRations: 1,
            lowStockThreshold: 3,
            state: 'ULTIMAS_RACIONES',
            status: 'ULTIMAS_RACIONES',
            manuallySoldOut: false,
            active: true,
            updatedAt: new Date().toISOString(),
            version: 1,
            variations: [
              { id: 'v1', name: 'Sin ají' },
              { id: 'v2', name: 'Muy picante' }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'mozo-1',
        username: 'mozo1',
        displayName: 'Carlos Mozo',
        role: 'MOZO'
      },
      token: 'dummy-token'
    });

    useMenuPublicStore.setState({
      todayMenu: null,
      loading: false,
      error: null,
      lastUpdatedAt: null,
      soldOutToast: null
    });
  });

  it('renders published menu for waiter, transitions to AGOTADO on availability event and blocks selection', async () => {
    (menuApi.getMenuToday as any).mockResolvedValue(mockMenuResponse);
    const onSelectMock = vi.fn();

    render(
      <BrowserRouter>
        <MenuView onSelectItem={onSelectMock} showAddButton={true} />
      </BrowserRouter>
    );

    // 1. Initial load of the menu
    await waitFor(() => {
      expect(screen.getByText('Ceviche Mixto Especial')).toBeInTheDocument();
    });

    // F1: Verify description and variation from flat fields are rendered
    expect(screen.getByText('Pescado fresco y mariscos con ají limo')).toBeInTheDocument();
    expect(screen.getByText('Sin ají')).toBeInTheDocument();
    expect(screen.getByText('Muy picante')).toBeInTheDocument();

    // Check availability badge & button initially
    expect(screen.getByText('Últimas raciones')).toBeInTheDocument();
    expect(screen.getByText('Quedan 1')).toBeInTheDocument();
    const addButton = screen.getByRole('button', { name: /\+ Agregar/i });
    expect(addButton).toBeEnabled();

    // Mozo can click add button
    fireEvent.click(addButton);
    expect(onSelectMock).toHaveBeenCalledTimes(1);

    // 2. Simulate Availability Event: dish runs out of rations (remaining = 0, AGOTADO)
    act(() => {
      useMenuPublicStore.getState().applyAvailabilityEvent({
        menuItemId: 'item-ceviche-mixto',
        dishName: 'Ceviche Mixto Especial',
        remainingRations: 0,
        status: 'AGOTADO'
      });
    });

    // 3. Verify Toast banner appears with Spanish prompt "Ofrece una alternativa"
    const toast = await screen.findByTestId('sold-out-toast');
    expect(toast).toHaveTextContent(
      'El plato "Ceviche Mixto Especial" se ha agotado. Ofrece una alternativa al cliente.'
    );

    // 4. Verify DishCard updates to AGOTADO and blocks "+ Agregar"
    expect(screen.getByText('Agotado')).toBeInTheDocument();
    expect(screen.getByText('Sin raciones')).toBeInTheDocument();

    const disabledButton = screen.getByRole('button', { name: /Plato Agotado/i });
    expect(disabledButton).toBeDisabled();

    // Trying to click disabled button does not trigger onSelectItem
    fireEvent.click(disabledButton);
    expect(onSelectMock).toHaveBeenCalledTimes(1);

    // 5. Dismiss toast
    const dismissBtn = screen.getByRole('button', { name: /Entendido ×/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByTestId('sold-out-toast')).not.toBeInTheDocument();
  });
});
