import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState Component (Design System Section 14)', () => {
  it('renderiza título y descripción correctamente', () => {
    render(
      <EmptyState
        title="Sin comandas activas"
        description="Todos los pedidos han sido entregados al salón."
      />
    );

    expect(screen.getByText('Sin comandas activas')).toBeInTheDocument();
    expect(screen.getByText('Todos los pedidos han sido entregados al salón.')).toBeInTheDocument();
  });

  it('renderiza botón de acción y responde al evento click', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="Sin platos en borrador"
        actionText="Agregar Plato"
        onAction={handleAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Agregar Plato' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('min-h-[44px]'); // cumple pauta touch target 44px

    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
