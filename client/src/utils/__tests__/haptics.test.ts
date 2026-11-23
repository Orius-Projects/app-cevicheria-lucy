import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  triggerVibration,
  triggerOrderReadyVibration,
  triggerActionVibration,
  triggerErrorVibration
} from '../haptics';

describe('Haptics Utility (Spec & Design System Section 16)', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  it('debe ejecutar triggerVibration con el patrón especificado si navigator.vibrate está soportado', () => {
    const mockVibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: mockVibrate },
      configurable: true,
      writable: true
    });

    const res = triggerVibration(100);
    expect(res).toBe(true);
    expect(mockVibrate).toHaveBeenCalledWith(100);
  });

  it('debe capturar errores de navigator.vibrate de forma silenciosa y retornar false', () => {
    const mockVibrate = vi.fn().mockImplementation(() => {
      throw new Error('Permiso denegado');
    });
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: mockVibrate },
      configurable: true,
      writable: true
    });

    const res = triggerVibration(50);
    expect(res).toBe(false);
  });

  it('triggerOrderReadyVibration debe disparar el patrón canónico [100, 50, 100]', () => {
    const mockVibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: mockVibrate },
      configurable: true,
      writable: true
    });

    const res = triggerOrderReadyVibration();
    expect(res).toBe(true);
    expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('triggerActionVibration debe disparar pulso corto de 60ms', () => {
    const mockVibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: mockVibrate },
      configurable: true,
      writable: true
    });

    const res = triggerActionVibration();
    expect(res).toBe(true);
    expect(mockVibrate).toHaveBeenCalledWith(60);
  });

  it('triggerErrorVibration debe disparar pulso largo de 200ms', () => {
    const mockVibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: mockVibrate },
      configurable: true,
      writable: true
    });

    const res = triggerErrorVibration();
    expect(res).toBe(true);
    expect(mockVibrate).toHaveBeenCalledWith(200);
  });
});
