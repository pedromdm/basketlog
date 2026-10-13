import type { GameEvent, GameRules, Side } from '@basket-log/core';
import { fromRow } from './mapping';
import type { EventQueue } from './queue';
import type { TrackerGame, TrackerPlayer, TrackerTeam } from './types';
import { supabase } from '../supabase';

const PAGE = 1000;

interface TeamRow {
  id: string;
  name: string;
  abbr: string;
  color_primary: string;
}

export async function loadGame(gameId: string): Promise<TrackerGame> {
  const { data, error } = await supabase
    .from('games')
    .select(
      '*, home:teams!games_home_team_id_fkey(id,name,abbr,color_primary), away:teams!games_away_team_id_fkey(id,name,abbr,color_primary), game_rosters(*)',
    )
    .eq('id', gameId)
    .single();
  if (error) throw new Error(error.message);
  const row = data as unknown as {
    id: string;
    status: TrackerGame['status'];
    rules: GameRules;
    home_tracking: TrackerGame['tracking']['home'];
    away_tracking: TrackerGame['tracking']['away'];
    home: TeamRow;
    away: TeamRow;
    game_rosters: { player_id: string; side: Side; number: number; display_name: string; starter: boolean }[];
  };
  const team = (t: TeamRow): TrackerTeam => ({ id: t.id, name: t.name, abbr: t.abbr, color: t.color_primary });
  const players: Record<string, TrackerPlayer> = {};
  for (const r of [...row.game_rosters].sort((a, b) => a.number - b.number)) {
    players[r.player_id] = { id: r.player_id, side: r.side, number: r.number, displayName: r.display_name, starter: r.starter };
  }
  return {
    id: row.id,
    status: row.status,
    rules: row.rules,
    tracking: { home: row.home_tracking, away: row.away_tracking },
    teams: { home: team(row.home), away: team(row.away) },
    players,
  };
}

/** Server events (by server_seq) followed by local events the server may not have yet, deduped by id. */
export async function loadEvents(gameId: string, queue: EventQueue): Promise<GameEvent[]> {
  const server: GameEvent[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('game_events')
      .select('*')
      .eq('game_id', gameId)
      .order('server_seq')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    server.push(...data.map(fromRow));
    if (data.length < PAGE) break;
  }
  const seen = new Set(server.map((e) => e.id));
  const local = (await queue.listPending(gameId)).map((i) => fromRow(i.row)).filter((e) => !seen.has(e.id));
  return [...server, ...local];
}
