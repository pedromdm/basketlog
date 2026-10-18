-- New rule: ask "was it blocked?" after a missed shot. Presets default to asking, as before.
-- Games saved earlier have no askBlock in games.rules; the app treats a missing value as true.
update public.rule_presets set rules = rules || '{"askBlock": true}'::jsonb where not (rules ? 'askBlock');
