import type { GameEvent } from '@basket-log/core';
import type { Json, Tables, TablesInsert } from './index';

export type EventRow = TablesInsert<'game_events'>;

/** Event fields that live in the game_events.payload jsonb column. */
const PAYLOAD_KEYS = ['made', 'points', 'x', 'y', 'distanceFt', 'fastBreak', 'offensive', 'inPlayerId', 'outPlayerId', 'voidsGroupId'] as const;

export function toRow(e: GameEvent): EventRow {
  const payload: Record<string, Json> = {};
  for (const key of PAYLOAD_KEYS) {
    const value = e[key];
    if (value !== undefined) payload[key] = value;
  }
  return {
    id: e.id,
    game_id: e.gameId,
    group_id: e.groupId,
    device_seq: e.seq,
    period: e.period,
    clock_ms: e.clockMs,
    side: e.side,
    player_id: e.playerId,
    type: e.type,
    payload,
    created_by: e.createdBy,
    created_at: e.createdAt,
  };
}

export function fromRow(row: Tables<'game_events'> | EventRow): GameEvent {
  const payload = (row.payload ?? {}) as Partial<Pick<GameEvent, (typeof PAYLOAD_KEYS)[number]>>;
  const event: GameEvent = {
    id: row.id,
    gameId: row.game_id,
    groupId: row.group_id,
    seq: row.device_seq,
    period: row.period,
    clockMs: row.clock_ms,
    side: row.side,
    playerId: row.player_id ?? null,
    type: row.type,
    createdBy: row.created_by,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
  for (const key of PAYLOAD_KEYS) {
    if (payload[key] !== undefined) Object.assign(event, { [key]: payload[key] });
  }
  return event;
}
