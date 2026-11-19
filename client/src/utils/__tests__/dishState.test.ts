import { describe, it, expect } from 'vitest';
import { deriveDishStatus } from '../dishState';

describe('Utilidad deriveDishStatus (T004, T025)', () => {
  it('debe retornar INACTIVO si active es false, sin importar raciones', () => {
    expect(
      deriveDishStatus({
        active: false,
        manuallySoldOut: false,
        hasRationsLimit: true,
        remainingRations: 10
      })
    ).toBe('INACTIVO');
  });

  it('debe retornar AGOTADO si manuallySoldOut es true, incluso con raciones restantes', () => {
    expect(
      deriveDishStatus({
        active: true,
        manuallySoldOut: true,
        hasRationsLimit: true,
        remainingRations: 15
      })
    ).toBe('AGOTADO');
  });

  it('debe retornar DISPONIBLE si no tiene límite de raciones', () => {
    expect(
      deriveDishStatus({
        active: true,
        manuallySoldOut: false,
        hasRationsLimit: false
      })
    ).toBe('DISPONIBLE');
  });

  it('debe retornar AGOTADO si tiene límite y remainingRations es 0', () => {
    expect(
      deriveDishStatus({
        active: true,
        manuallySoldOut: false,
        hasRationsLimit: true,
        remainingRations: 0
      })
    ).toBe('AGOTADO');
  });

  it('debe retornar ULTIMAS_RACIONES si remainingRations <= lowStockThreshold (default 5)', () => {
    expect(
      deriveDishStatus({
        active: true,
        manuallySoldOut: false,
        hasRationsLimit: true,
        remainingRations: 5
      })
    ).toBe('ULTIMAS_RACIONES');

    expect(
      deriveDishStatus({
        active: true,
        manuallySoldOut: false,
        hasRationsLimit: true,
        remainingRations: 3
      })
    ).toBe('ULTIMAS_RACIONES');
  });

  it('debe respetar un lowStockThreshold personalizado si se provee', () => {
    expect(
      deriveDishStatus({
        active: true,
        manuallySoldOut: false,
        hasRationsLimit: true,
        remainingRations: 7,
        lowStockThreshold: 8
      })
    ).toBe('ULTIMAS_RACIONES');

    expect(
      deriveDishStatus({
        active: true,
        manuallySoldOut: false,
        hasRationsLimit: true,
        remainingRations: 9,
        lowStockThreshold: 8
      })
    ).toBe('DISPONIBLE');
  });

  it('debe retornar DISPONIBLE si remainingRations > threshold', () => {
    expect(
      deriveDishStatus({
        active: true,
        manuallySoldOut: false,
        hasRationsLimit: true,
        remainingRations: 6
      })
    ).toBe('DISPONIBLE');
  });
});
