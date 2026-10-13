begin;
select plan(15);

-- fixtures (run as postgres, bypassing RLS)
insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'keeper@t.test'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@t.test');

-- the seed game d1 is owned by seed user a1; make e1 its scorekeeper
insert into public.game_scorekeepers (game_id, user_id)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1');
update public.games set status = 'live' where id = '00000000-0000-0000-0000-0000000000d1';

-- ---- anon
set local role anon;
select is((select count(*)::int from public.games where id = '00000000-0000-0000-0000-0000000000d1'), 1, 'anon reads a public game');
select throws_ok(
  $$insert into public.game_events (id, game_id, group_id, device_seq, period, clock_ms, side, type, created_by)
    values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), 1, 1, 600000, 'home', 'timeout', '00000000-0000-0000-0000-0000000000e1')$$,
  '42501', null, 'anon cannot insert events');

-- ---- non-scorekeeper
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.game_events (id, game_id, group_id, device_seq, period, clock_ms, side, type, created_by)
    values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), 1, 1, 600000, 'home', 'timeout', '00000000-0000-0000-0000-0000000000e2')$$,
  '42501', null, 'non-scorekeeper cannot insert events');
select throws_ok(
  $$insert into public.players (team_id, first_name, last_name, display_name, number)
    values ('00000000-0000-0000-0000-0000000000c1', 'X', 'Y', 'Y', 50)$$,
  '42501', null, 'non-admin cannot add players');

-- ---- scorekeeper
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.game_events (id, game_id, group_id, device_seq, period, clock_ms, side, type, created_by)
    values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), 1, 1, 600000, 'home', 'timeout', '00000000-0000-0000-0000-0000000000e1')$$,
  'scorekeeper inserts an event');
select throws_ok(
  $$insert into public.game_events (id, game_id, group_id, device_seq, period, clock_ms, side, type, created_by)
    values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), 2, 1, 590000, 'home', 'timeout', '00000000-0000-0000-0000-0000000000e2')$$,
  '42501', null, 'scorekeeper cannot forge created_by');
select is(
  enum_range(null::public.event_type)::text[],
  array['shot','fb','ft','ast','reb','blk','stl','tov','foul','sub','timeout','period','void'],
  'event_type matches core EventType');
select lives_ok(
  $$insert into public.game_events (id, game_id, group_id, device_seq, period, clock_ms, side, type, created_by)
    select gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), 100 + row_number() over (), 1, 500000, 'home', t,
      '00000000-0000-0000-0000-0000000000e1'
    from unnest(enum_range(null::public.event_type)) as t$$,
  'every core event type can be stored');
select is((select server_seq from public.game_events where id = '00000000-0000-0000-0000-0000000000f1') is not null, true, 'server assigns server_seq');

-- update/delete: privileges are revoked, so they fail outright
select throws_ok(
  $$update public.game_events set clock_ms = 0 where id = '00000000-0000-0000-0000-0000000000f1'$$,
  '42501', null, 'scorekeeper cannot update events');
select throws_ok(
  $$delete from public.game_events where id = '00000000-0000-0000-0000-0000000000f1'$$,
  '42501', null, 'scorekeeper cannot delete events');

-- duplicate id (offline retry) is rejected by the primary key, client can ON CONFLICT DO NOTHING
select lives_ok(
  $$insert into public.game_events (id, game_id, group_id, device_seq, period, clock_ms, side, type, created_by)
    values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), 1, 1, 600000, 'home', 'timeout', '00000000-0000-0000-0000-0000000000e1')
    on conflict (id) do nothing$$,
  'retrying the same event id is idempotent');

-- ---- finished games are locked
reset role;
update public.games set status = 'final' where id = '00000000-0000-0000-0000-0000000000d1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.game_events (id, game_id, group_id, device_seq, period, clock_ms, side, type, created_by)
    values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), 3, 1, 580000, 'home', 'timeout', '00000000-0000-0000-0000-0000000000e1')$$,
  '42501', null, 'no events after the game is final');

-- ---- trigger blocks mutation even for the table owner
reset role;
select throws_ok(
  $$update public.game_events set clock_ms = 0$$,
  'P0001', 'game_events is append-only; record a void event instead', 'append-only trigger blocks owner updates');

-- ---- jersey number unique per team
select throws_ok(
  $$insert into public.players (team_id, first_name, last_name, display_name, number)
    values ('00000000-0000-0000-0000-0000000000c1', 'X', 'Y', 'Y', 7)$$,
  '23505', null, 'jersey number is unique per team');

select * from finish();
rollback;
