-- New rule: the fewest players a team may have on court before the game cannot go on.
-- FIBA / Youth: 2 (a team left with one player forfeits). NBA: 5 (no team goes below five).
-- Games saved earlier have no minPlayersToContinue in games.rules; the app treats a missing value as 2.
update public.rule_presets set rules = rules || '{"minPlayersToContinue": 2}'::jsonb where name in ('FIBA', 'Youth') and not (rules ? 'minPlayersToContinue');
update public.rule_presets set rules = rules || '{"minPlayersToContinue": 5}'::jsonb where name = 'NBA' and not (rules ? 'minPlayersToContinue');
