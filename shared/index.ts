export * from './types';
export * from './constants';

import { DishStatus } from './types';

/**
 * Deriva el estado del plato en función de su disponibilidad y raciones restantes.
 * Regla de negocio según data-model.md §3.8:
 * if (!active) -> INACTIVO
 * else if (manuallySoldOut) -> AGOTADO
 * else if (!hasRationsLimit) -> DISPONIBLE
 * else if (remainingRations === 0) -> AGOTADO
 * else if (remainingRations <= lowStockThreshold) -> ULTIMAS_RACIONES
 * else -> DISPONIBLE
 */
export function deriveDishStatus(item: {
  active: boolean;
  manuallySoldOut: boolean;
  hasRationsLimit: boolean;
  remainingRations?: number | null;
  lowStockThreshold?: number;
}): DishStatus {
  if (!item.active) return 'INACTIVO';
  if (item.manuallySoldOut) return 'AGOTADO';
  if (!item.hasRationsLimit) return 'DISPONIBLE';
  const remaining = item.remainingRations ?? 0;
  if (remaining === 0) return 'AGOTADO';
  const threshold = item.lowStockThreshold ?? 5;
  if (remaining <= threshold) return 'ULTIMAS_RACIONES';
  return 'DISPONIBLE';
}
