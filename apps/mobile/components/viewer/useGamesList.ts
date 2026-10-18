import { activeEvents, periodLabel, type GameEvent, type GameRules, type Side } from '@basket-log/core';
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

export interface ListPeriod {
  label: string;
  home: number;
  away: number;
}

export interface ListLeader {
  number: number | null;
  name: string;
  points: number;
}

export interface ListGame {
  id: string;
  status: 'scheduled' | 'live' | 'final';
  competition: string | null;
  startsAt: string | null;
  venue: string | null;
  teams: Record<Side, ListTeam>;
  score: Record<Side, number>;
  /** Latest period and clock, e.g. "Q4 2:47"; null before the first event. */
  liveLabel: string | null;
  overtime: boolean;
  /** Points per period played, in order. */
  periods: ListPeriod[];
  /** Top scorer of each side; null when no named player scored. */
  leaders: Record<Side, ListLeader | null>;
}

interface Extras {
  score: Record<Side, number>;
  liveLabel: string | null;
  overtime: boolean;
  periods: ListPeriod[];
  leaders: Record<Side, ListLeader | null>;
}

const EMPTY: Extras = { score: { home: 0, away: 0 }, liveLabel: null, overtime: false, periods: [], leaders: { home: null, away: null } };

const clock = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

type TeamRow = { id: string; name: string; abbr: string; city: string | null; color_primary: string };

const THROTTLE_MS = 500;
const TEAM_COLUMNS = 'id, name, abbr, city, color_primary';

const toTeam = (t: TeamRow): ListTeam => ({ id: t.id, name: t.name, abbr: t.abbr, city: t.city, color: t.color_primary });

/** Games with scores summed from their active shot / free-throw events (voids resolved by activeEvents). */
async function fetchGames(): Promise<ListGame[]> {
  const { data: games, error } = await supabase
    .from('games')
    .select(`id, status, competition, starts_at, venue, rules, home:teams!games_home_team_id_fkey(${TEAM_COLUMNS}), away:teams!games_away_team_id_fkey(${TEAM_COLUMNS})`)
    .order('starts_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const started = (games ?? []).filter((g) => g.status !== 'scheduled').map((g) => g.id);
  const rulesOf = new Map((games ?? []).map((g) => [g.id, g.rules as unknown as GameRules]));
  const extras = new Map<string, Extras>();
  if (started.length) {
    const [events, roster] = await Promise.all([
      supabase.from('game_events').select('*').in('game_id', started).order('server_seq'),
      supabase.from('game_rosters').select('game_id, player_id, display_name, number').in('game_id', started),
    ]);
    if (events.error) throw new Error(events.error.message);
    const names = new Map((roster.data ?? []).map((r) => [`${r.game_id}:${r.player_id}`, { name: r.display_name, number: r.number }]));
    const byGame = new Map<string, GameEvent[]>();
    for (const row of events.data ?? []) {
      const list = byGame.get(row.game_id) ?? [];
      list.push(fromRow(row));
      byGame.set(row.game_id, list);
    }
    for (const [id, all] of byGame) {
      const rules = rulesOf.get(id);
      const live = activeEvents(all);
      const score: Record<Side, number> = { home: 0, away: 0 };
      const byPeriod = new Map<number, Record<Side, number>>();
      const byPlayer: Record<Side, Map<string, number>> = { home: new Map(), away: new Map() };
      for (const e of live) {
        if ((e.type !== 'shot' && e.type !== 'ft') || !e.made) continue;
        const points = e.points ?? 0;
        score[e.side] += points;
        const p = byPeriod.get(e.period) ?? { home: 0, away: 0 };
        p[e.side] += points;
        byPeriod.set(e.period, p);
        if (e.playerId) byPlayer[e.side].set(e.playerId, (byPlayer[e.side].get(e.playerId) ?? 0) + points);
      }
      const leader = (side: Side): ListLeader | null => {
        const top = [...byPlayer[side]].sort((x, y) => y[1] - x[1])[0];
        const who = top ? names.get(`${id}:${top[0]}`) : undefined;
        return top ? { number: who?.number ?? null, name: who?.name ?? 'Player', points: top[1] } : null;
      };
      const lastPeriod = live.reduce((max, e) => Math.max(max, e.period), 0);
      const last = live.at(-1);
      extras.set(id, {
        score,
        liveLabel: last && rules ? `${periodLabel(rules, last.period)} ${clock(last.clockMs)}` : null,
        overtime: !!last && !!rules && last.period > rules.periods,
        periods: rules ? Array.from({ length: lastPeriod }, (_, i) => ({ label: periodLabel(rules, i + 1), home: byPeriod.get(i + 1)?.home ?? 0, away: byPeriod.get(i + 1)?.away ?? 0 })) : [],
        leaders: { home: leader('home'), away: leader('away') },
      });
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
        venue: g.venue,
        ...(extras.get(g.id) ?? EMPTY),
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
