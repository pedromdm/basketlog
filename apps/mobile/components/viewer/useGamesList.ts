import { activeEvents, type GameEvent, type Side } from '@basket-log/core';
import { fromRow } from '@basket-log/db';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

export interface ListTeam {
  id: string;
  name: string;
  abbr: string;
  city: string | null;
  color: string;
}

export interface ListGame {
  id: string;
  status: 'scheduled' | 'live' | 'final';
  competition: string | null;
  startsAt: string | null;
  teams: Record<Side, ListTeam>;
  score: Record<Side, number>;
}

type TeamRow = { id: string; name: string; abbr: string; city: string | null; color_primary: string };

const THROTTLE_MS = 500;
const TEAM_COLUMNS = 'id, name, abbr, city, color_primary';

const toTeam = (t: TeamRow): ListTeam => ({ id: t.id, name: t.name, abbr: t.abbr, city: t.city, color: t.color_primary });

/** Games with scores summed from their active shot / free-throw events (voids resolved by activeEvents). */
async function fetchGames(): Promise<ListGame[]> {
  const { data: games, error } = await supabase
    .from('games')
    .select(`id, status, competition, starts_at, home:teams!games_home_team_id_fkey(${TEAM_COLUMNS}), away:teams!games_away_team_id_fkey(${TEAM_COLUMNS})`)
    .order('starts_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const started = (games ?? []).filter((g) => g.status !== 'scheduled').map((g) => g.id);
  const scores = new Map<string, Record<Side, number>>();
  if (started.length) {
    const { data: rows, error: eventsError } = await supabase
      .from('game_events')
      .select('*')
      .in('game_id', started)
      .in('type', ['shot', 'ft', 'void'])
      .order('server_seq');
    if (eventsError) throw new Error(eventsError.message);
    const byGame = new Map<string, GameEvent[]>();
    for (const row of rows ?? []) {
      const list = byGame.get(row.game_id) ?? [];
      list.push(fromRow(row));
      byGame.set(row.game_id, list);
    }
    for (const [id, events] of byGame) {
      const score: Record<Side, number> = { home: 0, away: 0 };
      for (const e of activeEvents(events)) if (e.made) score[e.side] += e.points ?? 0;
      scores.set(id, score);
    }
  }

  return (games ?? []).flatMap((g) => {
    const home = g.home as unknown as TeamRow | null;
    const away = g.away as unknown as TeamRow | null;
    if (!home || !away) return [];
    return [
      {
        id: g.id,
        status: g.status,
        competition: g.competition,
        startsAt: g.starts_at,
        teams: { home: toTeam(home), away: toTeam(away) },
        score: scores.get(g.id) ?? { home: 0, away: 0 },
      },
    ];
  });
}

export function useGamesList() {
  const [games, setGames] = useState<ListGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const next = await fetchGames();
      if (!alive.current) return;
      setGames(next);
      setError(null);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not load games');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const anyLive = games.some((g) => g.status === 'live');
  useEffect(() => {
    if (!anyLive) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refetch = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void load();
      }, THROTTLE_MS);
    };
    const channel = supabase
      .channel('viewer:games')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_events' }, refetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games' }, refetch)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [anyLive, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (alive.current) setRefreshing(false);
  }, [load]);

  return { games, loading, refreshing, error, refresh };
}
