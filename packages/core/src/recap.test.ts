import { describe, expect, it } from 'vitest';
import type { Play } from './derive';
import { biggestRuns, leadStats, lineScore } from './recap';

/** Plays as derive() produces them: only the clock position and the running score matter here. */
const play = (period: number, clockMs: number, home: number, away: number): Play => ({
  groupId: `${period}-${clockMs}-${home}-${away}`,
  period,
  clockMs,
  side: 'home',
  text: '',
  points: 0,
  scoreAfter: { home, away },
});

const PLAYS: Play[] = [
  play(1, 540_000, 2, 0),
  play(1, 500_000, 2, 3),
  play(1, 300_000, 5, 3),
  play(2, 580_000, 5, 5),
  play(2, 400_000, 5, 8),
  play(2, 100_000, 10, 8),
  play(3, 500_000, 10, 10),
  play(3, 200_000, 16, 10),
];

describe('lineScore', () => {
  it('sums each period from the running score, including periods without scoring', () => {
    expect(lineScore(PLAYS, 4)).toEqual([
      { period: 1, home: 5, away: 3 },
      { period: 2, home: 5, away: 5 },
      { period: 3, home: 6, away: 2 },
      { period: 4, home: 0, away: 0 },
    ]);
  });

  it('adds an overtime row only when overtime was played', () => {
    const withOt = [...PLAYS, play(5, 250_000, 18, 10)];
    expect(lineScore(withOt, 4).map((r) => r.period)).toEqual([1, 2, 3, 4, 5]);
    expect(lineScore(withOt, 4)[4]).toEqual({ period: 5, home: 2, away: 0 });
  });
});

describe('leadStats', () => {
  it('finds the biggest lead for each side, the number of lead changes and of ties', () => {
    // difference after each play: +2, -1, +2, 0, -3, +2, 0, +6
    expect(leadStats(PLAYS)).toEqual({ biggestLead: { home: 6, away: 3 }, leadChanges: 4, ties: 2 });
  });

  it('is all zeros before anything is scored', () => {
    expect(leadStats([])).toEqual({ biggestLead: { home: 0, away: 0 }, leadChanges: 0, ties: 0 });
  });
});

describe('biggestRuns', () => {
  it('finds the most unanswered points per side and where the run ended', () => {
    // deltas: H2, A3, H3, A2, A3, H5, A2, H6
    expect(biggestRuns(PLAYS)).toEqual({
      home: { points: 6, period: 3, clockMs: 200_000 },
      away: { points: 5, period: 2, clockMs: 400_000 },
    });
  });

  it('is zero for a side that never scored', () => {
    expect(biggestRuns([play(1, 500_000, 2, 0)]).away).toEqual({ points: 0, period: 1, clockMs: 500_000 });
  });
});
