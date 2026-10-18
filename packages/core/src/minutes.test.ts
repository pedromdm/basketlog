import { describe, expect, it } from 'vitest';
import { formatMinutes, formatPlusMinus, playingTime } from './minutes';
import { FIBA_RULES } from './rules';
import { ROSTER } from './test-helpers';
import type { GameEvent } from './types';

const PERIOD = FIBA_RULES.periodMinutes * 60_000;
let n = 0;
const ev = (e: Partial<GameEvent> & Pick<GameEvent, 'type' | 'side'>): GameEvent => ({
  id: `e${++n}`, gameId: 'g1', groupId: `g${n}`, seq: n, period: 1, clockMs: PERIOD, playerId: null,
  createdBy: 'u', createdAt: '2026-01-01T00:00:00.000Z', ...e,
});
const min = (m: number) => m * 60_000;

describe('playingTime', () => {
  it('gives starters the whole game when nobody is substituted', () => {
    const events = [ev({ type: 'shot', side: 'home', playerId: 'h1', made: true, points: 2, clockMs: min(5) })];
    const t = playingTime(events, ROSTER, FIBA_RULES, { endMs: PERIOD });
    expect(t.h1?.ms).toBe(PERIOD);
    expect(t.h6?.ms).toBe(0);
  });

  it('splits time at a substitution', () => {
    const events = [
      ev({ type: 'sub', side: 'home', playerId: 'h1', outPlayerId: 'h1', inPlayerId: 'h6', clockMs: min(6) }),
    ];
    const t = playingTime(events, ROSTER, FIBA_RULES, { endMs: PERIOD });
    expect(t.h1?.ms).toBe(min(4));
    expect(t.h6?.ms).toBe(min(6));
    expect(t.h2?.ms).toBe(PERIOD);
  });

  it('keeps counting across periods', () => {
    const events = [
      ev({ type: 'sub', side: 'home', playerId: 'h1', outPlayerId: 'h1', inPlayerId: 'h6', period: 2, clockMs: min(8) }),
    ];
    const t = playingTime(events, ROSTER, FIBA_RULES, { endMs: 2 * PERIOD });
    expect(t.h1?.ms).toBe(PERIOD + min(2));
    expect(t.h6?.ms).toBe(min(8));
  });

  it('adds points to players on court and subtracts them for the opponents', () => {
    const events = [
      ev({ type: 'shot', side: 'home', playerId: 'h1', made: true, points: 3, clockMs: min(8) }),
      ev({ type: 'sub', side: 'home', playerId: 'h1', outPlayerId: 'h1', inPlayerId: 'h6', clockMs: min(6) }),
      ev({ type: 'ft', side: 'away', playerId: 'a1', made: true, points: 1, clockMs: min(5) }),
      ev({ type: 'shot', side: 'away', playerId: 'a1', made: false, points: 2, clockMs: min(4) }),
    ];
    const t = playingTime(events, ROSTER, FIBA_RULES, { endMs: PERIOD });
    expect(t.h1?.plusMinus).toBe(3);
    expect(t.h2?.plusMinus).toBe(2);
    expect(t.h6?.plusMinus).toBe(-1);
    expect(t.a1?.plusMinus).toBe(-2);
  });

  it('ignores voided plays', () => {
    const shot = ev({ type: 'shot', side: 'home', playerId: 'h1', made: true, points: 2, clockMs: min(8), groupId: 'x' });
    const events = [shot, ev({ type: 'void', side: 'home', voidsGroupId: 'x' })];
    expect(playingTime(events, ROSTER, FIBA_RULES, { endMs: PERIOD }).h1?.plusMinus).toBe(0);
  });

  it('ends at the last event when no end is given', () => {
    const events = [ev({ type: 'foul', side: 'home', playerId: 'h1', clockMs: min(7) })];
    expect(playingTime(events, ROSTER, FIBA_RULES).h1?.ms).toBe(min(3));
  });
});

describe('formatting', () => {
  it('formats minutes and signed plus/minus', () => {
    expect(formatMinutes(min(32) + 15_000)).toBe('32:15');
    expect(formatMinutes(0)).toBe('0:00');
    expect(formatPlusMinus(4)).toBe('+4');
    expect(formatPlusMinus(-3)).toBe('-3');
    expect(formatPlusMinus(0)).toBe('0');
  });
});
