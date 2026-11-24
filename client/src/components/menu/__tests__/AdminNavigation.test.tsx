/** @vitest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminNavigation } from '../AdminNavigation';

afterEach(cleanup);

describe('AdminNavigation Component', () => {
  it('renders the navigation options with their labels and icons', () => {
    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminNavigation />
      </MemoryRouter>
    );

    expect(screen.getByText('Platos y raciones')).toBeInTheDocument();
    expect(screen.getByText('Mesas')).toBeInTheDocument();
    expect(screen.getByText('Turno')).toBeInTheDocument();
    expect(screen.getByText('Cierre de turno')).toBeInTheDocument();

    expect(screen.queryByText('Menú del Día')).not.toBeInTheDocument();
    expect(screen.queryByText('Platos Maestros')).not.toBeInTheDocument();
    expect(screen.queryByText('Raciones y Agotados')).not.toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);

    // Each link must have an SVG icon
    links.forEach((link) => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('contains the simplified navigation targets', () => {
    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminNavigation />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Platos y raciones/i })).toHaveAttribute(
      'href',
      '/encargado'
    );
    expect(screen.getByRole('link', { name: /Mesas/i })).toHaveAttribute(
      'href',
      '/encargado/mesas'
    );
    expect(screen.getByRole('link', { name: /^Turno$/i })).toHaveAttribute(
      'href',
      '/encargado/turnos'
    );
    expect(screen.getByRole('link', { name: /Cierre de turno/i })).toHaveAttribute(
      'href',
      '/encargado/cierre'
    );
  });

  it('calls onItemClick when an item is clicked', () => {
    const handleClick = vi.fn();
    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminNavigation onItemClick={handleClick} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Turno'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
