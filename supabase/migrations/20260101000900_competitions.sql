-- Competitions: a competition has ordered phases; a phase has groups and rounds. A round is a moment where teams
-- change group (promotion / relegation, decided by hand): group_assignments says which group a team is in for a
-- round. A team can be enrolled in several competitions. Games point at a competition, round and group.

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) > 0),
  season text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.competition_teams (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  primary key (competition_id, team_id)
);
create index competition_teams_team_idx on public.competition_teams (team_id);

create table public.competition_phases (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  position smallint not null check (position >= 1),
  name text not null check (char_length(name) > 0),
  unique (competition_id, position) deferrable initially deferred
);

create table public.competition_groups (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.competition_phases (id) on delete cascade,
  position smallint not null check (position >= 1),
  name text not null check (char_length(name) > 0),
  unique (phase_id, position) deferrable initially deferred
);

create table public.competition_rounds (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.competition_phases (id) on delete cascade,
  position smallint not null check (position >= 1),
  name text not null check (char_length(name) > 0),
  unique (phase_id, position) deferrable initially deferred
);

create table public.group_assignments (
  round_id uuid not null references public.competition_rounds (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  group_id uuid not null references public.competition_groups (id) on delete cascade,
  primary key (round_id, team_id)
);
create index group_assignments_group_idx on public.group_assignments (group_id);

-- the group of an assignment must belong to the same phase as its round
create function public.check_assignment_phase() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select phase_id from public.competition_rounds where id = new.round_id)
     is distinct from (select phase_id from public.competition_groups where id = new.group_id) then
    raise exception 'group and round belong to different phases';
  end if;
  return new;
end;
$$;
create trigger group_assignments_same_phase before insert or update on public.group_assignments
for each row execute function public.check_assignment_phase();

alter table public.games
  add column competition_id uuid references public.competitions (id) on delete set null,
  add column round_id uuid references public.competition_rounds (id) on delete set null,
  add column group_id uuid references public.competition_groups (id) on delete set null;
create index games_competition_idx on public.games (competition_id);

-- ---------------------------------------------------------------- RLS
create function public.can_manage_competition(p_competition_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.competitions c where c.id = p_competition_id and c.created_by = auth.uid()
  );
$$;

create function public.competition_of_phase(p_phase_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select competition_id from public.competition_phases where id = p_phase_id;
$$;

create function public.competition_of_round(p_round_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.competition_id from public.competition_rounds r
  join public.competition_phases p on p.id = r.phase_id where r.id = p_round_id;
$$;

alter table public.competitions enable row level security;
alter table public.competition_teams enable row level security;
alter table public.competition_phases enable row level security;
alter table public.competition_groups enable row level security;
alter table public.competition_rounds enable row level security;
alter table public.group_assignments enable row level security;

create policy competitions_read on public.competitions for select using (true);
create policy competitions_insert on public.competitions for insert to authenticated
  with check (created_by = auth.uid());
create policy competitions_update on public.competitions for update to authenticated
  using (public.can_manage_competition(id)) with check (public.can_manage_competition(id));
create policy competitions_delete on public.competitions for delete to authenticated
  using (public.can_manage_competition(id));

create policy competition_teams_read on public.competition_teams for select using (true);
create policy competition_teams_write on public.competition_teams for all to authenticated
  using (public.can_manage_competition(competition_id)) with check (public.can_manage_competition(competition_id));

create policy competition_phases_read on public.competition_phases for select using (true);
create policy competition_phases_write on public.competition_phases for all to authenticated
  using (public.can_manage_competition(competition_id)) with check (public.can_manage_competition(competition_id));

create policy competition_groups_read on public.competition_groups for select using (true);
create policy competition_groups_write on public.competition_groups for all to authenticated
  using (public.can_manage_competition(public.competition_of_phase(phase_id)))
  with check (public.can_manage_competition(public.competition_of_phase(phase_id)));

create policy competition_rounds_read on public.competition_rounds for select using (true);
create policy competition_rounds_write on public.competition_rounds for all to authenticated
  using (public.can_manage_competition(public.competition_of_phase(phase_id)))
  with check (public.can_manage_competition(public.competition_of_phase(phase_id)));

create policy group_assignments_read on public.group_assignments for select using (true);
create policy group_assignments_write on public.group_assignments for all to authenticated
  using (public.can_manage_competition(public.competition_of_round(round_id)))
  with check (public.can_manage_competition(public.competition_of_round(round_id)));

-- ---------------------------------------------------------------- create_game with competition
drop function public.create_game(uuid, uuid, jsonb, uuid[], uuid[], public.tracking_mode, public.tracking_mode, text, text, timestamptz, public.game_status);

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
  p_status public.game_status default 'live',
  p_competition_id uuid default null,
  p_round_id uuid default null,
  p_group_id uuid default null
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_game_id uuid;
begin
  insert into public.games (
    league_id, home_team_id, away_team_id, competition, venue, starts_at, status,
    rules, home_tracking, away_tracking, created_by, competition_id, round_id, group_id
  )
  select t.league_id, p_home_team_id, p_away_team_id,
    coalesce(p_competition, (select c.name from public.competitions c where c.id = p_competition_id)),
    p_venue, coalesce(p_starts_at, now()), p_status, p_rules, p_home_tracking, p_away_tracking, auth.uid(),
    p_competition_id, p_round_id, p_group_id
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

grant execute on function public.create_game(uuid, uuid, jsonb, uuid[], uuid[], public.tracking_mode, public.tracking_mode, text, text, timestamptz, public.game_status, uuid, uuid, uuid) to authenticated;
