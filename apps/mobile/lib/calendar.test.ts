import { describe, expect, it } from 'vitest';
import { HOURS, MINUTES, monthGrid, parseHm, parseIsoDate, toHm, toIsoDate } from './calendar';

describe('monthGrid', () => {
  it('lays a month out in weeks starting on Monday, padding with nulls', () => {
    const weeks = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(weeks.at(-1)!.filter(Boolean).at(-1)).toBe(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it('handles a month that starts on Monday and leap-year February', () => {
    expect(monthGrid(2026, 5)[0]![0]).toBe(1); // June 2026 starts on a Monday
    expect(monthGrid(2028, 1).flat().filter(Boolean)).toHaveLength(29);
  });
});

describe('date and time strings', () => {
  it('round-trips YYYY-MM-DD and rejects anything else', () => {
    expect(toIsoDate(2026, 2, 5)).toBe('2026-03-05');
    expect(parseIsoDate('2026-03-05')).toEqual({ year: 2026, month: 2, day: 5 });
    expect(parseIsoDate('05/03/2026')).toBeNull();
    expect(parseIsoDate('2026-02-31')).toBeNull();
  });

  it('formats and parses HH:mm for every hour from 0 to 23', () => {
    expect(HOURS).toHaveLength(24);
    expect(HOURS[0]).toBe(0);
    expect(HOURS.at(-1)).toBe(23);
    expect(MINUTES).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(toHm(0, 5)).toBe('00:05');
    expect(toHm(23, 55)).toBe('23:55');
    expect(parseHm('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseHm('24:00')).toBeNull();
    expect(parseHm('')).toBeNull();
  });
});
