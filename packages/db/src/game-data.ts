import { derive, type Derived, type DeriveSetup, type GameEvent, type GameRules, type Side, type TrackingMode } from "@basket-log/core";
import { fromRow } from "./events";
import type { BasketClient } from "./index";

export interface ViewTeam {
  id: string;
  name: string;
  abbr: string;
  city: string | null;
  color: string;
}

export interface ViewPlayer {
  id: string;
  side: Side;
  number: number;
  displayName: string;
  starter: boolean;
}

export interface GameView {
  id: string;
  status: "scheduled" | "live" | "final";
  competition: string | null;
  venue: string | null;
  startsAt: string | null;
  rules: GameRules;
  tracking: Record<Side, TrackingMode>;
  teams: Record<Side, ViewTeam>;
  /** The game_rosters snapshot, in jersey order. */
  players: ViewPlayer[];
  events: GameEvent[];
  setup: DeriveSetup;
  derived: Derived;
}

const toTeam = (t: { id: string; name: string; abbr: string; city: string | null; color_primary: string }): ViewTeam => ({
  id: t.id, name: t.name, abbr: t.abbr, city: t.city, color: t.color_primary,
});

/** Everything the public pages need for one game: snapshot roster, events, and derive() output. Null if the game isn't visible. */
export async function loadGameView(client: BasketClient, gameId: string): Promise<GameView | null> {
  const { data: game } = await client.from("games").select("*").eq("id", gameId).maybeSingle();
  if (!game) return null;

  const [teams, roster, events] = await Promise.all([
    client.from("teams").select("id, name, abbr, city, color_primary").in("id", [game.home_team_id, game.away_team_id]),
    client.from("game_rosters").select("*").eq("game_id", gameId).order("number"),
    client.from("game_events").select("*").eq("game_id", gameId).order("server_seq"),
  ]);
  const byId = new Map((teams.data ?? []).map((t) => [t.id, toTeam(t)]));
  const home = byId.get(game.home_team_id);
  const away = byId.get(game.away_team_id);
  if (!home || !away) return null;

  const players: ViewPlayer[] = (roster.data ?? []).map((r) => ({
    id: r.player_id, side: r.side, number: r.number, displayName: r.display_name, starter: r.starter,
  }));
  const gameEvents = (events.data ?? []).map(fromRow);
  const ids = (side: Side, starter: boolean) => players.filter((p) => p.side === side && p.starter === starter).map((p) => p.id);
  const setup: DeriveSetup = {
    teams: { home: { shortName: home.abbr }, away: { shortName: away.abbr } },
    players: Object.fromEntries(players.map((p) => [p.id, { displayName: p.displayName }])),
    roster: { home: { starters: ids("home", true), bench: ids("home", false) }, away: { starters: ids("away", true), bench: ids("away", false) } },
  };

  return {
    id: game.id,
    status: game.status,
    competition: game.competition,
    venue: game.venue,
    startsAt: game.starts_at,
    rules: game.rules as unknown as GameRules,
    tracking: { home: game.home_tracking, away: game.away_tracking },
    teams: { home, away },
    players,
    events: gameEvents,
    setup,
    derived: derive(gameEvents, setup),
  };
}
