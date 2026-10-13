import { activeEvents, periodLabel, type GameRules, type Side } from "@basket-log/core";
import { fromRow, type BasketClient } from "@basket-log/db";
import { formatClock } from "./format";

export interface CardTeam {
  name: string;
  abbr: string;
  city: string | null;
  color: string;
}

export interface GameCard {
  id: string;
  status: "scheduled" | "live" | "final";
  startsAt: string | null;
  venue: string | null;
  teams: Record<Side, CardTeam>;
  score: Record<Side, number>;
  /** Latest clock position, e.g. "Q4 2:47"; null before the first event. */
  liveLabel: string | null;
  overtime: boolean;
}

const TEAM_COLUMNS = "name, abbr, city, color_primary";

/** Games with both teams and a current score, newest first. Scores come from the active (non-voided) shot and free-throw events. */
export async function loadGameCards(client: BasketClient): Promise<GameCard[]> {
  const { data: games } = await client
    .from("games")
    .select(`id, status, starts_at, venue, rules, home:teams!games_home_team_id_fkey(${TEAM_COLUMNS}), away:teams!games_away_team_id_fkey(${TEAM_COLUMNS})`)
    .order("starts_at", { ascending: false })
    .limit(60);
  if (!games?.length) return [];

  const started = games.filter((g) => g.status !== "scheduled").map((g) => g.id);
  const events = started.length
    ? ((await client.from("game_events").select("*").in("game_id", started).order("server_seq")).data ?? []).map(fromRow)
    : [];
  const byGame = Map.groupBy(events, (e) => e.gameId);

  return games.flatMap((g) => {
    if (!g.home || !g.away) return [];
    const rules = g.rules as unknown as GameRules;
    const gameEvents = activeEvents(byGame.get(g.id) ?? []);
    const score: Record<Side, number> = { home: 0, away: 0 };
    for (const e of gameEvents) if ((e.type === "shot" || e.type === "ft") && e.made) score[e.side] += e.points ?? 0;
    const last = gameEvents.at(-1);
    const toTeam = (t: { name: string; abbr: string; city: string | null; color_primary: string }): CardTeam => ({
      name: t.name, abbr: t.abbr, city: t.city, color: t.color_primary,
    });
    return [{
      id: g.id,
      status: g.status,
      startsAt: g.starts_at,
      venue: g.venue,
      teams: { home: toTeam(g.home), away: toTeam(g.away) },
      score,
      liveLabel: last ? `${periodLabel(rules, last.period)} ${formatClock(last.clockMs)}` : null,
      overtime: !!last && last.period > rules.periods,
    }];
  });
}
