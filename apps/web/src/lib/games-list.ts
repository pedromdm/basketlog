import { activeEvents, periodLabel, type GameRules, type Side } from "@basket-log/core";
import { fromRow, type BasketClient } from "@basket-log/db";
import { formatClock } from "./format";

export interface CardTeam {
  name: string;
  abbr: string;
  city: string | null;
  color: string;
}

export interface PeriodScore {
  label: string;
  home: number;
  away: number;
}

export interface CardLeader {
  number: number | null;
  name: string;
  points: number;
}

export interface GameCard {
  id: string;
  status: "scheduled" | "live" | "final";
  startsAt: string | null;
  venue: string | null;
  competition: string | null;
  teams: Record<Side, CardTeam>;
  score: Record<Side, number>;
  /** Latest clock position, e.g. "Q4 2:47"; null before the first event. */
  liveLabel: string | null;
  overtime: boolean;
  /** Points per period played, in order; empty before the first score. */
  periods: PeriodScore[];
  /** Top scorer of each side; null when the side has no scoring by a named player (e.g. team-only). */
  leaders: Record<Side, CardLeader | null>;
}

const TEAM_COLUMNS = "name, abbr, city, color_primary";

/** Games with both teams and a current score, newest first. Scores come from the active (non-voided) shot and free-throw events. */
export async function loadGameCards(client: BasketClient): Promise<GameCard[]> {
  const { data: games } = await client
    .from("games")
    .select(`id, status, starts_at, venue, competition, rules, home:teams!games_home_team_id_fkey(${TEAM_COLUMNS}), away:teams!games_away_team_id_fkey(${TEAM_COLUMNS})`)
    .order("starts_at", { ascending: false })
    .limit(60);
  if (!games?.length) return [];

  const started = games.filter((g) => g.status !== "scheduled").map((g) => g.id);
  const [events, roster] = started.length
    ? await Promise.all([
        client.from("game_events").select("*").in("game_id", started).order("server_seq"),
        client.from("game_rosters").select("game_id, player_id, display_name, number").in("game_id", started),
      ])
    : [null, null];
  const byGame = Map.groupBy((events?.data ?? []).map(fromRow), (e) => e.gameId);
  const names = new Map((roster?.data ?? []).map((r) => [`${r.game_id}:${r.player_id}`, { name: r.display_name, number: r.number }]));

  return games.flatMap((g) => {
    if (!g.home || !g.away) return [];
    const rules = g.rules as unknown as GameRules;
    const gameEvents = activeEvents(byGame.get(g.id) ?? []);
    const score: Record<Side, number> = { home: 0, away: 0 };
    const byPeriod = new Map<number, Record<Side, number>>();
    const byPlayer: Record<Side, Map<string, number>> = { home: new Map(), away: new Map() };
    for (const e of gameEvents) {
      if ((e.type !== "shot" && e.type !== "ft") || !e.made) continue;
      const points = e.points ?? 0;
      score[e.side] += points;
      const period = byPeriod.get(e.period) ?? { home: 0, away: 0 };
      period[e.side] += points;
      byPeriod.set(e.period, period);
      if (e.playerId) byPlayer[e.side].set(e.playerId, (byPlayer[e.side].get(e.playerId) ?? 0) + points);
    }
    const leader = (side: Side): CardLeader | null => {
      const top = [...byPlayer[side]].sort((a, b) => b[1] - a[1])[0];
      const who = top ? names.get(`${g.id}:${top[0]}`) : undefined;
      return top ? { number: who?.number ?? null, name: who?.name ?? "Player", points: top[1] } : null;
    };
    // every period up to the latest event, so a scoreless one still shows 0–0
    const lastPeriod = gameEvents.reduce((max, e) => Math.max(max, e.period), 0);
    const periods = Array.from({ length: lastPeriod }, (_, i) => {
      const p = byPeriod.get(i + 1) ?? { home: 0, away: 0 };
      return { label: periodLabel(rules, i + 1), home: p.home, away: p.away };
    });
    const last = gameEvents.at(-1);
    const toTeam = (t: { name: string; abbr: string; city: string | null; color_primary: string }): CardTeam => ({
      name: t.name, abbr: t.abbr, city: t.city, color: t.color_primary,
    });
    return [{
      id: g.id,
      status: g.status,
      startsAt: g.starts_at,
      venue: g.venue,
      competition: g.competition,
      teams: { home: toTeam(g.home), away: toTeam(g.away) },
      score,
      liveLabel: last ? `${periodLabel(rules, last.period)} ${formatClock(last.clockMs)}` : null,
      overtime: !!last && last.period > rules.periods,
      periods,
      leaders: { home: leader("home"), away: leader("away") },
    }];
  });
}
