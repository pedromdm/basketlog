// Sends push notifications for followed teams: game start, final score, and one close-game alert.
// Called by the database webhook triggers in 20260101000500_notify_webhooks.sql.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildMessage, chunk, isCloseGame, scoreOf, triggerOf, type EventRow, type GameInfo, type WebhookPayload } from './rules.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  const trigger = triggerOf(payload);
  if (!trigger) return json({ skipped: 'no notification for this change' });

  const { data: game } = await admin
    .from('games')
    .select('id, status, rules, home_team_id, away_team_id')
    .eq('id', trigger.gameId)
    .maybeSingle();
  if (!game) return json({ skipped: 'game not found' });

  const { data: teams } = await admin.from('teams').select('id, name, abbr').in('id', [game.home_team_id, game.away_team_id]);
  const home = teams?.find((t) => t.id === game.home_team_id);
  const away = teams?.find((t) => t.id === game.away_team_id);
  if (!home || !away) return json({ skipped: 'teams not found' });

  const info: GameInfo = { status: game.status, rules: game.rules as { periods: number }, teams: { home, away } };

  const { data: eventRows } = await admin
    .from('game_events')
    .select('group_id, type, side, period, clock_ms, payload')
    .eq('game_id', game.id)
    .order('server_seq');
  const events = (eventRows ?? []) as EventRow[];
  const latest = trigger.kind === 'close' ? (payload.record as unknown as EventRow) : undefined;

  if (trigger.kind === 'close' && !isCloseGame(info, events, latest!)) return json({ skipped: 'not close' });

  // Claim the notification first: the primary key makes concurrent or repeated webhooks send it once.
  const { error: claimError } = await admin.from('notified_events').insert({ game_id: game.id, kind: trigger.kind });
  if (claimError) return json({ skipped: 'already sent' });

  const message = buildMessage(trigger.kind, info, scoreOf(events), latest);

  const { data: follows } = await admin.from('team_follows').select('user_id').in('team_id', [home.id, away.id]);
  const userIds = [...new Set((follows ?? []).map((f) => f.user_id))];
  if (userIds.length === 0) return json({ sent: 0 });
  const { data: tokenRows } = await admin.from('push_tokens').select('token').in('user_id', userIds);
  const tokens = [...new Set((tokenRows ?? []).map((t) => t.token))];

  const dead: string[] = [];
  for (const batch of chunk(tokens, 100)) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch.map((to) => ({ to, title: message.title, body: message.body, sound: 'default', data: { gameId: game.id } }))),
    });
    if (!res.ok) continue;
    const { data: tickets } = (await res.json()) as { data: { status: string; details?: { error?: string } }[] };
    tickets.forEach((t, i) => {
      if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') dead.push(batch[i]!);
    });
  }
  if (dead.length > 0) await admin.from('push_tokens').delete().in('token', dead);

  return json({ sent: tokens.length - dead.length, removed: dead.length, kind: trigger.kind });
});
