import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReplenishRationsModal } from '../ReplenishRationsModal';
import { menuApi } from '../../../api/menu.api';
import { MenuItemDTO } from '@cevicheria/shared';

vi.mock('../../../api/menu.api', () => ({
  menuApi: {
    replenishRations: vi.fn()
  }
}));

describe('ReplenishRationsModal', () => {
  const dummyItem: MenuItemDTO = {
    id: 'item-123',
    menuDayId: 'day-1',
    dishId: 'dish-1',
    dishName: 'Ceviche Clásico',
    sectionKey: 'CEVICHES',
    priceCents: 3500,
    hasRationsLimit: true,
    totalRations: 20,
    remainingRations: 2,
    lowStockThreshold: 5,
    status: 'ULTIMAS_RACIONES',
    manuallySoldOut: false,
    active: true,
    updatedAt: new Date().toISOString(),
    version: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ReplenishRationsModal
        isOpen={false}
        onClose={vi.fn()}
        menuItem={dummyItem}
        onSuccess={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with item info and calculates preview rations', () => {
    render(
      <ReplenishRationsModal
        isOpen={true}
        onClose={vi.fn()}
        menuItem={dummyItem}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Reponer Raciones')).toBeInTheDocument();
    expect(screen.getByText('Ceviche Clásico')).toBeInTheDocument();
    // Default quantity is 5, remaining is 2 -> preview total 7
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows warning if manuallySoldOut is true', () => {
    const soldOutItem = { ...dummyItem, manuallySoldOut: true };
    render(
      <ReplenishRationsModal
        isOpen={true}
        onClose={vi.fn()}
        menuItem={soldOutItem}
        onSuccess={vi.fn()}
      />
    );

    expect(
      screen.getByText(/marcado como agotado por falta de insumo/i)
    ).toBeInTheDocument();
  });

  it('validates mandatory reason before sending', async () => {
    render(
      <ReplenishRationsModal
        isOpen={true}
        onClose={vi.fn()}
        menuItem={dummyItem}
        onSuccess={vi.fn()}
      />
    );

    const form = screen.getByTestId('replenish-form');
    const reasonInput = screen.getByLabelText(/Motivo de la reposición/i);
    fireEvent.change(reasonInput, { target: { value: '    ' } });

    fireEvent.submit(form);

    const error = await screen.findByTestId('replenish-error');
    expect(error).toHaveTextContent(/El motivo de la reposición es obligatorio/i);
    expect(menuApi.replenishRations).not.toHaveBeenCalled();
  });

  it('validates quantity >= 1', async () => {
    render(
      <ReplenishRationsModal
        isOpen={true}
        onClose={vi.fn()}
        menuItem={dummyItem}
        onSuccess={vi.fn()}
      />
    );

    const form = screen.getByTestId('replenish-form');
    const qtyInput = screen.getByLabelText(/Cantidad a reponer/i);
    const reasonInput = screen.getByLabelText(/Motivo de la reposición/i);

    fireEvent.change(qtyInput, { target: { value: '0' } });
    fireEvent.change(reasonInput, { target: { value: 'Nueva preparación de pescado' } });

    fireEvent.submit(form);

    const error = await screen.findByTestId('replenish-error');
    expect(error).toHaveTextContent(/mayor o igual a 1/i);
    expect(menuApi.replenishRations).not.toHaveBeenCalled();
  });

  it('submits successfully with valid quantity and reason', async () => {
    const updatedItem = { ...dummyItem, remainingRations: 12, totalRations: 30 };
    (menuApi.replenishRations as any).mockResolvedValue(updatedItem);

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <ReplenishRationsModal
        isOpen={true}
        onClose={onClose}
        menuItem={dummyItem}
        onSuccess={onSuccess}
      />
    );

    const form = screen.getByTestId('replenish-form');
    const qtyInput = screen.getByLabelText(/Cantidad a reponer/i);
    const reasonInput = screen.getByLabelText(/Motivo de la reposición/i);

    fireEvent.change(qtyInput, { target: { value: '10' } });
    fireEvent.change(reasonInput, { target: { value: 'Llegó lote fresco de corvina' } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(menuApi.replenishRations).toHaveBeenCalledWith(
        'item-123',
        10,
        'Llegó lote fresco de corvina'
      );
      expect(onSuccess).toHaveBeenCalledWith(updatedItem);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
