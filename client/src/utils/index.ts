// Client Utilities
export function formatCurrencyPEN(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}
