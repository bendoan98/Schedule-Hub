import { describe, expect, it } from 'vitest';
import { fromIsoDate, getMonday, getShiftDate, getWeekHeaders, toIsoDate } from './date';

describe('date utils', () => {
  it('returns monday for any date in the same week', () => {
    const monday = getMonday(new Date(2026, 2, 11));
    expect(toIsoDate(monday)).toBe('2026-03-09');
  });

  it('converts to/from ISO dates', () => {
    const iso = toIsoDate(new Date(2026, 2, 15));
    expect(iso).toBe('2026-03-15');
    expect(toIsoDate(fromIsoDate(iso))).toBe('2026-03-15');
  });

  it('builds week headers and shift dates', () => {
    const headers = getWeekHeaders('2026-03-09');

    expect(headers).toHaveLength(7);
    expect(headers[0].isoDate).toBe('2026-03-09');
    expect(headers[6].isoDate).toBe('2026-03-15');

    const shiftDate = getShiftDate('2026-03-09', 2);
    expect(toIsoDate(shiftDate)).toBe('2026-03-11');
  });
});
