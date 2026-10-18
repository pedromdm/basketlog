begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@t.test'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@t.test');

-- seed teams c1 and c2 exist (see supabase/seed.sql)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.competitions (id, name) values ('00000000-0000-0000-0000-00000000aa01', 'Distrital')$$,
  'a signed-in user creates a competition');
select lives_ok(
  $$insert into public.competition_phases (id, competition_id, position, name)
    values ('00000000-0000-0000-0000-00000000aa11', '00000000-0000-0000-0000-00000000aa01', 1, 'Phase 1'),
           ('00000000-0000-0000-0000-00000000aa12', '00000000-0000-0000-0000-00000000aa01', 2, 'Phase 2');
    insert into public.competition_groups (id, phase_id, position, name)
    values ('00000000-0000-0000-0000-00000000bb11', '00000000-0000-0000-0000-00000000aa11', 1, 'Group A'),
           ('00000000-0000-0000-0000-00000000bb12', '00000000-0000-0000-0000-00000000aa12', 1, 'Group A');
    insert into public.competition_rounds (id, phase_id, position, name)
    values ('00000000-0000-0000-0000-00000000cc11', '00000000-0000-0000-0000-00000000aa11', 1, 'Round 1')$$,
  'the owner adds phases, groups and rounds');
select lives_ok(
  $$insert into public.group_assignments (round_id, team_id, group_id)
    values ('00000000-0000-0000-0000-00000000cc11', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000bb11')$$,
  'the owner puts a team in a group');
select throws_ok(
  $$insert into public.group_assignments (round_id, team_id, group_id)
    values ('00000000-0000-0000-0000-00000000cc11', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000bb12')$$,
  'P0001', 'group and round belong to different phases', 'a group of another phase is rejected');

-- ---- another user
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is((select count(*)::int from public.competitions), 1, 'anyone reads competitions');
select throws_ok(
  $$insert into public.competition_phases (competition_id, position, name)
    values ('00000000-0000-0000-0000-00000000aa01', 3, 'Hijack')$$,
  '42501', null, 'a non-owner cannot add a phase');
select lives_ok(
  $$delete from public.competitions where id = '00000000-0000-0000-0000-00000000aa01'$$,
  'a non-owner delete is filtered out by RLS');
select is((select count(*)::int from public.competitions), 1, 'the competition is still there');

-- ---- anon
reset role;
set local role anon;
select is((select count(*)::int from public.competition_groups), 2, 'anon reads groups');

select * from finish();
rollback;
