import { describe, it, expect } from 'vitest';
import { formatLima, formatLimaTime } from '../datetime';

describe('formatLima and formatLimaTime', () => {
  it('formats UTC ISO date into America/Lima date-time', () => {
    // 2026-11-18T20:30:00Z -> Lima is UTC-5 -> 15:30:00
    const formatted = formatLima('2026-11-18T20:30:00Z');
    expect(formatted).toContain('18/11/2026');
    expect(formatted).toContain('15:30');
  });

  it('formats time only via formatLimaTime', () => {
    const formattedTime = formatLimaTime('2026-11-18T20:30:00Z');
    expect(formattedTime).toBe('15:30');
    expect(formattedTime).not.toContain('18/11/2026');
  });

  it('handles invalid or empty inputs without throwing', () => {
    expect(formatLima(null)).toBe('-');
    expect(formatLima(undefined)).toBe('-');
    expect(formatLima('invalid-date')).toBe('-');
  });
});
