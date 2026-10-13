import { describe, expect, it } from 'vitest';
import type { PlayerLine, ShotDot } from './derive';
import { percentage, shotZones, teamLeaders, teamTotals } from './boxscore';

const line = (over: Partial<PlayerLine>): PlayerLine => ({
  pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, ...over,
});

describe('teamTotals', () => {
  it('adds up player lines and derives total rebounds', () => {
    const totals = teamTotals([
      line({ pts: 10, fgm: 4, fga: 9, tpm: 2, tpa: 5, ftm: 0, fta: 1, oreb: 1, dreb: 3, ast: 2 }),
      line({ pts: 6, fgm: 3, fga: 4, ftm: 0, fta: 0, oreb: 0, dreb: 2, tov: 1, pf: 2 }),
    ]);
    expect(totals).toMatchObject({ pts: 16, fgm: 7, fga: 13, tpm: 2, tpa: 5, fta: 1, reb: 6, ast: 2, tov: 1, pf: 2 });
  });
});

describe('percentage', () => {
  it('is a one-decimal percent and null when nothing was attempted', () => {
    expect(percentage(7, 13)).toBe(53.8);
    expect(percentage(0, 4)).toBe(0);
    expect(percentage(0, 0)).toBeNull();
  });
});

describe('teamLeaders', () => {
  it('picks the best scorer, rebounder and passer, and the first player on ties', () => {
    const leaders = teamLeaders({
      a: line({ pts: 12, oreb: 1, dreb: 1, ast: 3 }),
      b: line({ pts: 12, oreb: 4, dreb: 2, ast: 1 }),
      c: line({ pts: 3, ast: 3 }),
    });
    expect(leaders).toEqual({
      pts: { playerId: 'a', value: 12 },
      reb: { playerId: 'b', value: 6 },
      ast: { playerId: 'a', value: 3 },
    });
  });

  it('has no leader for an empty team', () => {
    expect(teamLeaders({})).toEqual({ pts: null, reb: null, ast: null });
  });
});

const dot = (x: number, y: number, made: boolean, points: 2 | 3): ShotDot => ({ playerId: 'p', side: 'home', made, points, x, y });

describe('shotZones', () => {
  it('groups shots into paint, mid-range, corner 3 and above-the-break 3 with makes and attempts', () => {
    const zones = shotZones([
      dot(250, 100, true, 2), // paint
      dot(250, 150, false, 2), // paint (the key runs to y = 190)
      dot(100, 250, true, 2), // mid-range
      dot(10, 100, true, 3), // corner 3
      dot(250, 300, false, 3), // above the break
      dot(400, 300, false, 3), // above the break
    ]);
    expect(zones).toEqual({
      paint: { made: 1, attempts: 2 },
      midRange: { made: 1, attempts: 1 },
      corner3: { made: 1, attempts: 1 },
      aboveBreak3: { made: 0, attempts: 2 },
    });
  });
});
