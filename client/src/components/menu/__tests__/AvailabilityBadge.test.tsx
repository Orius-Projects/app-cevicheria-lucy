import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AvailabilityBadge } from '../AvailabilityBadge';

describe('AvailabilityBadge', () => {
  it('renders DISPONIBLE status with appropriate label and styles', () => {
    render(<AvailabilityBadge status="DISPONIBLE" />);
    const badge = screen.getByTestId('availability-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Disponible');
    expect(badge).toHaveAttribute('data-status', 'DISPONIBLE');
    expect(badge.className).toContain('text-emerald-700');
  });

  it('renders ULTIMAS_RACIONES status with appropriate label and styles', () => {
    render(<AvailabilityBadge status="ULTIMAS_RACIONES" />);
    const badge = screen.getByTestId('availability-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Últimas raciones');
    expect(badge).toHaveAttribute('data-status', 'ULTIMAS_RACIONES');
    expect(badge.className).toContain('text-amber-800');
  });

  it('renders AGOTADO status with appropriate label and styles', () => {
    render(<AvailabilityBadge status="AGOTADO" />);
    const badge = screen.getByTestId('availability-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Agotado');
    expect(badge).toHaveAttribute('data-status', 'AGOTADO');
    expect(badge.className).toContain('text-rose-700');
  });

  it('renders INACTIVO status with appropriate label and styles', () => {
    render(<AvailabilityBadge status="INACTIVO" />);
    const badge = screen.getByTestId('availability-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Inactivo');
    expect(badge).toHaveAttribute('data-status', 'INACTIVO');
    expect(badge.className).toContain('text-slate-500');
  });
});
