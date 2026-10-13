-- Row level security.
-- Reads: public for public games. Writes: scoped by memberships / game_scorekeepers.
-- game_events: insert-only for the game's scorekeepers; no UPDATE/DELETE policy exists.

-- ---------------------------------------------------------------- helpers
-- security definer so policies can consult memberships without recursing into their own RLS.

create function public.is_league_admin(p_league_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_league_id is not null and exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.league_id = p_league_id and m.role = 'admin'
  );
$$;

create function public.is_team_admin(p_team_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id
      and (
        exists (
          select 1 from public.memberships m
          where m.user_id = auth.uid() and m.team_id = t.id and m.role = 'admin'
        )
        or public.is_league_admin(t.league_id)
      )
  );
$$;

create function public.is_game_scorekeeper(p_game_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.game_scorekeepers s
    where s.game_id = p_game_id and s.user_id = auth.uid()
  );
$$;

create function public.can_manage_game(p_game_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game_id
      and (g.created_by = auth.uid() or public.is_league_admin(g.league_id))
  );
$$;

create function public.can_view_game(p_game_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game_id
      and (
        g.is_public
        or g.created_by = auth.uid()
        or public.is_league_admin(g.league_id)
        or public.is_game_scorekeeper(g.id)
      )
  );
$$;

create function public.is_game_open(p_game_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.games g where g.id = p_game_id and g.status <> 'final');
$$;

-- ---------------------------------------------------------------- creator bootstrap
-- The creator of a league/team becomes its admin; the creator of a game becomes its scorekeeper.

create function public.grant_creator_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is null then
    return new;
  end if;
  if tg_table_name = 'leagues' then
    insert into public.memberships (user_id, league_id, role) values (new.created_by, new.id, 'admin');
  elsif tg_table_name = 'teams' then
    insert into public.memberships (user_id, team_id, role) values (new.created_by, new.id, 'admin');
  elsif tg_table_name = 'games' then
    insert into public.game_scorekeepers (game_id, user_id) values (new.id, new.created_by);
  end if;
  return new;
end;
$$;

create trigger leagues_creator_membership after insert on public.leagues
for each row execute function public.grant_creator_membership();
create trigger teams_creator_membership after insert on public.teams
for each row execute function public.grant_creator_membership();
create trigger games_creator_scorekeeper after insert on public.games
for each row execute function public.grant_creator_membership();

-- ---------------------------------------------------------------- enable RLS
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.rule_presets enable row level security;
alter table public.games enable row level security;
alter table public.game_rosters enable row level security;
alter table public.game_scorekeepers enable row level security;
alter table public.memberships enable row level security;
alter table public.game_events enable row level security;

-- ---------------------------------------------------------------- leagues
create policy leagues_read on public.leagues for select using (true);
create policy leagues_insert on public.leagues for insert to authenticated
  with check (created_by = auth.uid());
create policy leagues_update on public.leagues for update to authenticated
  using (public.is_league_admin(id)) with check (public.is_league_admin(id));
create policy leagues_delete on public.leagues for delete to authenticated
  using (public.is_league_admin(id));

-- ---------------------------------------------------------------- teams
create policy teams_read on public.teams for select using (true);
create policy teams_insert on public.teams for insert to authenticated
  with check (created_by = auth.uid() and (league_id is null or public.is_league_admin(league_id)));
create policy teams_update on public.teams for update to authenticated
  using (public.is_team_admin(id)) with check (public.is_team_admin(id));
create policy teams_delete on public.teams for delete to authenticated
  using (public.is_team_admin(id));

-- ---------------------------------------------------------------- players
create policy players_read on public.players for select using (true);
create policy players_insert on public.players for insert to authenticated
  with check (public.is_team_admin(team_id));
create policy players_update on public.players for update to authenticated
  using (public.is_team_admin(team_id)) with check (public.is_team_admin(team_id));
create policy players_delete on public.players for delete to authenticated
  using (public.is_team_admin(team_id));

-- ---------------------------------------------------------------- rule_presets (read-only; managed by migrations)
create policy rule_presets_read on public.rule_presets for select using (true);

-- ---------------------------------------------------------------- games
-- created_by is checked directly: INSERT ... RETURNING cannot see its own new row through a function.
create policy games_read on public.games for select
  using (created_by = auth.uid() or public.can_view_game(id));
create policy games_insert on public.games for insert to authenticated
  with check (created_by = auth.uid());
create policy games_update on public.games for update to authenticated
  using (public.can_manage_game(id) or public.is_game_scorekeeper(id))
  with check (public.can_manage_game(id) or public.is_game_scorekeeper(id));
create policy games_delete on public.games for delete to authenticated
  using (public.can_manage_game(id) and status = 'scheduled');

-- ---------------------------------------------------------------- game_rosters
create policy game_rosters_read on public.game_rosters for select
  using (public.can_view_game(game_id));
create policy game_rosters_insert on public.game_rosters for insert to authenticated
  with check ((public.can_manage_game(game_id) or public.is_game_scorekeeper(game_id)) and public.is_game_open(game_id));
create policy game_rosters_update on public.game_rosters for update to authenticated
  using ((public.can_manage_game(game_id) or public.is_game_scorekeeper(game_id)) and public.is_game_open(game_id))
  with check ((public.can_manage_game(game_id) or public.is_game_scorekeeper(game_id)) and public.is_game_open(game_id));
create policy game_rosters_delete on public.game_rosters for delete to authenticated
  using ((public.can_manage_game(game_id) or public.is_game_scorekeeper(game_id)) and public.is_game_open(game_id));

-- ---------------------------------------------------------------- game_scorekeepers
create policy game_scorekeepers_read on public.game_scorekeepers for select to authenticated
  using (user_id = auth.uid() or public.can_manage_game(game_id));
create policy game_scorekeepers_insert on public.game_scorekeepers for insert to authenticated
  with check (public.can_manage_game(game_id));
create policy game_scorekeepers_delete on public.game_scorekeepers for delete to authenticated
  using (public.can_manage_game(game_id));

-- ---------------------------------------------------------------- memberships
create policy memberships_read on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_league_admin(league_id) or public.is_team_admin(team_id));
create policy memberships_insert on public.memberships for insert to authenticated
  with check (
    (league_id is not null and public.is_league_admin(league_id))
    or (team_id is not null and public.is_team_admin(team_id))
  );
create policy memberships_update on public.memberships for update to authenticated
  using (public.is_league_admin(league_id) or public.is_team_admin(team_id))
  with check (public.is_league_admin(league_id) or public.is_team_admin(team_id));
create policy memberships_delete on public.memberships for delete to authenticated
  using (public.is_league_admin(league_id) or public.is_team_admin(team_id));

-- ---------------------------------------------------------------- game_events
-- Anyone reads events of public games; only the game's scorekeepers insert; nobody updates or deletes.
create policy game_events_read on public.game_events for select
  using (public.can_view_game(game_id));
create policy game_events_insert on public.game_events for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_game_scorekeeper(game_id)
    and public.is_game_open(game_id)
  );

-- ---------------------------------------------------------------- grants
-- Supabase grants table privileges to anon/authenticated by default; tighten the append-only table.
revoke update, delete, truncate on public.game_events from anon, authenticated;
