import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RationBadge } from '../RationBadge';

describe('RationBadge', () => {
  it('returns null if hasRationsLimit is false', () => {
    const { container } = render(
      <RationBadge hasRationsLimit={false} remainingRations={10} totalRations={20} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "Sin raciones" and rose styling when remaining is 0', () => {
    render(<RationBadge hasRationsLimit={true} remainingRations={0} totalRations={20} />);
    const badge = screen.getByTestId('ration-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Sin raciones');
    expect(badge.className).toContain('text-rose-700');
  });

  it('renders "Quedan N" when remaining is positive and showTotal is false', () => {
    render(<RationBadge hasRationsLimit={true} remainingRations={12} totalRations={20} />);
    const badge = screen.getByTestId('ration-badge');
    expect(badge).toHaveTextContent('Quedan 12');
    expect(badge.className).toContain('text-blue-700');
  });

  it('renders "N / M raciones" when showTotal is true', () => {
    render(
      <RationBadge
        hasRationsLimit={true}
        remainingRations={15}
        totalRations={25}
        showTotal={true}
      />
    );
    const badge = screen.getByTestId('ration-badge');
    expect(badge).toHaveTextContent('15 / 25 raciones');
  });

  it('highlights with amber warning when remaining <= lowStockThreshold', () => {
    render(
      <RationBadge
        hasRationsLimit={true}
        remainingRations={3}
        totalRations={20}
        lowStockThreshold={5}
      />
    );
    const badge = screen.getByTestId('ration-badge');
    expect(badge).toHaveTextContent('Quedan 3');
    expect(badge.className).toContain('text-amber-800');
  });
});
