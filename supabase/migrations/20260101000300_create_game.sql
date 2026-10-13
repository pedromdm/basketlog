-- Wizard "Start game": one atomic call that creates the game, snapshots rules, and snapshots
-- the rosters (active players of both teams). Runs as the caller, so RLS still applies.
create function public.create_game(
  p_home_team_id uuid,
  p_away_team_id uuid,
  p_rules jsonb,
  p_home_starters uuid[] default '{}',
  p_away_starters uuid[] default '{}',
  p_home_tracking public.tracking_mode default 'full',
  p_away_tracking public.tracking_mode default 'full',
  p_competition text default null,
  p_venue text default null,
  p_starts_at timestamptz default null,
  p_status public.game_status default 'live'
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_game_id uuid;
begin
  insert into public.games (
    league_id, home_team_id, away_team_id, competition, venue, starts_at, status,
    rules, home_tracking, away_tracking, created_by
  )
  select t.league_id, p_home_team_id, p_away_team_id, p_competition, p_venue,
    coalesce(p_starts_at, now()), p_status, p_rules, p_home_tracking, p_away_tracking, auth.uid()
  from public.teams t where t.id = p_home_team_id
  returning id into v_game_id;

  if v_game_id is null then
    raise exception 'home team not found';
  end if;

  insert into public.game_rosters (game_id, player_id, side, number, display_name, starter)
  select v_game_id, p.id,
    case when p.team_id = p_home_team_id then 'home'::public.side else 'away'::public.side end,
    p.number, p.display_name,
    p.id = any (case when p.team_id = p_home_team_id then p_home_starters else p_away_starters end)
  from public.players p
  where p.active and p.team_id in (p_home_team_id, p_away_team_id);

  return v_game_id;
end;
$$;

grant execute on function public.create_game(uuid, uuid, jsonb, uuid[], uuid[], public.tracking_mode, public.tracking_mode, text, text, timestamptz, public.game_status) to authenticated;
