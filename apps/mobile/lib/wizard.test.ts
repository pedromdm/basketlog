import { describe, expect, it } from 'vitest';
import { goToStep, initialWizard, selectTeam, startsAtOf, STEPS, toNewGameInput } from './wizard';

describe('wizard state', () => {
  it('clamps the step to the available steps', () => {
    expect(goToStep(initialWizard(), -3).step).toBe(0);
    expect(goToStep(initialWizard(), 99).step).toBe(STEPS.length - 1);
  });

  it('does not allow the same team on both sides and clears starters', () => {
    let s = initialWizard();
    s = selectTeam(s, 'home', 't1');
    s = { ...s, starters: { home: ['p1'], away: [] } };
    s = selectTeam(s, 'away', 't1');
    expect(s.teamIds).toEqual({ home: null, away: 't1' });
    expect(s.starters.home).toEqual([]);
  });

  it('builds the game input, ignoring an invalid date and blank text', () => {
    const base = { ...initialWizard(), teamIds: { home: 'h', away: 'a' }, competition: '  Cup ', venue: ' ' };
    const withDate = toNewGameInput({ ...base, date: '2026-03-14' });
    expect(withDate.competition).toBe('Cup');
    expect(withDate.venue).toBeUndefined();
    expect(withDate.startsAt).toBeDefined();
    expect(toNewGameInput({ ...base, date: '14/03/2026' }).startsAt).toBeUndefined();
  });
});

describe('start time', () => {
  it('combines the date and the time in the device time zone', () => {
    expect(startsAtOf('2026-03-14', '20:30')).toBe(new Date('2026-03-14T20:30:00').toISOString());
  });

  it('starts a dated game at 12:00 when no valid time is given, and has no start without a date', () => {
    expect(startsAtOf('2026-03-14', '')).toBe(new Date('2026-03-14T12:00:00').toISOString());
    expect(startsAtOf('2026-03-14', '8pm')).toBe(new Date('2026-03-14T12:00:00').toISOString());
    expect(startsAtOf('', '20:30')).toBeUndefined();
  });
});
