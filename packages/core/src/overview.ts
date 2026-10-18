import type { Play, PlayerLine } from './derive';
import { activeEvents } from './derive';
import { elapsedAt } from './minutes';
import { periodLengthMs } from './periods';
import type { GameRules } from './rules';
import type { GameEvent, Side } from './types';

export interface FlowPoint {
  /** Position in the game, 0 (tip-off) to 1 (end of the last period played). */
  x: number;
  /** Home minus away. */
  diff: number;
}

export interface ScoreFlow {
  points: FlowPoint[];
  /** x of the end of each period played, ascending (the last one is 1). */
  periodEnds: number[];
  /** Biggest absolute lead in the series, for scaling. */
  maxLead: number;
}

/** The score difference over the game, one point per scoring play, positioned by game time. */
export function scoreFlow(plays: Play[], rules: GameRules): ScoreFlow {
  const lastPeriod = plays.reduce((max, p) => Math.max(max, p.period), 1);
  let total = 0;
  const ends: number[] = [];
  for (let p = 1; p <= lastPeriod; p++) {
    total += periodLengthMs(rules, p);
    ends.push(total);
  }
  const at = (p: Play) => Math.min(1, Math.max(0, elapsedAt(rules, p) / (total || 1)));
  const points: FlowPoint[] = [{ x: 0, diff: 0 }];
  let before = 0;
  for (const p of plays) {
    const diff = p.scoreAfter.home - p.scoreAfter.away;
    if (diff === before) continue;
    points.push({ x: at(p), diff });
    before = diff;
  }
  const last = plays.at(-1);
  if (last) points.push({ x: at(last), diff: before });
  return { points, periodEnds: ends.map((e) => e / (total || 1)), maxLead: points.reduce((m, q) => Math.max(m, Math.abs(q.diff)), 0) };
}

// same geometry as the court and shotZones: the key is x 170-330 and y 0-190
const inPaint = (x: number, y: number) => x >= 170 && x <= 330 && y <= 190;

export interface ExtraTeamStats {
  /** Points from made field goals taken in the paint (free throws excluded; needs shot locations). */
  paint: Record<Side, number>;
  /** Points from made field goals of plays answered "fast break" (needs that question to be on). */
  fastBreak: Record<Side, number>;
}

export function extraTeamStats(events: GameEvent[]): ExtraTeamStats {
  const live = activeEvents(events);
  const fast = new Set(live.filter((e) => e.type === 'fb' && e.fastBreak).map((e) => e.groupId));
  const out: ExtraTeamStats = { paint: { home: 0, away: 0 }, fastBreak: { home: 0, away: 0 } };
  for (const e of live) {
    if (e.type !== 'shot' || !e.made) continue;
    const points = e.points ?? 0;
    if (e.x !== undefined && e.y !== undefined && inPaint(e.x, e.y)) out.paint[e.side] += points;
    if (fast.has(e.groupId)) out.fastBreak[e.side] += points;
  }
  return out;
}

export interface Performer {
  playerId: string;
  line: PlayerLine;
}

/** The best `count` players by points (rebounds + assists break ties), among `playerIds` who played or scored. */
export function topPerformers(lines: Record<string, PlayerLine>, playerIds: string[], count: number): Performer[] {
  const value = (l: PlayerLine) => l.pts * 1000 + l.oreb + l.dreb + l.ast;
  return playerIds
    .flatMap((playerId) => (lines[playerId] ? [{ playerId, line: lines[playerId] as PlayerLine }] : []))
    .filter(({ line }) => value(line) > 0)
    .sort((a, b) => value(b.line) - value(a.line))
    .slice(0, count);
}
