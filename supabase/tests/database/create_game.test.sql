begin;
select plan(5);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select lives_ok($$
  create temp table result on commit drop as
  select public.create_game(
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
    (select rules from public.rule_presets where name = 'NBA'),
    array['10000000-0000-0000-0000-000000000010']::uuid[], '{}'::uuid[],
    'full', 'team_only', 'Cup', 'Arena'
  ) as id
$$, 'creator can start a game');

grant select on result to authenticated;

select is((select status::text from public.games where id = (select id from result)), 'live', 'game is live');
select is((select rules ->> 'preset' from public.games where id = (select id from result)), 'NBA', 'rules snapshot copied');
select is((select count(*)::int from public.game_rosters where game_id = (select id from result)), 16, 'both rosters snapshotted');
select is(
  (select count(*)::int from public.game_rosters where game_id = (select id from result) and starter),
  1, 'only the given starters are flagged');

select * from finish();
rollback;
