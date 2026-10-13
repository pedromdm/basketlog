import { describe, expect, it } from 'vitest';
import { FIBA_RULES } from './rules';
import { canStartNextPeriod, periodLabel, periodLengthMs, timeoutsLeft } from './periods';
import { setup } from './test-helpers';

const twoHalves = { ...FIBA_RULES, periods: 2, periodMinutes: 20 };

describe('periodLabel', () => {
  it('uses H1/H2 for two periods, Q1..Qn otherwise, then OT1, OT2...', () => {
    expect([1, 2, 3].map((p) => periodLabel(twoHalves, p))).toEqual(['H1', 'H2', 'OT1']);
    expect([1, 4, 5, 6].map((p) => periodLabel(FIBA_RULES, p))).toEqual(['Q1', 'Q4', 'OT1', 'OT2']);
  });
});

describe('periodLengthMs', () => {
  it('is the period length in regulation and the overtime length after it', () => {
    expect(periodLengthMs(FIBA_RULES, 4)).toBe(10 * 60_000);
    expect(periodLengthMs(FIBA_RULES, 5)).toBe(5 * 60_000);
  });
});

describe('canStartNextPeriod', () => {
  const score = (home: number, away: number) => ({ home, away });
  it('needs the clock at zero, and either periods remaining or a tied score', () => {
    expect(canStartNextPeriod(FIBA_RULES, 2, 5_000, score(10, 8))).toBe(false);
    expect(canStartNextPeriod(FIBA_RULES, 2, 0, score(10, 8))).toBe(true);
    expect(canStartNextPeriod(FIBA_RULES, 4, 0, score(80, 78))).toBe(false);
    expect(canStartNextPeriod(FIBA_RULES, 4, 0, score(78, 78))).toBe(true);
    expect(canStartNextPeriod(FIBA_RULES, 5, 0, score(90, 90))).toBe(true);
  });
});

describe('timeoutsLeft', () => {
  const take = (t: ReturnType<typeof setup>, side: 'home' | 'away') => t.send({ type: 'timeout', side });

  it('counts per half for FIBA: 2 in the first half, 3 in the second, 1 per overtime', () => {
    const t = setup();
    expect(timeoutsLeft(FIBA_RULES, t.state.events, 'home', 1)).toBe(2);
    take(t, 'home');
    take(t, 'away');
    expect(timeoutsLeft(FIBA_RULES, t.state.events, 'home', 2)).toBe(1);
    expect(timeoutsLeft(FIBA_RULES, t.state.events, 'home', 3)).toBe(3);
    t.send({ type: 'setPeriod', period: 5 });
    take(t, 'home');
    expect(timeoutsLeft(FIBA_RULES, t.state.events, 'home', 5)).toBe(0);
    expect(timeoutsLeft(FIBA_RULES, t.state.events, 'home', 6)).toBe(1);
  });

  it('ignores voided timeouts and, for NBA, counts per game', () => {
    const nba = { ...FIBA_RULES, timeoutMode: 'perGame' as const, timeouts: { first: 7, overtime: 2 } };
    const t = setup({ rules: nba });
    take(t, 'home');
    t.send({ type: 'setPeriod', period: 3 });
    take(t, 'home');
    expect(timeoutsLeft(nba, t.state.events, 'home', 3)).toBe(5);
    t.send({ type: 'undo' });
    expect(timeoutsLeft(nba, t.state.events, 'home', 3)).toBe(6);
  });

  it('counts per period when the mode is perPeriod', () => {
    const rules = { ...FIBA_RULES, timeoutMode: 'perPeriod' as const, timeouts: { first: 1, overtime: 1 } };
    const t = setup({ rules });
    take(t, 'home');
    expect(timeoutsLeft(rules, t.state.events, 'home', 1)).toBe(0);
    expect(timeoutsLeft(rules, t.state.events, 'home', 2)).toBe(1);
  });
});
