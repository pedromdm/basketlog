import type { GameRules } from './rules';
import { activeEvents } from './derive';
import type { GameEvent, Side } from './types';

/** Two periods read H1/H2, otherwise Q1..Qn; anything after regulation is OT1, OT2... */
export function periodLabel(rules: GameRules, period: number): string {
  if (period > rules.periods) return `OT${period - rules.periods}`;
  return rules.periods === 2 ? `H${period}` : `Q${period}`;
}

export function periodLengthMs(rules: GameRules, period: number): number {
  return (period > rules.periods ? rules.overtimeMinutes : rules.periodMinutes) * 60_000;
}

/** The next period only starts at 0:00, and only if periods remain or the score is tied (overtime). */
export function canStartNextPeriod(rules: GameRules, period: number, clockMs: number, score: Record<Side, number>): boolean {
  return clockMs <= 0 && (period < rules.periods || score.home === score.away);
}

/** The slice of the game a timeout allowance applies to: whole game, a half, a period, or one overtime. */
function timeoutPart(rules: GameRules, period: number): string {
  if (period > rules.periods) return `OT${period}`;
  if (rules.timeoutMode === 'perGame') return 'G';
  if (rules.timeoutMode === 'perPeriod') return `P${period}`;
  return period <= Math.ceil(rules.periods / 2) ? 'H1' : 'H2';
}

/** Timeouts a side still has in the part of the game that `period` belongs to (voided ones don't count). */
export function timeoutsLeft(rules: GameRules, events: GameEvent[], side: Side, period: number): number {
  const part = timeoutPart(rules, period);
  const allowed = part.startsWith('OT') ? rules.timeouts.overtime : part === 'H2' ? (rules.timeouts.second ?? rules.timeouts.first) : rules.timeouts.first;
  const used = activeEvents(events).filter((e) => e.type === 'timeout' && e.side === side && timeoutPart(rules, e.period) === part).length;
  return Math.max(0, allowed - used);
}
