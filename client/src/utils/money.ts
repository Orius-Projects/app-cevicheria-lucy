/**
 * Formatea un monto en centavos enteros a formato moneda peruana (PEN): S/ 00.00
 */
export function formatSoles(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return 'S/ 0.00';
  }
  const soles = cents / 100;
  return `S/ ${soles.toFixed(2)}`;
}
