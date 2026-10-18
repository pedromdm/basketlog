import { describe, expect, it } from 'vitest';
import type { Play, PlayerLine } from './derive';
import { extraTeamStats, scoreFlow, topPerformers } from './overview';
import { FIBA_RULES } from './rules';
import type { GameEvent } from './types';

const MIN = 60_000;
const play = (period: number, clockMin: number, home: number, away: number): Play => ({
  groupId: `g${period}-${clockMin}-${home}-${away}`, period, clockMs: clockMin * MIN, side: 'home', text: 'x', points: 0, scoreAfter: { home, away },
});

describe('scoreFlow', () => {
  it('positions each change of the score difference by game time and marks the period ends', () => {
    const f = scoreFlow([play(1, 5, 2, 0), play(1, 5, 2, 0), play(2, 5, 2, 3)], FIBA_RULES);
    expect(f.points.map((p) => p.diff)).toEqual([0, 2, -1, -1]);
    expect(f.points[1]!.x).toBeCloseTo(5 / 20);
    expect(f.points[2]!.x).toBeCloseTo(15 / 20);
    expect(f.periodEnds).toEqual([0.5, 1]);
    expect(f.maxLead).toBe(2);
  });

  it('is just the start when nothing was scored', () => {
    expect(scoreFlow([], FIBA_RULES).points).toEqual([{ x: 0, diff: 0 }]);
  });
});

let n = 0;
const ev = (e: Partial<GameEvent> & Pick<GameEvent, 'type' | 'side'>): GameEvent => ({
  id: `e${++n}`, gameId: 'g', groupId: `g${n}`, seq: n, period: 1, clockMs: 0, playerId: null, createdBy: 'u', createdAt: '', ...e,
});

describe('extraTeamStats', () => {
  it('counts made field goals in the paint and in fast-break plays, ignoring free throws and voids', () => {
    const fb = ev({ type: 'shot', side: 'home', made: true, points: 2, x: 250, y: 60, groupId: 'a' });
    const events = [
      fb,
      ev({ type: 'fb', side: 'home', fastBreak: true, groupId: 'a' }),
      ev({ type: 'shot', side: 'home', made: true, points: 3, x: 250, y: 300 }),
      ev({ type: 'shot', side: 'away', made: true, points: 2, x: 200, y: 100 }),
      ev({ type: 'shot', side: 'away', made: false, points: 2, x: 200, y: 100 }),
      ev({ type: 'ft', side: 'away', made: true, points: 1 }),
      ev({ type: 'shot', side: 'away', made: true, points: 2, x: 250, y: 50, groupId: 'v' }),
      ev({ type: 'void', side: 'away', voidsGroupId: 'v' }),
    ];
    expect(extraTeamStats(events)).toEqual({ paint: { home: 2, away: 2 }, fastBreak: { home: 2, away: 0 } });
  });
});

describe('topPerformers', () => {
  const line = (over: Partial<PlayerLine>): PlayerLine => ({
    pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, ...over,
  });

  it('ranks by points, then rebounds plus assists, and skips players who did nothing', () => {
    const lines = { a: line({ pts: 10 }), b: line({ pts: 10, ast: 3 }), c: line({ pts: 4 }), d: line({}) };
    expect(topPerformers(lines, ['a', 'b', 'c', 'd', 'missing'], 3).map((p) => p.playerId)).toEqual(['b', 'a', 'c']);
  });
});
