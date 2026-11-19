import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RationInput } from '../RationInput';

describe('RationInput (F2 - Raciones restantes <= total)', () => {
  it('clamps remainingRations to totalRations and shows inline warning when typing value > total', () => {
    const onChangeRemaining = vi.fn();
    const onChangeTotal = vi.fn();

    render(
      <RationInput
        hasRationsLimit={true}
        totalRations={20}
        remainingRations={15}
        onChangeLimit={vi.fn()}
        onChangeTotal={onChangeTotal}
        onChangeRemaining={onChangeRemaining}
      />
    );

    const remainingInput = screen.getByLabelText(/Raciones Iniciales Disponibles/i);

    // Try typing 25 when total is 20
    fireEvent.change(remainingInput, { target: { value: '25' } });

    // Should clamp to 20
    expect(onChangeRemaining).toHaveBeenCalledWith(20);
    // Should display warning
    expect(
      screen.getByText('Las raciones disponibles no pueden superar el total')
    ).toBeInTheDocument();
  });

  it('clamps remainingRations when totalRations is reduced below current remaining', () => {
    const onChangeRemaining = vi.fn();
    const onChangeTotal = vi.fn();

    render(
      <RationInput
        hasRationsLimit={true}
        totalRations={25}
        remainingRations={20}
        onChangeLimit={vi.fn()}
        onChangeTotal={onChangeTotal}
        onChangeRemaining={onChangeRemaining}
      />
    );

    const totalInput = screen.getByLabelText(/Raciones Totales Preparadas/i);

    // Reduce total to 10
    fireEvent.change(totalInput, { target: { value: '10' } });

    expect(onChangeTotal).toHaveBeenCalledWith(10);
    // Should trim remaining to 10
    expect(onChangeRemaining).toHaveBeenCalledWith(10);
    expect(
      screen.getByText('Las raciones disponibles no pueden superar el total')
    ).toBeInTheDocument();
  });

  it('maintains non-negative integer values', () => {
    const onChangeRemaining = vi.fn();

    render(
      <RationInput
        hasRationsLimit={true}
        totalRations={30}
        remainingRations={10}
        onChangeLimit={vi.fn()}
        onChangeTotal={vi.fn()}
        onChangeRemaining={onChangeRemaining}
      />
    );

    const remainingInput = screen.getByLabelText(/Raciones Iniciales Disponibles/i);
    fireEvent.change(remainingInput, { target: { value: '-5' } });

    expect(onChangeRemaining).toHaveBeenCalledWith(0);
  });
});
