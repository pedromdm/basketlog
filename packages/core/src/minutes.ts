import { activeEvents } from './derive';
import { periodLengthMs } from './periods';
import type { GameRules } from './rules';
import type { GameEvent, Side } from './types';

export interface PlayingTime {
  /** Time on court, in ms of game clock. */
  ms: number;
  /** Team points minus opponent points while on court. */
  plusMinus: number;
}

/** Game time elapsed (ms) at an event: whole earlier periods plus the elapsed part of its own. */
export function elapsedAt(rules: GameRules, e: Pick<GameEvent, 'period' | 'clockMs'>): number {
  let before = 0;
  for (let p = 1; p < e.period; p++) before += periodLengthMs(rules, p);
  const length = periodLengthMs(rules, e.period);
  return before + Math.min(length, Math.max(0, length - e.clockMs));
}

/**
 * Minutes and plus/minus per player, from the counted events. Players start where the roster says
 * (starters) and change on `sub` events. The game ends at `endMs`, or at the last event if omitted.
 */
export function playingTime(
  events: GameEvent[],
  roster: Record<Side, { starters: string[]; bench: string[] }>,
  rules: GameRules,
  opts: { endMs?: number } = {},
): Record<string, PlayingTime> {
  const live = activeEvents(events);
  const out: Record<string, PlayingTime> = {};
  const get = (id: string) => (out[id] ??= { ms: 0, plusMinus: 0 });
  const court: Record<Side, string[]> = { home: [...roster.home.starters], away: [...roster.away.starters] };
  for (const side of ['home', 'away'] as const) for (const id of [...roster[side].starters, ...roster[side].bench]) get(id);

  let last = 0;
  const advance = (to: number) => {
    const t = Math.max(last, to);
    for (const side of ['home', 'away'] as const) for (const id of court[side]) get(id).ms += t - last;
    last = t;
  };

  for (const e of live) {
    advance(elapsedAt(rules, e));
    if (e.type === 'sub' && e.outPlayerId && e.inPlayerId === undefined) {
      court[e.side] = court[e.side].filter((id) => id !== e.outPlayerId);
    } else if (e.type === 'sub' && e.inPlayerId && e.outPlayerId) {
      court[e.side] = court[e.side].map((id) => (id === e.outPlayerId ? (e.inPlayerId as string) : id));
      get(e.inPlayerId);
    } else if ((e.type === 'shot' || e.type === 'ft') && e.made) {
      const pts = e.points ?? 0;
      const other: Side = e.side === 'home' ? 'away' : 'home';
      for (const id of court[e.side]) get(id).plusMinus += pts;
      for (const id of court[other]) get(id).plusMinus -= pts;
    }
  }
  advance(opts.endMs ?? last);
  return out;
}

/** Time on court as M:SS, rounded to the second. */
export function formatMinutes(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Plus/minus with an explicit sign (zero has none). */
export function formatPlusMinus(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
