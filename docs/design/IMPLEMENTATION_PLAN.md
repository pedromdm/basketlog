# Basket Log — Implementation Plan (VS Code + Claude Code)

Goal: one product that ships as an **iOS app, an Android app and a website**. The apps are for courtside scorekeepers and logged-in viewers. The website is public: game list, play-by-play, box score, shot chart, recap and player pages.

---

## 1. Recommended approach

### Stack: a TypeScript monorepo with a shared core

```
basket-log/
├─ apps/
│  ├─ mobile/      Expo (React Native) + Expo Router  → iOS + Android (+ optional web build)
│  └─ web/         Next.js (App Router)               → public website (SEO, shareable links)
├─ packages/
│  ├─ core/        Pure TS: event types, play-chain state machine, stat derivation  ← the heart
│  ├─ db/          Supabase schema, migrations, generated types, typed queries
│  ├─ ui/          Design tokens + shared primitives (Court, ScoreBug, StatTable)
│  └─ config/      tsconfig / eslint / prettier presets
├─ supabase/       migrations, seed.sql, RLS policies, edge functions
├─ CLAUDE.md       project rules for Claude Code
└─ turbo.json / pnpm-workspace.yaml
```

| Layer | Choice | Why |
|---|---|---|
| Mobile | **Expo SDK (latest) + Expo Router + TypeScript** | One codebase for iOS and Android, managed builds (EAS) and OTA updates. Works well with Claude Code. |
| Web | **Next.js + Tailwind** | Server-rendered public pages are good for SEO and sharing a game link. |
| Backend | **Supabase** (Postgres, Auth, Realtime, Row Level Security) | Realtime pushes logged events to viewers live. Postgres is a good fit for stats queries. No custom server needed at first. |
| Offline | **expo-sqlite** local event queue → syncs to Supabase | Arena Wi-Fi is unreliable. The tracker must never lose an event. |
| State | **Zustand** (UI) + **TanStack Query** (server data) | Lightweight and easy to test. |
| Testing | **Vitest** (core), **Jest + RNTL** (mobile), **Playwright** (web) | Most of the risk is in `core`, so test it hardest. |
| Monorepo | **pnpm + Turborepo** | Fast and conventional, and Claude Code handles it well. |

### Simpler alternative (if the team is 1–2 people)
Build **only `apps/mobile` with Expo Router's web output**, so a single codebase serves iOS, Android and web. You lose some SEO and web polish on the public pages, but ship much faster. You can still add Next.js later, because `core`, `db` and `ui` are already separate packages.

> Recommendation: start with the monorepo layout from day 1 (it costs little). Build `core` → `db` → `mobile` tracker first, and add `web` once events are flowing.

---

## 2. Core architecture: event sourcing

The prototype already works this way, so keep the pattern:

- The **only source of truth is an append-only list of game events.**
- The score, fouls, on-court lineups, box score, shot chart, play-by-play and recap are all **derived** from events (`packages/core/derive.ts`).
- **Undo** is a `void` event that references the voided `group_id`. Never use a hard delete; this keeps an audit trail and makes sync conflicts easier to handle.
- A **play** (`group_id`) chains events together. For example: shot → fast-break flag → assist, or miss → block → rebound, or foul → free throws ×N → rebound.

### Event model (`packages/core/types.ts`)

```ts
type Side = 'home' | 'away';
type EventType = 'shot' | 'ft' | 'ast' | 'reb' | 'blk' | 'stl' | 'tov' | 'foul' | 'sub' | 'timeout' | 'period' | 'void';

interface GameEvent {
  id: string;            // uuid generated on device (idempotent sync)
  gameId: string;
  groupId: string;       // the chained play
  seq: number;           // device-local order; server assigns serverSeq
  period: number;        // 1–4, 5+ = OT
  clockMs: number;       // game clock at time of event
  side: Side;
  playerId: string | null;   // null = team-level (opponent in team-only mode, team rebound)
  type: EventType;
  // shot / ft
  made?: boolean; points?: 1 | 2 | 3; x?: number; y?: number; distanceFt?: number; fastBreak?: boolean;
  // rebound
  offensive?: boolean;
  // sub
  inPlayerId?: string; outPlayerId?: string;
  // void
  voidsGroupId?: string;
  createdBy: string; createdAt: string;
}
```
Court coordinates use a **half court of 500 × 470 units (1 unit = 0.1 ft)**, with the basket at (250, 52.5). This matches `Court.dc.html`.

### Play-chain state machine (`packages/core/chain.ts`)
Port this directly from the prototype's `chainView()` / `startShot()` / `act()` logic:

```
shot 2/3 made   → fastBreak? → assist? (teammates | none)
shot 2/3 missed → fastBreak? → blocked? (opponents | none) → rebound? (10 players | team | skip)
FT missed (last)→ rebound?
turnover        → steal? (opponents | none)
foul            → [STOP CLOCK] → fouled player? → FT count (0–3) → FT 1..N made/missed → (miss on last → rebound)
sub             → bench player in
timeout         → [STOP CLOCK]
```
Every follow-up question can be switched on or off in the game rules (`askFastBreak`, `askAssist`). Fouls stop the clock when `stopClockOnFoul` is on.

**Tracking mode per side:** `full` or `team_only`. In `team_only`, prompts for that side offer only a team-level option ("Benfica rebound", "Blocked by Benfica"), and that side's shots skip location, fast break and assist.

Write this as a **pure reducer**: `(state, action) → { state, emittedEvents, nextPrompt }`. Then the mobile UI, tests and any future web tracker all share it.

---

## 3. Database (Supabase / Postgres)

```
leagues(id, name, season)
teams(id, league_id, name, abbr, city, color_primary, logo_url)
players(id, team_id, first_name, last_name, display_name /* short name shown in game, NOT unique */,
        number /* unique per team */, position[G|F|C|null], photo_url, active)
rule_presets(id, name /* FIBA | NBA | Youth | custom */, rules jsonb)
games(id, league_id, home_team_id, away_team_id, competition, venue, starts_at,
      status[scheduled|live|final], rules jsonb /* snapshot of GameRules at start */,
      home_tracking[full|team_only], away_tracking[full|team_only])
game_rosters(game_id, player_id, side, number, display_name, starter bool)  -- snapshot so later roster edits don't rewrite history
game_events(id uuid pk, game_id, group_id, server_seq bigserial, device_seq, period, clock_ms, side,
            player_id null, type, payload jsonb, created_by, created_at)
memberships(user_id, league_id/team_id, role[admin|scorekeeper|coach|viewer])
```
### GameRules (jsonb, typed in `packages/core/rules.ts`)
```ts
interface GameRules {
  preset: 'FIBA' | 'NBA' | 'Youth' | 'Custom';
  periods: number; periodMinutes: number; overtimeMinutes: number;
  playersOnCourt: number;            // 3–5
  foulsToFoulOut: number;            // FIBA 5, NBA 6
  teamFoulsBeforeBonus: number;      // per period
  shotClock: number; shotClockResetOffReb: number;
  timeoutMode: 'perHalf' | 'perPeriod' | 'perGame';
  timeouts: { first: number; second?: number; overtime: number };
  askFastBreak: boolean; askAssist: boolean; stopClockOnFoul: boolean;
}
// FIBA: 4×10, OT 5, 5 PF, bonus after 4, 24/14, per half 2+3, OT 1
// NBA:  4×12, OT 5, 6 PF, bonus after 4, 24/14, per game 7, OT 2
```
The period label comes from the rules: two periods → H1/H2, otherwise Q1..Qn, then OT1, OT2…. When the clock reaches zero, the next period only starts if periods remain or the score is tied. Team fouls reset each period. Timeouts left are computed for the current part of the game (half, period or whole game).

- **RLS:** anyone can read events for public games. Only a game's assigned scorekeeper(s) can insert events. Nobody can update or delete events; corrections are `void` events.
- **Derived views / materialized tables** for box scores and season stats. These can be computed from `core.derive` in an Edge Function on `final`, or by SQL views.
- **Realtime:** web and app viewers subscribe to `game_events where game_id = …`.

---

## 4. Phased roadmap

Each phase is a few Claude Code sessions. Finish each phase with tests passing and a commit before starting the next.

### Phase 0 — Foundations (½–1 day)
- pnpm + Turborepo workspace, TS strict, ESLint/Prettier, Vitest.
- `npx create-expo-app apps/mobile -t tabs` and `npx create-next-app apps/web`.
- `packages/ui/tokens.ts` built from the README's design tokens. Load Barlow + Barlow Condensed in both apps.
- Supabase project, then `supabase init` and the first migration.
- Write `CLAUDE.md` (template in §6).

### Phase 1 — `packages/core` (2–3 days) ★ most important
- Event types, `derive()` (score, team fouls, lineups, player box lines, shot list, play-by-play grouping).
- Chain reducer covering every flow in §2, including `team_only` mode and the clock stopping on fouls and timeouts.
- **Write the tests first**, with one test per flow. For example: "made 3 → fast break yes → assist Reyes ⇒ +3, AST Reyes, PBP line text".

### Phase 2 — Backend (1–2 days)
- Migrations and RLS for §3, a seed with SCP vs SLB and fictional rosters, and generated TS types into `packages/db`.
- Auth: email magic link plus Apple/Google sign-in for mobile.

### Phase 2b — Teams & game setup (2–3 days)
- **Teams (4b):** list and create teams; edit the name, short code, city and colour; inline-edit the roster (number, first, last, **short name**, position); add and remove players. Validate that jersey numbers are unique; short names may repeat.
- **New game wizard (4a):** Matchup (home/away, competition, venue, date) → Rules (preset + steppers + timeout mode + question toggles + tracking mode per team) → Lineups (pick exactly `playersOnCourt` starters) → Review (validation list) → **Start game** creates the `games` row, snapshots `rules` and `game_rosters`, and opens the tracker.

### Phase 3 — Mobile tracker (4–6 days)
- Screens: Game picker → New game wizard (4a) → **Tracker**. The tablet layout is 1b, or 2a in one-team mode; the phone layout is 3a (court-first) or 1c (buttons). Switch between them by screen width.
- Tap the court → pending marker → a popover or sheet with a **shooter picker** (on-court players by number and short name, preselected) → MADE/MISSED → follow-up questions.
- `Court` component built with `react-native-svg`. Tap → coordinates → 2PT/3PT detection (logic in `core`).
- Game clock and shot clock, with the clock stopping on fouls and timeouts.
- Offline queue in expo-sqlite, background sync, and a sync status pill ("Synced · 0s").
- Haptics on every logged event, and large hit targets (minimum 48 pt).

### Phase 4 — Website (3–5 days)
- `/games` (1a), `/games/[id]` hub with tabs for Play-by-Play (1d), Box Score (1e), Shot Chart (1f) and Recap (1g), plus `/players/[id]/games/[gameId]` (1h).
- Server components read the derived data. A client component subscribes to Realtime for live games.
- Open Graph images for shared game links.

### Phase 5 — Viewer in the app + polish (3–5 days)
- Add the website's viewer screens to the mobile app as tabs (the phone layouts are 1d and 1h).
- Push notifications (Expo Notifications) for game start, final score and close games.
- Admin: manage teams, rosters and games, and assign scorekeepers.
- CSV export of the box score.

### Phase 6 — Release
- EAS Build and Submit (TestFlight / Play Internal testing), Vercel for the website, and Sentry for both apps.

---

## 5. How to work with Claude Code in VS Code

1. **Open the empty repo folder in VS Code** and start Claude Code in the integrated terminal (`claude`).
2. Copy this handoff folder into the repo as `/docs/design/`, so Claude can read `README.md`, this plan and the HTML prototypes.
3. Run `/init`, then replace the generated `CLAUDE.md` with the template below (or merge it in).
4. Use **plan mode** (Shift+Tab) for each phase, so Claude proposes the file list before writing code.
5. Work **one phase per session**. Close each session with: run tests → review the diff → commit.
6. When building a screen, point Claude at the prototype. For example: *"Implement the tablet tracker exactly like `docs/design/Basket Log Mockups.dc.html` option 1b; read the README section 'Tracker (tablet)' for exact tokens."*

### Starter prompts (copy and paste, in order)
```
1. Read docs/design/IMPLEMENTATION_PLAN.md and README.md. Scaffold Phase 0 exactly as described
   (pnpm + turborepo, apps/mobile Expo Router, apps/web Next.js, packages core/db/ui/config).
   Don't build features yet. Show me the plan first.

2. Phase 1: in packages/core, write Vitest tests FIRST for every play-chain flow listed in §2
   (incl. team_only mode and clock stop on foul). Then implement types.ts, chain.ts, derive.ts
   until green. Port logic from the prototype's chainView/startShot/act/derive methods in
   docs/design/Basket Log Mockups.dc.html.

3. Phase 2: create Supabase migrations + RLS for the schema in §3, a seed for SCP vs SLB,
   and generate types into packages/db.

4. Phase 3: build the mobile Tracker screen (tablet = option 1b/2a, phone = 1c) using packages/core.
   Court with react-native-svg using the 500×470 coordinate system. Offline queue with expo-sqlite.

5. Phase 4: build the Next.js public pages 1a, 1d, 1e, 1f, 1g, 1h with Realtime on live games.
```

---

## 6. `CLAUDE.md` template (put this at the repo root)

```md
# Basket Log

Basketball game-event capture (scorekeepers) + stats viewing (coaches, players, parents).
iOS/Android via Expo, web via Next.js, backend Supabase. Monorepo: pnpm + Turborepo.

## Golden rules
- Game state is EVENT-SOURCED. Never store derived stats as truth; derive from game_events via packages/core.
- Events are append-only. Undo = `void` event referencing group_id. Never UPDATE/DELETE events.
- All play-chain logic lives in packages/core as pure functions with tests. UI only renders prompts and dispatches actions.
- Event ids are client-generated UUIDs (idempotent offline sync).
- Court coords: 500×470 half court, basket (250, 52.5), 3PT arc r=237.5, corners x<30 | x>470 when y<140.

## Design
- Design references: docs/design/ (HTML prototypes + README with exact tokens). Match them.
- Fonts: Barlow Condensed (numbers, headings, buttons), Barlow (UI text).
- Colors: green #1E7A46, green-dark #145532, green-light #4FBF7A, ink #111311, paper #F3EEE5,
  line #E4DCCF, muted #6B6862, wood #D9A66B. Use tokens from packages/ui, never raw hex in components.
- Tracker hit targets ≥ 48pt. Every logged event gives haptic + visible confirmation + Undo.

## Commands
- pnpm dev            # all apps
- pnpm test           # vitest + jest
- pnpm -F core test   # core only — run after any core change
- supabase db reset   # reapply migrations + seed

## Workflow
- Propose a plan before multi-file changes. Small commits per task. Keep tests green.
```

---

## 7. Screenshots
`screenshots/` contains every screen, plus key states (a play in progress on the tracker, and each wizard step). Use them next to the README specs. The live HTML prototype remains the source of truth for behaviour.

## 8. Open decisions (settle these early)

- **Leagues:** a single league (e.g. Liga Betclic) or multi-tenant from the start? This changes RLS.
- **Several scorekeepers per game:** e.g. one tracks home and one tracks away (team-only mode makes this natural). This needs a conflict rule for score events; recommendation: each scorekeeper owns one side.
- **Official vs. unofficial stats:** if these become official, add a "lock / sign off game" step and an audit log view.
- **Video sync** (later): store a `video_ts` on events to jump to clips.
- **Language:** Portuguese and English UI? If so, add i18n (`i18next`) in Phase 0.
