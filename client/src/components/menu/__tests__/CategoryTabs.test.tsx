/** @vitest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CategoryTabs } from '../CategoryTabs';

afterEach(cleanup);

const categories = [
  { key: 'ALL', label: 'Todos', count: 26 },
  { key: 'CRIOLLO', label: 'Criollo', count: 11 },
  { key: 'ENTRADA', label: 'Entrada', count: 9 },
  { key: 'MARINO', label: 'Marino', count: 4 },
  { key: 'BEBIDAS', label: 'Bebidas', count: 2 }
];

describe('CategoryTabs', () => {
  it('muestra las cinco categorías con su conteo y permite cambiar la activa', () => {
    const onSelect = vi.fn();
    render(<CategoryTabs categories={categories} activeKey="ALL" onSelect={onSelect} />);

    for (const category of categories) {
      expect(screen.getByRole('button', { name: new RegExp(category.label) })).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: /Criollo/ })).toHaveTextContent('11');
    expect(screen.getByRole('button', { name: /Entrada/ })).toHaveTextContent('9');
    expect(screen.getByRole('button', { name: /Marino/ })).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: /Bebidas/ })).toHaveTextContent('2');

    expect(screen.getByRole('button', { name: /Todos/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Marino/ }));
    expect(onSelect).toHaveBeenCalledWith('MARINO');
  });

  it('usa wrap para que todas las categorías queden visibles en móvil', () => {
    render(<CategoryTabs categories={categories} activeKey="ALL" onSelect={vi.fn()} />);
    const group = screen.getByRole('group', { name: /Filtrar platos por categoría/i });
    expect(group.className).toContain('flex-wrap');
    expect(group.className).not.toContain('overflow-x');
  });
});
