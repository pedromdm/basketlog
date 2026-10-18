-- New rule: what happens to a fouled-out player when nobody on the bench can replace him.
-- FIBA / Youth: he leaves and the team plays with fewer than five. NBA: no team goes below five, he stays.
-- Games saved earlier have no playShortHanded in games.rules; the app treats a missing value as true.
update public.rule_presets set rules = rules || '{"playShortHanded": true}'::jsonb where name in ('FIBA', 'Youth') and not (rules ? 'playShortHanded');
update public.rule_presets set rules = rules || '{"playShortHanded": false}'::jsonb where name = 'NBA' and not (rules ? 'playShortHanded');
