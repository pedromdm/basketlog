-- Scorekeeper assignment by email, plus push token and team-follow tables.

-- auth.users is not readable by clients, so assignment goes through security definer functions
-- that first check the caller may manage the game.
create function public.assign_scorekeeper(p_game_id uuid, p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if not public.can_manage_game(p_game_id) then
    raise exception 'not allowed to manage this game' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'no user with email %', p_email using errcode = 'P0002';
  end if;
  insert into public.game_scorekeepers (game_id, user_id) values (p_game_id, v_user) on conflict do nothing;
  return v_user;
end;
$$;

create function public.list_game_scorekeepers(p_game_id uuid) returns table (user_id uuid, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_manage_game(p_game_id) then
    raise exception 'not allowed to manage this game' using errcode = '42501';
  end if;
  return query
    select s.user_id, u.email::text
    from public.game_scorekeepers s join auth.users u on u.id = s.user_id
    where s.game_id = p_game_id
    order by u.email;
end;
$$;

revoke execute on function public.assign_scorekeeper(uuid, text) from public, anon;
revoke execute on function public.list_game_scorekeepers(uuid) from public, anon;
grant execute on function public.assign_scorekeeper(uuid, text) to authenticated;
grant execute on function public.list_game_scorekeepers(uuid) to authenticated;

-- Expo push tokens, one row per device.
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);
create index push_tokens_user_id_idx on public.push_tokens (user_id);

-- Teams a user wants notifications for (game start, final score, close games).
create table public.team_follows (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);
create index team_follows_team_id_idx on public.team_follows (team_id);

alter table public.push_tokens enable row level security;
alter table public.team_follows enable row level security;

create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy team_follows_own on public.team_follows for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
