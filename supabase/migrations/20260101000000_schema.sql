-- Basket Log schema (docs/design/IMPLEMENTATION_PLAN.md section 3).
-- game_events is append-only: corrections are `void` events, never UPDATE/DELETE.

create type public.position as enum ('G', 'F', 'C');
create type public.game_status as enum ('scheduled', 'live', 'final');
create type public.tracking_mode as enum ('full', 'team_only');
create type public.side as enum ('home', 'away');
create type public.member_role as enum ('admin', 'scorekeeper', 'coach', 'viewer');
-- must match EventType in packages/core/src/types.ts (fb = the fast-break answer for a shot's group)
create type public.event_type as enum (
  'shot', 'fb', 'ft', 'ast', 'reb', 'blk', 'stl', 'tov',
  'foul', 'sub', 'timeout', 'period', 'void'
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text not null,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues (id) on delete set null,
  name text not null,
  abbr text not null check (char_length(abbr) between 2 and 4),
  city text,
  color_primary text not null default '#1F4E8C' check (color_primary ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index teams_league_id_idx on public.teams (league_id);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  -- short name shown in trackers; NOT unique
  display_name text not null,
  number smallint not null check (number between 0 and 99),
  position public.position,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- jersey number is unique per team among active players (removed players free their number)
create unique index players_team_number_key on public.players (team_id, number) where active;

create table public.rule_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rules jsonb not null
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues (id) on delete set null,
  home_team_id uuid not null references public.teams (id),
  away_team_id uuid not null references public.teams (id),
  competition text,
  venue text,
  starts_at timestamptz,
  status public.game_status not null default 'scheduled',
  -- snapshot of GameRules (packages/core/src/rules.ts) taken when the game is created/started
  rules jsonb not null,
  home_tracking public.tracking_mode not null default 'full',
  away_tracking public.tracking_mode not null default 'full',
  is_public boolean not null default true,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  constraint games_distinct_teams check (home_team_id <> away_team_id)
);
create index games_league_id_idx on public.games (league_id);
create index games_starts_at_idx on public.games (starts_at desc);

-- snapshot so later roster edits never rewrite history
create table public.game_rosters (
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references public.players (id),
  side public.side not null,
  number smallint not null,
  display_name text not null,
  starter boolean not null default false,
  primary key (game_id, player_id),
  constraint game_rosters_game_side_number_key unique (game_id, side, number)
);

-- who may record a game
create table public.game_scorekeepers (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (game_id, user_id)
);
create index game_scorekeepers_user_id_idx on public.game_scorekeepers (user_id);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  -- a membership targets a league or a team, not both
  constraint memberships_one_scope check ((league_id is null) <> (team_id is null))
);
create unique index memberships_user_league_key on public.memberships (user_id, league_id) where league_id is not null;
create unique index memberships_user_team_key on public.memberships (user_id, team_id) where team_id is not null;

create table public.game_events (
  -- client-generated UUID so offline retries are idempotent
  id uuid primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  group_id uuid not null,
  server_seq bigint generated always as identity,
  device_seq integer not null,
  period smallint not null check (period >= 1),
  clock_ms integer not null check (clock_ms >= 0),
  side public.side not null,
  player_id uuid references public.players (id),
  type public.event_type not null,
  -- made, points, x, y, distanceFt, fastBreak, offensive, inPlayerId, outPlayerId, voidsGroupId
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index game_events_game_seq_idx on public.game_events (game_id, server_seq);
create index game_events_group_idx on public.game_events (game_id, group_id);
create index game_events_player_idx on public.game_events (player_id) where player_id is not null;

-- Defence in depth on top of RLS: also stops the service role.
create function public.forbid_event_mutation() returns trigger
language plpgsql as $$
begin
  -- depth > 1 means the delete came from a cascade (deleting the whole game)
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'game_events is append-only; record a void event instead';
end;
$$;

create trigger game_events_append_only
before update or delete on public.game_events
for each row execute function public.forbid_event_mutation();

-- Realtime: viewers subscribe to game_events where game_id = ...
alter publication supabase_realtime add table public.game_events;
alter publication supabase_realtime add table public.games;
