import { activeEvents, periodLabel, type GameEvent, type GameRules, type Play, type Side } from '@basket-log/core';
import type { GameView } from '@basket-log/db';

/** m:ss, rounded up like a scoreboard. */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export const statusLabel = (status: GameView['status']): string => ({ live: 'LIVE', final: 'FINAL', scheduled: 'UPCOMING' })[status];

/** "Sat 12 Oct, 19:30" in the device's locale; empty when the game has no start time. */
export function startsAtText(startsAt: string | null): string {
  if (!startsAt) return '';
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

/** The period and clock of the newest event, e.g. "Q3 4:12"; null before anything happened. */
export function latestPosition(rules: GameRules, events: GameEvent[]): string | null {
  const last = activeEvents(events).at(-1);
  return last ? `${periodLabel(rules, last.period)} ${clockText(last.clockMs)}` : null;
}

export interface FeedRow {
  groupId: string;
  period: number;
  clock: string;
  text: string;
  /** The side whose bar colours the row: the scoring side for scoring plays, else the first event's side. */
  side: Side;
  /** Points scored in the play, 0 for non-scoring plays. */
  points: number;
  score: string;
}

/**
 * Plays as feed rows, newest first. A foul with free throws is credited to the team that scored,
 * which is found from the running score rather than from the play's first event.
 */
export function feedRows(plays: Play[]): FeedRow[] {
  const rows: FeedRow[] = [];
  let before: Record<Side, number> = { home: 0, away: 0 };
  for (const p of plays) {
    const homeGain = p.scoreAfter.home - before.home;
    const awayGain = p.scoreAfter.away - before.away;
    before = p.scoreAfter;
    if (!p.text) continue;
    const scoringSide: Side | null = homeGain > 0 ? 'home' : awayGain > 0 ? 'away' : null;
    rows.push({
      groupId: p.groupId,
      period: p.period,
      clock: clockText(p.clockMs),
      text: p.text,
      side: scoringSide ?? p.side,
      points: homeGain + awayGain,
      score: `${p.scoreAfter.home}–${p.scoreAfter.away}`,
    });
  }
  return rows.reverse();
}

/** Distinct periods that have plays, ascending. */
export const feedPeriods = (rows: FeedRow[]): number[] => [...new Set(rows.map((r) => r.period))].sort((a, b) => a - b);

/** Plays of a game in which the player has an event (shot, assist, rebound, foul, sub...). */
export function playsOfPlayer(game: GameView, playerId: string): Play[] {
  const groups = new Set(
    activeEvents(game.events)
      .filter((e) => e.playerId === playerId || e.inPlayerId === playerId || e.outPlayerId === playerId)
      .map((e) => e.groupId),
  );
  return game.derived.plays.filter((p) => groups.has(p.groupId) && p.text);
}

export const pctText = (value: number | null): string => (value === null ? '–' : `${value.toFixed(1)}%`);

export const madeOf = (made: number, attempts: number): string => `${made}/${attempts}`;
