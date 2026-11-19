import { describe, it, expect } from 'vitest';
import { formatSoles } from '../money';

describe('formatSoles', () => {
  it('formats cents into Soles string with 2 decimal places', () => {
    expect(formatSoles(3500)).toBe('S/ 35.00');
    expect(formatSoles(4250)).toBe('S/ 42.50');
    expect(formatSoles(99)).toBe('S/ 0.99');
    expect(formatSoles(0)).toBe('S/ 0.00');
  });

  it('handles null, undefined and NaN gracefully', () => {
    expect(formatSoles(null)).toBe('S/ 0.00');
    expect(formatSoles(undefined)).toBe('S/ 0.00');
    expect(formatSoles(NaN)).toBe('S/ 0.00');
  });
});
