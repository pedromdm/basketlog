# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Pre-implementation. The repo currently holds only the design handoff in `docs/design/` (no source code, no git history, no build tooling). Everything below the "Planned" markers comes from `docs/design/IMPLEMENTATION_PLAN.md` and `docs/design/README.md`; read both before starting a phase. Update this file as the real scaffold lands (commands especially).

**Basket Log**: basketball game-event capture for courtside scorekeepers (tablet/phone) plus live and post-game stats viewing for coaches, players and parents. Default matchup in mocks: SCP (home) vs SLB (away).

## Design references

- `docs/design/Basket Log Mockups.dc.html` is the source of truth for look and behaviour. Open it in a browser; it needs `support.js`, `Court.dc.html` and `SiteHeader.dc.html` beside it. These are HTML prototypes to recreate in the target stack, not production code.
- The prototype's logic class (search `chainView`, `startShot`, `act`, `derive`) is a working reference for the play-chain state machine. Port it into `packages/core` with tests.
- `docs/design/README.md` has per-screen specs and design tokens (colours, Barlow / Barlow Condensed fonts, radii, court geometry). `docs/design/screenshots/` has one PNG per screen id (1a–1h, 2a, 3a, 4a, 4b). Screen ids are used throughout the docs.
- Fidelity is high: match tokens exactly, and never use raw hex in components once `packages/ui` tokens exist.

## Planned architecture

TypeScript monorepo (pnpm + Turborepo): `apps/mobile` (Expo / React Native + Expo Router, iOS + Android), `apps/web` (Next.js App Router, public site), `packages/core` (pure TS), `packages/db` (Supabase schema/types/queries), `packages/ui` (tokens + Court, ScoreBug, StatTable), `packages/config`, and `supabase/` (migrations, seed, RLS). Backend is Supabase (Postgres, Auth, Realtime, RLS). Offline queue uses expo-sqlite syncing to Supabase. Tests: Vitest (core), Jest + RNTL (mobile), Playwright (web).

Planned build order: `core` → `db` → mobile tracker → web. Work one phase per session (phases listed in the plan). `core` carries most of the risk, so write its tests first.

### Rules that span many files

- **Event sourcing.** The only source of truth is an append-only list of `GameEvent`s. Score, fouls, lineups, box score, shot chart, play-by-play and recap are all derived (`packages/core/derive.ts`). Never store derived stats as truth.
- **Undo is a `void` event** referencing `voidsGroupId`. Never UPDATE or DELETE events (RLS should forbid it too).
- **A play = `groupId`** chaining events (shot → fast break → assist; miss → block → rebound; foul → FTs → rebound). Undo removes the whole group; Cancel removes the in-progress play; Done keeps what was answered.
- **Chain logic is a pure reducer** in `packages/core/chain.ts`: `(state, action) → { state, emittedEvents, nextPrompt }`. UI only renders prompts and dispatches actions. Chain flows are listed in README "Interactions & behaviour" and plan §2.
- **Per-side tracking mode** `full | team_only`. In `team_only`, prompts offer only a team-level option for that side and its shots skip location, fast break and assist.
- **Rules are a snapshot.** `GameRules` (FIBA/NBA/Youth/Custom presets) is copied onto `games.rules` at start, and `game_rosters` snapshots players so later roster edits don't rewrite history. Rules toggles (`askFastBreak`, `askAssist`, `stopClockOnFoul`) change which chain prompts appear.
- **Client-generated UUID event ids** for idempotent offline sync; `device_seq` locally, `server_seq` assigned by the server.
- **Court coordinates:** half court 500×470 units (1 unit = 0.1 ft), basket at (250, 52.5). A tap is 3PT if `y < 140 && (x < 30 || x > 470)`, otherwise 3PT if distance from (250, 52.5) > 237.5; feet = distance / 10.
- **Shot clock:** reset to 24 on made shot, defensive rebound, turnover or steal; reset to 14 on offensive rebound. Fouls and timeouts stop the game clock.
- **Players:** jersey number unique per team; `display_name` (short name shown in trackers) may repeat and defaults to last name.

## `packages/core` (Phase 1, implemented)

- `chain.ts`: `initTracker(config)` then `reduce(state, action, env) -> { state, emittedEvents, nextPrompt }`. `env` injects `newId`/`now`/`userId`, so the reducer stays pure. Prompts are answered with `{ type: 'answer', optionId }`; option ids look like `player:h2`, `off:team`, `def:player:a3`, `yes`/`no`, `none`, `skip`, `made`/`missed`, `1`/`2`/`3`.
- While a play is open (`state.chain`), actions that start a new play are ignored. `done` keeps what was answered, `cancel` and `undo` void the open play. The shot is logged on tap; the fast-break answer is a separate `fb` event (`fastBreak: boolean`) in the same group, which `derive` folds into the play text.
- `derive.ts`: `derive(events, setup)` gives score, per-period team fouls, lineups, box lines, shot dots and play-by-play text. `activeEvents` drops voided groups; it is the one place that interprets `void`.
- Tests are at the reducer and `derive` seams (`chain.test.ts`, `derive.test.ts`; shared fixtures in `test-helpers.ts`). `classifyShot` (2PT/3PT from a court tap), rules helpers (period labels, timeouts left) and minutes/plus-minus are not built yet.

## Commands

Phase 0 scaffold is in place (pnpm 10 + Turborepo, `node-linker=hoisted` in `.npmrc` for Metro). Workspace packages are `@basket-log/{web,mobile,core,ui,db,config}`; shared packages export TS source directly (no build step).

- `pnpm install`; `pnpm dev` (all apps); `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`
- One package: `pnpm -F @basket-log/core test` (Vitest; single file: `pnpm -F @basket-log/core exec vitest run src/index.test.ts`)
- Web: `pnpm -F @basket-log/web dev|build`. Its `typecheck` runs `next typegen` first because `LayoutProps` is a generated global.
- Mobile: `pnpm -F @basket-log/mobile start` (or `web`/`ios`/`android`); smoke-bundle with `pnpm -F @basket-log/mobile exec expo export --platform web`.
- Supabase (Phase 2, needs Docker): `npx supabase start`, then `pnpm db:reset` (migrations + `seed.sql`), `pnpm db:test` (pgTAP RLS tests in `supabase/tests/database`), `pnpm db:types` (regenerates `packages/db/src/database.types.ts`; commit the result). No hosted project is linked yet. Seed login: `scorekeeper@basketlog.test` / `password123` (local only).
- `event_type` enum in `supabase/migrations/*_schema.sql` must match `EventType` in `packages/core/src/types.ts`; a pgTAP test checks it.
- RLS model: public read for public games; only `game_scorekeepers` insert events (and only while the game is not `final`); no UPDATE/DELETE on `game_events` (privileges revoked plus an append-only trigger). Creating a league/team/game auto-grants the creator admin/scorekeeper via trigger.

Design tokens live in `packages/ui/src/tokens.ts`; `apps/web/src/app/globals.css` mirrors them as Tailwind theme variables (keep in sync), and mobile imports them directly.

## Phase 2b (teams and game setup)

- `packages/core/src/setup.ts`: `validateRoster` (unique jersey numbers, required names) and `validateNewGame` (feeds the wizard's "Fix before starting" list). A `team_only` side needs no starters.
- `packages/db/src/queries.ts`: team/player CRUD, `listRulePresets`, and `createGame`, which calls the `create_game()` SQL function (atomic: game row, rules snapshot, roster snapshot, status `live`). Removing a player only sets `active = false`; the jersey-number unique index covers active players only.
- Web: `/teams` (screen 4b) and `/login` (magic link), Supabase SSR clients in `apps/web/src/lib/supabase`, session refresh in `src/proxy.ts`. Mobile: sign-in (`app/sign-in.tsx`), wizard (`app/new-game.tsx`, logic in `lib/wizard.ts`), placeholder `app/game/[id].tsx` until Phase 3. Both apps read local Supabase URL/key from `.env` (copy `.env.example`).
- `pnpm install` on Windows can fail on `typescript-eslint` while `rtk` hides it; run `rtk proxy pnpm install`. A clean `node_modules` fixes it.
- Not verified in a browser/device: magic-link round trip, teams autosave, wizard to Start game. Date field is plain text; Google/Apple buttons are disabled stubs.

## Phase 3 (mobile tracker)

- `packages/core`: `classifyShot` (court.ts), `periodLabel` / `periodLengthMs` / `canStartNextPeriod` / `timeoutsLeft` (periods.ts); `initTracker({ events })` resumes a game (period and seq follow the saved events).
- Data layer `apps/mobile/lib/tracker`: `useTracker(gameId)` (contract in `types.ts`) runs the reducer, writes emitted events to a local outbox first (expo-sqlite on native, memory on web via `sqliteStorage.web.ts`), then upserts to `game_events` on `id` with ignore-duplicates (idempotent retries) with backoff and NetInfo. It also owns the 100 ms clock tick and haptics. A period change is not an event; the period is recovered from the last event.
- Views `apps/mobile/components/tracker` (tablet 1b/2a, phone 3a/1c, Court in react-native-svg) and `app/game/[id].tsx`. Prompt option labels are raw ids; `format.ts` turns them into names.
- Untested on a device: court tap coordinates, haptics, offline queue, layouts. No Jest for mobile yet; only core logic has unit tests.
- Known gaps: `finishGame` refuses while events are pending; a crash in the few ms before the outbox write completes could drop one event; team-only "MISS" button logs a 2PT miss.

## Phase 4 (public website)

- `packages/core`: `recap.ts` (`lineScore`, `leadStats`, `biggestRuns`; all work on `derive().plays`' running score) and `boxscore.ts` (`teamTotals`, `percentage`, `teamLeaders`, `shotZones`). Minutes and plus/minus are not computed; the box score shows an em dash.
- `packages/db/src/events.ts`: `toRow`/`fromRow` shared by mobile (outbox/sync) and web.
- Web routes: `/games` (1a), `/games/[id]` hub layout + play-by-play (1d), `/games/[id]/box` (1e), `/shots` (1f, filters via searchParams), `/recap` (1g), `/players/[id]/games/[gameId]` (1h). `src/lib/game-data.ts` `loadGameView` builds everything from Supabase rows; `getGameView` caches it per request. Pages sit under `cacheComponents`, so request data must be inside `<Suspense>`.
- Live games: `components/live-refresh.tsx` subscribes to Realtime (`game_events` INSERT, `games` UPDATE) and calls `router.refresh()` (throttled 500 ms). Open Graph image: `app/games/[id]/opengraph-image.tsx`.
- Known gaps: unknown game ids return HTTP 200 with an empty shell (streaming under cacheComponents) instead of a 404 status; filters on the shot chart are single-select links; pages were checked via rendered HTML and an OG image render, not visually against the screenshots.
