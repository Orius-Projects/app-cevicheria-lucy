/** @vitest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MenuItemDTO } from '@cevicheria/shared';
import { DishRationCard } from '../DishRationCard';

afterEach(cleanup);

const baseItem: MenuItemDTO = {
  id: 'item-1',
  menuDayId: 'day-1',
  dishId: 'dish-1',
  dishName: 'Ají de gallina',
  sectionKey: 'CRIOLLO',
  priceCents: 2400,
  active: true,
  hasRationsLimit: true,
  totalRations: 15,
  remainingRations: 4,
  lowStockThreshold: 5,
  manuallySoldOut: false,
  updatedAt: new Date().toISOString(),
  version: 1
};

const renderCard = (item: MenuItemDTO = baseItem) => {
  const handlers = {
    onOpen: vi.fn(),
    onIncrement: vi.fn(),
    onDecrement: vi.fn(),
    onMarkSoldOut: vi.fn(),
    onReactivate: vi.fn()
  };
  render(
    <DishRationCard
      item={item}
      dish={{ id: 'dish-1', name: item.dishName, description: 'Pollo en crema de ají amarillo', priceCents: 2400, course: 'FONDO', isFixed: false, isRotating: true, sortOrder: 8, variations: [], active: true, sectionId: 'sec-1', createdAt: '', updatedAt: '' }}
      sectionName="Criollo"
      {...handlers}
    />
  );
  return handlers;
};

describe('DishRationCard', () => {
  it('muestra nombre, categoría, precio, estado y raciones restantes/total', () => {
    renderCard();
    expect(screen.getByText('Ají de gallina')).toBeInTheDocument();
    expect(screen.getByText('Criollo')).toBeInTheDocument();
    expect(screen.getByText('S/ 24.00')).toBeInTheDocument();
    expect(screen.getByText('Últimas raciones')).toBeInTheDocument();
    expect(screen.getByText('4 / 15')).toBeInTheDocument();
  });

  it('dispara el stepper de raciones sin abrir el panel de edición', () => {
    const handlers = renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Quitar una ración a Ají de gallina/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar una ración a Ají de gallina/i }));
    expect(handlers.onDecrement).toHaveBeenCalledWith(baseItem);
    expect(handlers.onIncrement).toHaveBeenCalledWith(baseItem);
    expect(handlers.onOpen).not.toHaveBeenCalled();
  });

  it('abre el panel al tocar el contenido de la tarjeta', () => {
    const handlers = renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Editar Ají de gallina/i }));
    expect(handlers.onOpen).toHaveBeenCalledWith(baseItem);
  });

  it('muestra Reactivar cuando el plato fue marcado agotado manualmente', () => {
    const handlers = renderCard({ ...baseItem, manuallySoldOut: true });
    fireEvent.click(screen.getByRole('button', { name: /Reactivar/i }));
    expect(handlers.onReactivate).toHaveBeenCalledWith({ ...baseItem, manuallySoldOut: true });
  });

  it('muestra "Sin límite" y oculta el stepper cuando no hay control de raciones', () => {
    renderCard({
      ...baseItem,
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null
    });
    expect(screen.getByText('Sin límite')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitar una ración/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar una ración/i })).not.toBeInTheDocument();
  });
});
