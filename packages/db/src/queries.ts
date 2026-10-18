import type { GameRules } from '@basket-log/core';
import type { BasketClient, Enums, Json, Tables, TablesInsert } from './index';

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export type Team = Tables<'teams'>;
export type Player = Tables<'players'>;
export type TeamWithPlayers = Team & { players: Player[] };

/** Teams with their active roster, ordered by name. */
export async function listTeams(client: BasketClient): Promise<TeamWithPlayers[]> {
  return check(
    await client
      .from('teams')
      .select('*, players(*)')
      .eq('players.active', true)
      .order('name')
      .order('number', { referencedTable: 'players' }),
  ) as TeamWithPlayers[];
}

export async function createTeam(
  client: BasketClient,
  team: Pick<TablesInsert<'teams'>, 'name' | 'abbr' | 'city' | 'color_primary' | 'league_id'>,
): Promise<Team> {
  return check(await client.from('teams').insert(team).select().single());
}

export async function updateTeam(
  client: BasketClient,
  id: string,
  patch: Partial<Pick<Team, 'name' | 'abbr' | 'city' | 'color_primary'>>,
): Promise<void> {
  check(await client.from('teams').update(patch).eq('id', id).select('id').single());
}

export type PlayerInput = Pick<TablesInsert<'players'>, 'team_id' | 'first_name' | 'last_name' | 'display_name' | 'number' | 'position'>;

export async function addPlayer(client: BasketClient, player: PlayerInput): Promise<Player> {
  return check(await client.from('players').insert(player).select().single());
}

export async function updatePlayer(
  client: BasketClient,
  id: string,
  patch: Partial<Pick<Player, 'first_name' | 'last_name' | 'display_name' | 'number' | 'position'>>,
): Promise<void> {
  check(await client.from('players').update(patch).eq('id', id).select('id').single());
}

/** Removing a player only deactivates them, because past game rosters reference the row. */
export async function removePlayer(client: BasketClient, id: string): Promise<void> {
  check(await client.from('players').update({ active: false }).eq('id', id).select('id').single());
}

export async function listRulePresets(client: BasketClient): Promise<{ name: string; rules: GameRules }[]> {
  const rows = check(await client.from('rule_presets').select('name, rules').order('name'));
  return rows.map((r) => ({ name: r.name, rules: r.rules as unknown as GameRules }));
}

export interface NewGameInput {
  homeTeamId: string;
  awayTeamId: string;
  rules: GameRules;
  tracking: { home: Enums<'tracking_mode'>; away: Enums<'tracking_mode'> };
  starters: { home: string[]; away: string[] };
  competition?: string;
  venue?: string;
  startsAt?: string;
  /** `live` (default) starts the game now; `scheduled` only saves it. */
  status?: 'live' | 'scheduled';
}

/** Creates the game, snapshots rules and rosters, and marks it live (or scheduled), atomically (see create_game()). */
export async function createGame(client: BasketClient, input: NewGameInput): Promise<string> {
  return check(
    await client.rpc('create_game', {
      p_home_team_id: input.homeTeamId,
      p_away_team_id: input.awayTeamId,
      p_rules: input.rules as unknown as Json,
      p_home_starters: input.starters.home,
      p_away_starters: input.starters.away,
      p_home_tracking: input.tracking.home,
      p_away_tracking: input.tracking.away,
      p_competition: input.competition,
      p_venue: input.venue,
      p_starts_at: input.startsAt,
      p_status: input.status,
    }),
  );
}

export async function assignScorekeeper(client: BasketClient, gameId: string, email: string): Promise<string> {
  return check(await client.rpc('assign_scorekeeper', { p_game_id: gameId, p_email: email }));
}

export async function listScorekeepers(client: BasketClient, gameId: string): Promise<{ user_id: string; email: string }[]> {
  return check(await client.rpc('list_game_scorekeepers', { p_game_id: gameId }));
}

export async function removeScorekeeper(client: BasketClient, gameId: string, userId: string): Promise<void> {
  check(await client.from('game_scorekeepers').delete().eq('game_id', gameId).eq('user_id', userId).select());
}

/** Idempotent: the same device token is stored once. */
export async function registerPushToken(client: BasketClient, token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
  check(await client.from('push_tokens').upsert({ token, platform }, { onConflict: 'token' }).select());
}

export async function listFollowedTeamIds(client: BasketClient): Promise<string[]> {
  return check(await client.from('team_follows').select('team_id')).map((r) => r.team_id);
}

export async function followTeam(client: BasketClient, teamId: string): Promise<void> {
  check(await client.from('team_follows').upsert({ team_id: teamId }, { onConflict: 'user_id,team_id' }).select());
}

export async function unfollowTeam(client: BasketClient, teamId: string): Promise<void> {
  check(await client.from('team_follows').delete().eq('team_id', teamId).select());
}
