-- Push notification plumbing: dedupe table and webhook triggers that call the `notify` edge function.

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- One row per (game, kind) already notified: 'start', 'final', 'close'. Written only by the function (service role).
create table public.notified_events (
  game_id uuid not null references public.games (id) on delete cascade,
  kind text not null check (kind in ('start', 'final', 'close')),
  created_at timestamptz not null default now(),
  primary key (game_id, kind)
);
alter table public.notified_events enable row level security;

-- Calls the edge function through pg_net (async: the insert/update never waits for it and never fails because of it).
-- Configuration, set once per database (nothing secret lives in this file):
--   alter database postgres set app.notify_url = 'https://<project-ref>.supabase.co/functions/v1/notify';
--   select vault.create_secret('<service role key>', 'notify_service_key');
-- Local default for the URL: http://host.docker.internal:54321/functions/v1/notify (supabase functions serve).
-- Without the vault secret the call is skipped with a warning.
create function public.notify_webhook() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_url text := coalesce(nullif(current_setting('app.notify_url', true), ''), 'http://host.docker.internal:54321/functions/v1/notify');
  v_key text;
begin
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'notify_service_key' limit 1;
    if v_key is null then
      raise warning 'notify_webhook: vault secret notify_service_key is not set; skipping';
      return null;
    end if;
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body := jsonb_build_object(
        'type', tg_op,
        'table', tg_table_name,
        'schema', tg_table_schema,
        'record', to_jsonb(new),
        'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
      ),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'notify_webhook failed: %', sqlerrm;
  end;
  return null;
end;
$$;

revoke execute on function public.notify_webhook() from public, anon, authenticated;

create trigger games_notify_status after update of status on public.games
for each row when (old.status is distinct from new.status and new.status in ('live', 'final'))
execute function public.notify_webhook();

-- Only made baskets can create a close game, so other events don't call the function.
create trigger game_events_notify_score after insert on public.game_events
for each row when (new.type in ('shot', 'ft') and (new.payload ->> 'made') = 'true')
execute function public.notify_webhook();
