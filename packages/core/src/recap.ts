import type { Play } from './derive';
import type { Side } from './types';

export interface PeriodScore {
  period: number;
  home: number;
  away: number;
}

/**
 * Points per period from the running score. Regulation periods always appear (zeros included);
 * overtime periods appear only if something happened in them.
 */
export function lineScore(plays: Play[], regulationPeriods: number): PeriodScore[] {
  const lastPeriod = plays.reduce((max, p) => Math.max(max, p.period), regulationPeriods);
  const rows: PeriodScore[] = Array.from({ length: lastPeriod }, (_, i) => ({ period: i + 1, home: 0, away: 0 }));
  let before: Record<Side, number> = { home: 0, away: 0 };
  for (const p of plays) {
    const row = rows[p.period - 1]!;
    row.home += p.scoreAfter.home - before.home;
    row.away += p.scoreAfter.away - before.away;
    before = p.scoreAfter;
  }
  return rows;
}

export interface LeadStats {
  biggestLead: Record<Side, number>;
  /** Times the lead passed from one side to the other (a tie in between doesn't hide a change). */
  leadChanges: number;
  /** Times the score became tied after a score (the 0-0 start doesn't count). */
  ties: number;
}

export function leadStats(plays: Play[]): LeadStats {
  const stats: LeadStats = { biggestLead: { home: 0, away: 0 }, leadChanges: 0, ties: 0 };
  let leader: Side | null = null;
  let previous = 0;
  for (const { scoreAfter } of plays) {
    const diff = scoreAfter.home - scoreAfter.away;
    if (diff > 0) stats.biggestLead.home = Math.max(stats.biggestLead.home, diff);
    if (diff < 0) stats.biggestLead.away = Math.max(stats.biggestLead.away, -diff);
    if (diff === 0 && previous !== 0) stats.ties++;
    if (diff !== 0) {
      const now: Side = diff > 0 ? 'home' : 'away';
      if (leader && leader !== now) stats.leadChanges++;
      leader = now;
    }
    previous = diff;
  }
  return stats;
}

export interface Run {
  points: number;
  /** Where the run's last basket happened (or the last play when the side never scored). */
  period: number;
  clockMs: number;
}

/** The most points a side scored without the other side answering. */
export function biggestRuns(plays: Play[]): Record<Side, Run> {
  const last = plays.at(-1);
  const empty = (): Run => ({ points: 0, period: last?.period ?? 1, clockMs: last?.clockMs ?? 0 });
  const best: Record<Side, Run> = { home: empty(), away: empty() };
  const current: Record<Side, number> = { home: 0, away: 0 };
  let before: Record<Side, number> = { home: 0, away: 0 };
  for (const p of plays) {
    for (const side of ['home', 'away'] as const) {
      const other: Side = side === 'home' ? 'away' : 'home';
      const gained = p.scoreAfter[side] - before[side];
      if (p.scoreAfter[other] !== before[other]) current[side] = 0;
      if (gained > 0) {
        current[side] += gained;
        if (current[side] > best[side].points) best[side] = { points: current[side], period: p.period, clockMs: p.clockMs };
      }
    }
    before = p.scoreAfter;
  }
  return best;
}
