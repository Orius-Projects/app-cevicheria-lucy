/**
 * Utilidades para Feedback Háptico (Vibración) en dispositivos móviles.
 * Sigue las pautas de la Sección 16 del Design System de Cevichería Lucy.
 * Funciona de forma segura con fallback silencioso si la API no está soportada.
 */

/**
 * Dispara una vibración con un patrón específico en milisegundos.
 */
export function triggerVibration(pattern: number | number[]): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch {
    // Silencioso ante bloqueos de permisos o entornos restringidos
  }
  return false;
}

/**
 * Patrón háptico para "Plato Listo para recoger": doble pulso táctil.
 * [100ms vibración, 50ms pausa, 100ms vibración]
 */
export function triggerOrderReadyVibration(): boolean {
  return triggerVibration([100, 50, 100]);
}

/**
 * Patrón háptico para confirmación de acción (ej. pedido enviado o ítem añadido).
 * Pulso corto de 60ms.
 */
export function triggerActionVibration(): boolean {
  return triggerVibration(60);
}

/**
 * Patrón háptico para error o advertencia (ej. plato agotado o acción bloqueada).
 * Pulso largo de 200ms.
 */
export function triggerErrorVibration(): boolean {
  return triggerVibration(200);
}
