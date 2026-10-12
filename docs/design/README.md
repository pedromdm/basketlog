# Handoff: Basket Log — basketball game-event capture & stats

## Overview
Basket Log records every event in a basketball game: shots with court location, rebounds, assists, steals, blocks, turnovers, fouls, substitutions, timeouts and fast breaks. Scorekeepers log events courtside on a tablet or phone. Coaches, players and parents follow the game live and review it afterwards. Default matchup: **SCP · Sporting CP (home) vs SLB · SL Benfica (away)**.

See **IMPLEMENTATION_PLAN.md** for the architecture, data model, phases and Claude Code workflow.

## About the design files
The files in this bundle are **design references built in HTML**. They are prototypes that show the intended look and behaviour, not production code. Recreate them in the target stack (Expo / React Native for the iOS and Android apps, Next.js for the website), following that stack's patterns. To view them, open `Basket Log Mockups.dc.html` in a browser; it needs `support.js`, `Court.dc.html` and `SiteHeader.dc.html` next to it. The canvas pans and zooms.

The prototype's logic class (search for `chainView`, `startShot`, `act`, `derive`) is a **working reference implementation of the play-chain state machine**. Port it into `packages/core` with tests.

## Fidelity
**High-fidelity.** Colours, type, spacing and interactions are final. Recreate them closely with the target platform's primitives.

## Screens (option ids as labelled in the prototype)
| Id | Screen | Platform | Users |
|---|---|---|---|
| 4a | New game wizard: Matchup → Rules → Lineups → Review → Start | Tablet app | Scorekeeper |
| 4b | Teams and roster management | Web (+ app) | Admin |
| 3a | Tracker, phone, court-first, with a shooter picker in the sheet | Phone app | Scorekeeper |
| 2a | Tracker, **one-team mode** (full detail for home, team-only for away) | Tablet app | Scorekeeper |
| 1b | Tracker, both teams, court-first | Tablet app | Scorekeeper |
| 1c | Tracker, phone, player-first | Phone app | Scorekeeper |
| 1a | Games list / schedule | Web (+ app) | All |
| 1d | Play-by-play feed | Phone app / mobile web | All |
| 1e | Box score | Web | All |
| 1f | Shot chart + zone breakdown | Web | Coaches |
| 1g | Game recap (line score, score flow, comparison, top performers, key moments) | Web | All |
| 1h | Player game detail | Phone app / mobile web | Players, parents |

### Tracker (tablet, 1180×820 landscape), 1b / 2a
- **Score bar** (height 88, bg #111311). Each side has a team chip (46px circle: home #1E7A46, away #FFFFFF with ink text), name (Barlow Condensed 700 22px uppercase), team fouls (Barlow 500 12px #B9B4AA) and score (Barlow Condensed 800 56px; the away score is #D8D3CA). The centre shows "Q4 m:ss" (Barlow Condensed 700 34px, with "Q4" in #4FBF7A), a SHOT clock pill (#242624, 12px) and a Start/Pause clock button (green when running).
- **Body:** padding 20, gap 20, three columns.
  - **Left 220px:** team segmented control (1b only). Track #E4DCCF, radius 12, padding 4; active segment uses the team colour and white text. Below it, 5 on-court player cards (grid 44px | 1fr | auto, padding 10–12, radius 12, border 1.5px). Each card shows the jersey number (Barlow Condensed 700 32px), last name (Barlow 600 15px), "POS · N PTS" in 12px muted, and a "N PF" badge (11px, radius 6; turns black when PF ≥ 5). The selected card has bg #1E7A46 and white text. Under the cards: a dashed "Sub out #N Name" button (height 44) and, in 2a, an "Undo last play" button.
  - **Centre:** Court (aspect 500:470) on hardwood with green paint and white lines (spec below). Tapping sets a pending marker (30px white circle, 3px ink border, 6px white halo) and opens a popover (236px, #111311, radius 14, padding 14). The popover shows "#N NAME", "3PT · 26 ft" in #4FBF7A, MADE (green) / MISSED (outlined) buttons of height 48, and Cancel. Below the court in 2a is the **opponent team-only bar** (#111311, radius 14) with +2, +3, +1 FT, MISS, FT MISS, TOV, FOUL and T.OUT buttons (height 48).
  - **Right 300px:** quick-log pad. Shots are on a 2-column grid (height 56): made buttons are #1E7A46 (FT made #145532), miss buttons are white with a 1.5px #CFC5B5 border. Other events are on a 3-column grid (height 52): OREB, DREB, AST, STL, BLK and TOV use #E4DCCF; FOUL, SUB and TIMEOUT use #111311. While a play is in progress, the pad is replaced by the **chain panel**: #111311, radius 16, padding 18. It shows "CHAINED PLAY · STEP N" (11px, #4FBF7A, letter-spacing .1em), ✓ lines for the events logged so far, the question (Barlow Condensed 700 26px uppercase), a 2-column grid of option buttons (min height 50; home player green, away player white, neutral transparent with a #6B6862 border spanning both columns), and "Done — save play" / "Cancel play" buttons.
- **Footer** (height 60, white): "LAST PLAYS" chips (#F3EEE5, radius 10). Each chip shows a team dot, the clock and a play summary ("Okafor makes 3PT (26 ft) · fast break → Assist: Reyes").

### Phone tracker (390×844), 1c
The score header is compact (36px scores), with a wood strip underneath. Then: team toggle → "1 · PLAYER" grid of 5 tiles (height 64) → "2 · EVENT" 3-column grid (+2 / +3 / +1 FT, misses, OREB…TIMEOUT) → last-play toast with UNDO. The chain panel opens as a bottom sheet (top 150px, radius 24 on the top corners).

### Website pages (1280 wide), 1a / 1e / 1f / 1g
- **Site header:** height 64, #111311. Logo is a "BL" monogram (30px, radius 8, #1E7A46) plus "BASKET LOG" (Barlow Condensed 800 italic 23px, with "LOG" in #4FBF7A). Nav pills: active is white with ink text, inactive is #B9B4AA. Search pill (#242624) and avatar on the right.
- **1a:** "GAME NIGHT" heading (Barlow Condensed 800 italic 64px), a 7-day date strip (58×66 tiles), filter chips, and groups for Live now / Final / Upcoming. Game cards sit on a 3-column grid with radius 14; live cards have a 6px hardwood strip on top.
- **1e:** hardwood banner with both teams, scores (76px) and a white line-score card; a tab row; one table per team. The team header bar uses the team colour. Columns are PLAYER | MIN PTS FG 3PT FT REB AST STL BLK TO PF +/−, with starters, a BENCH divider and a totals row.
- **1f:** 260px filter column, then the court, then a 300px column of zone cards (Paint, Mid-range, Corner 3, Above-break 3) showing FG% and a bar.
- **1g:** hardwood hero with 150px scores, headline and standfirst, score-flow chart (green above zero = home lead, ink below = away lead), team comparison split bars, top performers and a dark key-moments card.

### Phone viewer, 1d / 1h
- **1d:** live header, tabs (Plays / Box / Shots / Leaders), quarter chips, then the feed. Each row is a 44px clock | 4px team bar | title and detail | score; scoring rows are bold with a "+N" tag (#E2EFE6 / #145532).
- **1h:** green header with a photo placeholder, number, name and game line; a dark row with PTS/REB/AST (48px); split cards with bars; a mini court; the player's plays.

### New game wizard (tablet 1180×820), 4a
- Grid of a 260px dark rail and the content area. The rail has the wordmark, "NEW GAME" (Barlow Condensed 800 italic 36px) and 4 step buttons (34px circle: green when active or done, ✓ when done). The active step is white with ink text.
- The content area is padded 30/36 with a 40px italic title and a 15px muted subtitle. The footer (76px, white) has Back (outlined), a status note, and Next (ink) or **START GAME** (green; grey #CFC5B5 while there are validation errors).
- **Matchup:** two columns of team cards (44px chip, 20px name, "City · N players"; selected card is ink with a ✓). Below them: Competition, Venue and Date inputs (44px high, 1.5px #E4DCCF border, radius 10).
- **Rules:** preset segmented control (FIBA/NBA/Youth/Custom). "Game format" is a 2-column grid of stepper cards (label 12px, −/+ buttons 38px #EFE9DF, value Barlow Condensed 800 30px with a unit). "Timeouts" has a mode segmented control and stepper cards. "Scorekeeper questions" has toggle rows (44×24 switch, green when on). "Tracking detail" has a Full detail / Team only control per team. Changing any rule value sets the preset to Custom.
- **Lineups:** per team, a header with the chip, name and an "N / 5 starters" pill (green tint when complete), then a 3-column grid of player tiles (60px: number 24px plus first and last name). A selected tile uses the team colour.
- **Review:** a matchup card plus a bulleted rules summary, starters per team with the tracking mode, a recommended-tracker note, and a "Fix before starting" list.

### Teams (desktop 1280), 4b
- Grid of a 300px team list and an editor card. The team list uses the same card style as the Matchup step, plus a dashed "+ New team" button.
- Editor: a 64px colour chip, then Team name / Short code (uppercase, max 4) / City inputs, and colour swatches (30px circles; the selected one has a double ring).
- Roster grid with columns `76px | first | last | short name | 150px position | 40px ×`. The **Short name** column has a green tint (#E2EFE6, #1E7A46 border, Barlow Condensed 700 uppercase) and is what the trackers show. It can repeat across players and defaults to the last name. A duplicate jersey number gets an ink border. Position is a G/F/C segmented control; tapping the selected one clears it. The add row has dashed inputs and "+ ADD PLAYER" (green when valid).

## Interactions & behaviour (play chains)
```
2PT/3PT made   → "Was it a fast break?" → "Assisted by?" (4 teammates | No assist)
2PT/3PT missed → "Was it a fast break?" → "Was it blocked?" (5 opponents | Not blocked) → "Who got the rebound?" (10 players | team rebound ×2 | Skip)
FT missed on the last attempt → rebound question
Turnover → "Stolen by?" (opponents | No steal)
Foul → clock STOPS → "Who was fouled?" → "Free throws?" (1 / 2 / 3 / none) → FT i of N made/missed → a miss on the last goes to rebound
Sub → "Who comes in for X?" (bench, with PTS/PF)
Timeout → clock stops
```
- **Team-only mode (2a):** away events are one tap with no player, location, fast break or assist. In chains, the away side appears as a single team option ("Benfica rebound", "Blocked by Benfica").
- **2PT/3PT detection from a court tap:** 3PT if y < 140 and (x < 30 or x > 470); otherwise 3PT if the distance from (250, 52.5) is more than 237.5. Feet = distance / 10.
- **Shot clock:** reset to 24 on a made shot, defensive rebound, turnover or steal; reset to 14 on an offensive rebound.
- **Undo** removes the whole last play (group). **Cancel play** removes the play in progress. **Done** keeps whatever has been answered so far.
- Every logged play updates the score, team fouls, player PTS/PF, the shot dots, the last-plays strip and the play-by-play feed live.

## State (prototype)
`events[]` (append-only, each with `g` = play group), `chain` (`{src, g, kind, ctx}` or null), `pending` (court tap), `clock`, `shot`, `running`, and the selected team and player per tracker. Everything else is derived by `derive()`.

## Design tokens
- **Colours:** green `#1E7A46` · green-dark `#145532` · green-light `#4FBF7A` · green-tint `#E2EFE6` · ink `#111311` · ink-2 `#242624` · ink-3 `#3A3C3A` · paper `#F3EEE5` · card `#FFFFFF` · line `#E4DCCF` · line-2 `#EFE9DF` · line-3 `#CFC5B5` · muted `#6B6862` · muted-on-dark `#B9B4AA` · wood `#D9A66B` · wood-shadow `#B98A52` · wood-text `#3B2610` · loser-score-on-wood `#5A3A1C`
- **Fonts:** Barlow Condensed (500–800, plus 700/800 italic) for numbers, headings and buttons; Barlow (400–700) for UI text. Both are Google Fonts.
- **Radius:** 5–6 (badges), 8–10 (small buttons), 12 (buttons and cards), 14 (cards and court), 16 (panels), 24 (tablet frame), 999 (pills).
- **Spacing:** 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28 / 32 / 40 / 48.
- **Hardwood:** base #D9A66B; plank lines are a 0° repeating gradient with 1px rgba(110,62,22,.22) every 22px, plus a soft 90° banding.
- **Court:** viewBox 500×470. Paint rect (170, 0, 160×190) filled #1E7A46 at .9 opacity; white lines 2.5px; free-throw circle r60 at (250, 190); restricted arc r40; 3PT corners at x = 30 / 470 up to y = 140, then an arc of r237.5; rim r7.5 at (250, 52.5); backboard from (220, 40) to (280, 40); half-court arc r60 at y = 470. Made shot: filled circle (r7.5) in the team colour with a 2px white stroke. Missed shot: hollow circle (r6) with a 2.5px team-colour stroke.

## Assets
No external images. Player photos and logos are placeholders; the real ones come from the database (`photo_url`, `logo_url`).

## Screenshots
See `screenshots/`: one PNG per screen id, plus states (`1b-chain-*`, `4a-step*`).

## Files
- `Basket Log Mockups.dc.html`: all screens, plus the working tracker logic.
- `Court.dc.html`: court SVG component.
- `SiteHeader.dc.html`: website header.
- `support.js`: runtime needed to open the .dc.html files.
- `IMPLEMENTATION_PLAN.md`: architecture, data model, roadmap and Claude Code prompts.
