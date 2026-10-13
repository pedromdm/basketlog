// Pure notification rules: no IO, no imports, so they run unchanged in Deno, Node and tests.

export type Side = 'home' | 'away';

export interface EventRow {
  group_id: string;
  type: string;
  side: Side;
  period: number;
  clock_ms: number;
  payload: { made?: boolean; points?: number; voidsGroupId?: string } | null;
}

export interface GameInfo {
  status: 'scheduled' | 'live' | 'final';
  /** games.rules snapshot; only the period count matters here. */
  rules: { periods: number };
  teams: Record<Side, { name: string; abbr: string }>;
}

export type NotificationKind = 'start' | 'final' | 'close';

export interface Message {
  title: string;
  body: string;
}

/** Close means: last regulation period or later, under 2:00 on the clock, and within 5 points. */
export const CLOSE_MARGIN = 5;
export const CLOSE_CLOCK_MS = 120_000;

/** Running score from the log: made shots and free throws, ignoring plays that were voided. */
export function scoreOf(events: EventRow[]): Record<Side, number> {
  const voided = new Set(events.filter((e) => e.type === 'void' && e.payload?.voidsGroupId).map((e) => e.payload!.voidsGroupId!));
  const score: Record<Side, number> = { home: 0, away: 0 };
  for (const e of events) {
    if ((e.type === 'shot' || e.type === 'ft') && e.payload?.made && !voided.has(e.group_id)) {
      score[e.side] += e.payload.points ?? 0;
    }
  }
  return score;
}

/** True when the latest scoring event leaves a live game close, late. */
export function isCloseGame(game: GameInfo, events: EventRow[], latest: EventRow): boolean {
  if (game.status !== 'live') return false;
  if (latest.period < game.rules.periods || latest.clock_ms >= CLOSE_CLOCK_MS) return false;
  const score = scoreOf(events);
  return Math.abs(score.home - score.away) <= CLOSE_MARGIN;
}

const clockText = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;

export function buildMessage(kind: NotificationKind, game: GameInfo, score: Record<Side, number>, latest?: EventRow): Message {
  const { home, away } = game.teams;
  switch (kind) {
    case 'start':
      return { title: 'Game started', body: `${home.name} vs ${away.name} is live` };
    case 'final':
      return { title: 'Final', body: `${home.abbr} ${score.home} - ${score.away} ${away.abbr}` };
    case 'close':
      return {
        title: 'Close game',
        body: `${home.abbr} ${score.home} - ${score.away} ${away.abbr}${latest ? `, ${clockText(latest.clock_ms)} left` : ''}`,
      };
  }
}

export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

/** Which notification a webhook call may trigger, and for which game. Null means: nothing to do. */
export function triggerOf(payload: WebhookPayload): { kind: NotificationKind; gameId: string } | null {
  const row = payload.record;
  if (!row) return null;
  if (payload.table === 'games' && payload.type === 'UPDATE') {
    const was = payload.old_record?.status;
    if (row.status === was) return null;
    if (row.status === 'live') return { kind: 'start', gameId: String(row.id) };
    if (row.status === 'final') return { kind: 'final', gameId: String(row.id) };
    return null;
  }
  if (payload.table === 'game_events' && payload.type === 'INSERT') {
    const made = (row.payload as { made?: boolean } | null)?.made;
    if ((row.type === 'shot' || row.type === 'ft') && made) return { kind: 'close', gameId: String(row.game_id) };
  }
  return null;
}

/** Splits into batches (the Expo push API accepts at most 100 messages per request). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
