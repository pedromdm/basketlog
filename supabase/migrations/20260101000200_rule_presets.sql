-- Reference data: rule presets mirror FIBA_RULES / NBA_RULES in packages/core/src/rules.ts.
-- A game copies the chosen rules into games.rules, so editing a preset never changes past games.
insert into public.rule_presets (name, rules) values
  ('FIBA', '{"preset":"FIBA","periods":4,"periodMinutes":10,"overtimeMinutes":5,"playersOnCourt":5,"foulsToFoulOut":5,"teamFoulsBeforeBonus":4,"shotClock":24,"shotClockResetOffReb":14,"timeoutMode":"perHalf","timeouts":{"first":2,"second":3,"overtime":1},"askFastBreak":true,"askAssist":true,"stopClockOnFoul":true}'),
  ('NBA', '{"preset":"NBA","periods":4,"periodMinutes":12,"overtimeMinutes":5,"playersOnCourt":5,"foulsToFoulOut":6,"teamFoulsBeforeBonus":4,"shotClock":24,"shotClockResetOffReb":14,"timeoutMode":"perGame","timeouts":{"first":7,"overtime":2},"askFastBreak":true,"askAssist":true,"stopClockOnFoul":true}'),
  ('Youth', '{"preset":"Youth","periods":4,"periodMinutes":8,"overtimeMinutes":3,"playersOnCourt":5,"foulsToFoulOut":5,"teamFoulsBeforeBonus":4,"shotClock":24,"shotClockResetOffReb":14,"timeoutMode":"perHalf","timeouts":{"first":2,"second":2,"overtime":1},"askFastBreak":true,"askAssist":true,"stopClockOnFoul":true}');
