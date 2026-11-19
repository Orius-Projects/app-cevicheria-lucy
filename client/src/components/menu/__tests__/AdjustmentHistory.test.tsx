import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdjustmentHistory } from '../AdjustmentHistory';
import { menuApi } from '../../../api/menu.api';
import { MenuItemDTO, RationAdjustmentDTO } from '@cevicheria/shared';

vi.mock('../../../api/menu.api', () => ({
  menuApi: {
    getRationAdjustments: vi.fn()
  }
}));

describe('AdjustmentHistory (F6 - Mostrar nombre del actor)', () => {
  const dummyItem: MenuItemDTO = {
    id: 'item-1',
    menuDayId: 'day-1',
    dishId: 'dish-1',
    dishName: 'Ceviche Mixto',
    sectionKey: 'CEVICHES',
    priceCents: 3500,
    hasRationsLimit: true,
    totalRations: 20,
    remainingRations: 10,
    lowStockThreshold: 5,
    manuallySoldOut: false,
    active: true,
    updatedAt: new Date().toISOString(),
    version: 1
  };

  it('renders actor displayName when actorId is populated', async () => {
    const mockAdjustments: RationAdjustmentDTO[] = [
      {
        id: 'adj-1',
        menuItemId: 'item-1',
        dishId: 'dish-1',
        menuDayId: 'day-1',
        type: 'REPLENISH',
        previousRemaining: 5,
        newRemaining: 15,
        reason: 'Sobraron porciones de cocina',
        actorId: {
          id: 'user-1',
          username: 'juanp',
          displayName: 'Juan Pérez'
        },
        actorRole: 'ENCARGADO',
        at: new Date('2026-11-18T15:30:00Z').toISOString()
      }
    ];

    (menuApi.getRationAdjustments as any).mockResolvedValue(mockAdjustments);

    render(
      <AdjustmentHistory isOpen={true} onClose={vi.fn()} menuItem={dummyItem} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Juan Pérez \(ENCARGADO\)/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Sobraron porciones de cocina')).toBeInTheDocument();
    expect(screen.getByText('Reposición')).toBeInTheDocument();
  });

  it('falls back to actorRole when actorId is a string ID', async () => {
    const mockAdjustments: RationAdjustmentDTO[] = [
      {
        id: 'adj-2',
        menuItemId: 'item-1',
        dishId: 'dish-1',
        menuDayId: 'day-1',
        type: 'ADJUSTMENT',
        previousRemaining: 15,
        newRemaining: 12,
        reason: 'Conteo físico de porciones',
        actorId: 'user-id-raw',
        actorRole: 'MOZO',
        at: new Date('2026-11-18T16:00:00Z').toISOString()
      }
    ];

    (menuApi.getRationAdjustments as any).mockResolvedValue(mockAdjustments);

    render(
      <AdjustmentHistory isOpen={true} onClose={vi.fn()} menuItem={dummyItem} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Rol: MOZO/i)).toBeInTheDocument();
    });
  });
});
