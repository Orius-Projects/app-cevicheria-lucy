/** @vitest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShiftBanner } from '../ShiftBanner';

afterEach(cleanup);

describe('ShiftBanner', () => {
  it('no se muestra cuando el turno está abierto', () => {
    const { container } = render(<ShiftBanner isOpen={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra el aviso y el enlace para abrir turno cuando está cerrado', () => {
    render(
      <MemoryRouter>
        <ShiftBanner isOpen={false} shiftLabel="Almuerzo" />
      </MemoryRouter>
    );

    expect(screen.getByText('No hay turno abierto')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir turno/i })).toHaveAttribute(
      'href',
      '/encargado/turnos'
    );
  });
});
