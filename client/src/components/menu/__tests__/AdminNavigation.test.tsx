/** @vitest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminNavigation } from '../AdminNavigation';

afterEach(cleanup);

describe('AdminNavigation Component', () => {
  it('renders all 5 navigation options with their labels and icons', () => {
    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminNavigation />
      </MemoryRouter>
    );

    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.getByText('Menú del Día')).toBeInTheDocument();
    expect(screen.getByText('Platos Maestros')).toBeInTheDocument();
    expect(screen.getByText('Raciones y Agotados')).toBeInTheDocument();
    expect(screen.getByText('Cierre de Turno')).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);

    // Each link must have an SVG icon
    links.forEach((link) => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('contains correct href targets for all modules', () => {
    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminNavigation />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Turnos/i })).toHaveAttribute('href', '/encargado');
    expect(screen.getByRole('link', { name: /Menú del Día/i })).toHaveAttribute('href', '/encargado/menu');
    expect(screen.getByRole('link', { name: /Platos Maestros/i })).toHaveAttribute('href', '/encargado/platos');
    expect(screen.getByRole('link', { name: /Raciones y Agotados/i })).toHaveAttribute('href', '/encargado/raciones');
    expect(screen.getByRole('link', { name: /Cierre de Turno/i })).toHaveAttribute('href', '/encargado/cierre');
  });

  it('calls onItemClick when an item is clicked', () => {
    const handleClick = vi.fn();
    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminNavigation onItemClick={handleClick} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Menú del Día'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
