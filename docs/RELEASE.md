# Release (Phase 6)

Config is in the repo; the steps below need accounts and secrets that are not.

## Mobile (EAS)
1. `cd apps/mobile && npx eas login && npx eas init` (writes `extra.eas.projectId` into `app.json`; push notifications need it too).
2. Set the hosted Supabase URL/key and `EXPO_PUBLIC_SENTRY_DSN` as EAS env vars (`eas env:create`) for `preview` and `production`. Profiles are in `eas.json`.
3. Credentials: `eas credentials` for APNs (iOS) and FCM (Android) push keys.
4. Build and ship: `eas build -p ios --profile production` then `eas submit -p ios` (TestFlight); same with `-p android` (Play internal track). Fill `ascAppId` in `eas.json`.
5. Sentry source maps: set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` for the build.

## Web (Vercel)
1. Import the repo, set **Root Directory** to `apps/web` (`vercel.json` runs install/build from the repo root).
2. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`; for source maps `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
3. Add the Vercel URL to Supabase Auth redirect URLs (magic link).

## Supabase (hosted)
1. Create a project, `npx supabase link`, `npx supabase db push`.
2. Push notifications: `npx supabase functions deploy notify`, store the vault secret `notify_service_key` and set `app.notify_url` (see `20260101000500_notify_webhooks.sql`).

## Web on Cloudflare (Workers, free plan)

`apps/web` is set up for `@opennextjs/cloudflare` (`open-next.config.ts`, `wrangler.jsonc`, scripts `preview` / `deploy`). Next must stay at 16.4.1 or newer (adapter peer range).

- Dashboard route: Workers & Pages → Create → connect the repo. Root directory `apps/web`, build command `pnpm install && pnpm exec opennextjs-cloudflare build`, deploy command `pnpm exec opennextjs-cloudflare deploy`.
- Variables (build and runtime): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- CLI route: `npx wrangler login`, then `pnpm -F @basket-log/web deploy`. Build on Linux/WSL or in Cloudflare's builder; the adapter is unreliable on native Windows.
- Add the Workers URL to Supabase Auth → URL Configuration (Site URL and redirects) so the magic link returns to it.
- Not verified: `cacheComponents` on the adapter. The Next 16 `proxy.ts` hung the worker, so it is `src/middleware.ts` (edge runtime). If the build or `/games` fails, test with `preview` first.
- Server-side Sentry (`instrumentation.ts`) was removed: the instrumentation hook fails to load on the Cloudflare adapter and every request returned 500. Browser Sentry (`instrumentation-client.ts`) stays and is inert without a DSN. To bring server Sentry back, test it with `preview` first.
