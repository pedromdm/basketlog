-- Local dev seed: fictional SCP (home) vs SLB (away) matchup. Run by `supabase db reset`.
-- Demo scorekeeper login: scorekeeper@basketlog.test / password123 (local only).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated',
  'scorekeeper@basketlog.test', crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
);
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'email',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"scorekeeper@basketlog.test"}', now(), now(), now()
);

-- created_by fires the creator triggers: the demo user becomes league/team admin and game scorekeeper.
insert into public.leagues (id, name, season, created_by)
values ('00000000-0000-0000-0000-0000000000b1', 'Liga Demo', '2026/27', '00000000-0000-0000-0000-0000000000a1');

insert into public.teams (id, league_id, name, abbr, city, color_primary, created_by) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Sporting', 'SCP', 'Lisboa', '#0B7A3E', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'Benfica', 'SLB', 'Lisboa', '#C8102E', '00000000-0000-0000-0000-0000000000a1');

insert into public.players (id, team_id, first_name, last_name, display_name, number, position) values
  ('10000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-0000000000c1', 'Rui', 'Okafor', 'Okafor', 7, 'G'),
  ('10000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-0000000000c1', 'Tiago', 'Reyes', 'Reyes', 3, 'G'),
  ('10000000-0000-0000-0000-000000000030'::uuid, '00000000-0000-0000-0000-0000000000c1', 'Diogo', 'Pinto', 'Pinto', 11, 'F'),
  ('10000000-0000-0000-0000-000000000040'::uuid, '00000000-0000-0000-0000-0000000000c1', 'Nuno', 'Santos', 'Santos', 14, 'F'),
  ('10000000-0000-0000-0000-000000000050'::uuid, '00000000-0000-0000-0000-0000000000c1', 'Bruno', 'Costa', 'Costa', 21, 'C'),
  ('10000000-0000-0000-0000-000000000060'::uuid, '00000000-0000-0000-0000-0000000000c1', 'Hugo', 'Lima', 'Lima', 5, 'G'),
  ('10000000-0000-0000-0000-000000000070'::uuid, '00000000-0000-0000-0000-0000000000c1', 'Joao', 'Silva', 'Silva', 32, 'C'),
  ('10000000-0000-0000-0000-000000000080'::uuid, '00000000-0000-0000-0000-0000000000c1', 'Andre', 'Matos', 'Matos', 9, 'F'),
  ('20000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-0000000000c2', 'Marco', 'Duarte', 'Duarte', 4, 'G'),
  ('20000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-0000000000c2', 'Pedro', 'Ferreira', 'Ferreira', 8, 'G'),
  ('20000000-0000-0000-0000-000000000030'::uuid, '00000000-0000-0000-0000-0000000000c2', 'Luis', 'Moreira', 'Moreira', 10, 'F'),
  ('20000000-0000-0000-0000-000000000040'::uuid, '00000000-0000-0000-0000-0000000000c2', 'Rafael', 'Gomes', 'Gomes', 15, 'F'),
  ('20000000-0000-0000-0000-000000000050'::uuid, '00000000-0000-0000-0000-0000000000c2', 'Carlos', 'Tavares', 'Tavares', 23, 'C'),
  ('20000000-0000-0000-0000-000000000060'::uuid, '00000000-0000-0000-0000-0000000000c2', 'Filipe', 'Ramos', 'Ramos', 6, 'G'),
  ('20000000-0000-0000-0000-000000000070'::uuid, '00000000-0000-0000-0000-0000000000c2', 'Ivo', 'Neves', 'Neves', 30, 'C'),
  ('20000000-0000-0000-0000-000000000080'::uuid, '00000000-0000-0000-0000-0000000000c2', 'Paulo', 'Vaz', 'Vaz', 12, 'F');

insert into public.games (
  id, league_id, home_team_id, away_team_id, competition, venue, starts_at, status, rules, created_by
) values (
  '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
  'Liga Demo', 'Pavilhao Demo', now() + interval '1 day', 'scheduled',
  (select rules from public.rule_presets where name = 'FIBA'),
  '00000000-0000-0000-0000-0000000000a1'
);

-- Roster snapshot: first five of each team start.
insert into public.game_rosters (game_id, player_id, side, number, display_name, starter)
select '00000000-0000-0000-0000-0000000000d1', p.id,
  case when p.team_id = '00000000-0000-0000-0000-0000000000c1' then 'home'::public.side else 'away'::public.side end,
  p.number, p.display_name,
  row_number() over (partition by p.team_id order by p.id) <= 5
from public.players p
where p.team_id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
