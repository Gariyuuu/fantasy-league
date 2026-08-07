# FEATURES.md

Status classifications used below: **Verified complete**, **Mostly complete**, **Partially implemented**, **UI only**, **Backend only**, **Mocked**, **Planned**, **Broken**, **Deprecated**, **Unable to verify**. A feature is only "Verified complete" if its full flow (UI → store → engine → persistence, where applicable) was traced through the code, not just because files with a plausible name exist.

---

## League creation

**Purpose**: Let the user pick a sport, name their league/team, choose a scoring preset and AI difficulty, and start an 8-team league (1 human + 7 AI).

**User flow**: Home → "+ New League" → Create League form → pick sport (only in-season sports are selectable, others show "Opens <date>") → submit → routed to the draft room (or straight to the season dashboard for no-draft sports).

**Status**: **Verified complete.**

- Frontend: `src/pages/CreateLeaguePage.tsx`
- "Backend" (engine): `useLeagueStore.createLeague()` → `LEAGUE_CREATE` action → `handleLeagueCreate` in `engine/reducer.ts`
- Data dependencies: `getSportConfig()`, `SeedDataProvider.getPlayers()` (throws if fixtures aren't registered for the chosen sport — not currently reachable for any of the 10 registered sports)
- Persistence: `storage.save()` immediately after creation
- Validation: HTML5 `required` on name fields only; no server-side validation (none needed/possible — no server)
- Error states: none surfaced to the user if `getPlayers`/`getSportConfig` throw — would currently manifest as a stuck "Creating…" button state (see `CLAUDE.md` known issue #3)
- Loading states: `isCreating` boolean disables the submit button and shows "Creating…"
- Edge cases handled: sport selectability is real-calendar-gated (see "Real-calendar season gating" below); default selected sport is dynamically the first in-season sport, falling back to `'nfl'` if none are in season
- Tests: none directly (no UI tests exist at all — see `TESTING.md`)

## Draft room (snake draft)

**Purpose**: For `headToHead` and `rollingPoints` sports, run a snake draft where the human picks against 7 AI managers with a per-pick countdown clock.

**User flow**: Draft room loads → "Start Draft" → snake draft proceeds turn-by-turn; on the human's turn, a 60-second (per-sport-configurable) clock counts down while they pick from a searchable/filterable best-available list; AI turns resolve automatically with a small cosmetic delay; on completion, routed toward the season dashboard.

**Status**: **Verified complete** for the 7 sports using this flow (NFL, CFB, EPL, MLB, WNBA, NBA, MLS).

- Frontend: `src/pages/DraftRoomPage.tsx`, `src/components/draft/*` (DraftClockBar, BestAvailableList, PickFeed, RosterGrid, PositionNeed)
- Store orchestration: `useLeagueStore.startDraft()` + module-level `runDraftLoop()`
- Engine: `engine/draft.ts` (order/turn math), `engine/valuation.ts` (AI pick logic), `AIManager.makeDraftPick`, `HumanManager.makeDraftPick`/`submitDraftPick`
- Autopick: if the human's clock expires, the reducer's `DRAFT_AUTOPICK` path picks the top-ranked available player automatically
- Edge cases handled: page-reload mid-draft resumes the loop (`loadLeague`'s check in `useLeagueStore.ts`); position-run panic and position-need "must fill now" logic prevent a team from finishing with zero kickers/defenses-equivalent
- Known bug fixed during this project (not currently present): position-filter tabs were hardcoded to NFL positions and silently broke for every other sport — fixed in `BestAvailableList.tsx`
- Tests: `src/engine/__tests__/draftFlow.test.ts` covers the underlying draft-order/pick mechanics at the engine level (not the UI)

## Event lobby (salary-cap field selection)

**Purpose**: For `salaryCapField` sports (PGA, Tennis, NASCAR — no persistent roster, no draft), let the user pick a fresh field of athletes each period under a salary cap.

**User flow**: League creation routes straight here (skips the draft room entirely) → "Set Field" → pick up to `fieldSize` athletes without exceeding `salaryCap` → "Save Field" → "Advance Event" from the season dashboard to score it.

**Status**: **Verified complete.**

- Frontend: `src/pages/EventLobbyPage.tsx`
- Engine: `engine/salaryCap.ts` (`buildSalaryCapLineup` — also used by the AI managers, `requiredSalaryCapDraws`)
- Copy is sport-aware via `FIELD_NOUN` in `sportMeta.ts` ("golfers"/"players"/"drivers") — this was a real bug (hardcoded "golfers" for all 3 salary-cap sports) fixed during the Tennis/NASCAR build-out.
- Tests: `src/engine/__tests__/pgaSalaryCap.test.ts`

## Lineup management

**Purpose**: For roster-based sports (not salary-cap), let the user assign their drafted players into starter/bench slots each period.

**Status**: **Verified complete.**

- Frontend: `src/pages/LineupPage.tsx`
- Engine: `engine/lineup.ts` (`buildOptimalLineup` for the default/AI suggestion, `expandSlotInstances`/`assignmentsFromLineup`/`lineupFromAssignments` for the UI's slot-instance model)
- Note (see `FILE_MAP.md`): the lineup UI dispatches `LINEUP_SET` directly through the store rather than through `HumanManager`'s pending-promise `setLineup`/`submitLineup` path — that path exists but is unused by this UI.
- Edge cases handled: a team that never touches the lineup editor for a given period carries forward its most recent prior lineup (`resolveLineupForPeriod` in `reducer.ts`), so standings/scoring are always meaningful.

## Season simulation / advancing periods

**Purpose**: The core game loop — resolve one period (week/day/event) of the season: process waivers, set AI lineups, generate stat lines, score everyone, update standings, and handle playoff/season-complete transitions.

**Status**: **Verified complete.**

- Frontend trigger: "Advance Week/Day/Event" button on `SeasonDashboardPage.tsx`/`EventLobbyPage.tsx`
- Store orchestration: `useLeagueStore.advanceWeek()` (the single largest method in the store — see `src/store/useLeagueStore.ts`)
- Engine: `handleAdvancePeriod` → `applyHeadToHeadPeriod` (engine A) or `applyCumulativePeriod` (engines B/C) in `reducer.ts`; `SeedDataProvider.generateStatLines` samples raw stats from projections via the seeded RNG
- Tests: `src/engine/__tests__/seasonSim.test.ts`, `mlbRollingPoints.test.ts`, `determinism.test.ts`

## Waivers (FAAB)

**Purpose**: Blind-bid free-agent pickups between periods, for roster-based non-playoff periods only.

**Status**: **Verified complete.**

- Frontend: `src/pages/WaiversPage.tsx`
- Engine: `engine/waivers.ts` (`processWaivers` — highest bid wins, `waiverPriority` breaks ties)
- Skipped entirely: during playoffs (rosters lock — see comment in `useLeagueStore.advanceWeek`), and for `salaryCapField` sports (no persistent roster to claim against)
- AI behavior: `AIManager.submitWaiverClaims` reacts to injured/inactive players and best-available-replacement value, bid sized by persona `waiverActivity`
- Tests: `src/engine/__tests__/waiversAndTrades.test.ts`

## Trades

**Purpose**: Human proposes a trade to one AI team; the AI evaluates it (accept / counter / decline) based on roster need/surplus and persona `tradeGreed`.

**Status**: **Mostly complete** — the human→AI direction is fully built and tested; **AI-initiated trades to the human do not exist** (not a bug — per the original spec, per `HumanManager.ts`'s own doc comment, this was never in scope for v1).

- Frontend: `src/pages/TradesPage.tsx`
- Engine: `engine/trades.ts` (`evaluateTrade`)
- Store: `proposeTrade()`, `acceptCounterOffer()`, shared `runTradeOffer()` helper
- Tests: `src/engine/__tests__/waiversAndTrades.test.ts`

## Playoffs

**Purpose**: For `headToHead` sports with a configured bracket (`config.playoffs`), seed a single-elimination bracket from final standings and advance it round-by-round.

**Status**: **Verified complete** for sports with `playoffs` configured (NFL, CFB, EPL). Sports on `rollingPoints`/`salaryCapField` engines have no bracket by design — the season simply ends and the standings/points leader is champion (`handlePlayoffsAdvance`'s no-bracket branch).

- Frontend: `src/components/season/PlayoffBracketView.tsx`
- Engine: `engine/playoffs.ts`
- Tests: `src/engine/__tests__/playoffs.test.ts`

## Real-calendar season gating

**Purpose**: On the Create League sport picker, automatically show a sport as selectable ("In season now") or not ("Opens <date>") based on the real-world calendar, rather than a static "Coming soon" placeholder — added directly in response to a user request ("auto-open when that sport's season starts").

**Status**: **Verified complete.**

- Logic: `src/utils/seasonWindow.ts` (`isInSeasonNow`, `formatSeasonOpensLabel`), reading each `SportConfig.realSeasonWindow` (start/end ISO dates, independent of the in-app `season.startDate`/`totalPeriods` simulation pacing)
- Frontend: `src/pages/CreateLeaguePage.tsx`
- Edge case handled: windows crossing a calendar-year boundary (e.g. NFL Sep–Feb) via a `start <= end` branch check in `isInSeasonNow`
- Verified in-browser with a mocked system clock during the NBA addition (real NBA season hadn't started at test time) — confirmed the gate correctly locks/unlocks sports.
- Known limitation (documented, not a bug): the windows are single-year (2026-specific) ISO dates, not a recurring year-agnostic rule — will need a fresh look if the app is still in use across a full calendar-year rollover (see `ROADMAP.md`).

## Real player/athlete names

**Purpose**: Replace originally-fictional generated names with real 2026(-27) rosters/rankings across all 10 sports, per direct user request.

**Status**: **Verified complete** for all 10 sports, with a documented confidence gradient (each sport's research agent reported a rough high-confidence vs. best-guess split — see the relevant `scripts/data/*.json` sourcing and `DECISIONS.md`).

- Build-time only: `scripts/generate-<sport>-fixtures.mjs` + `scripts/data/<sport>-real-*.json`
- Fictional-name fallback: every generator falls back to a small deterministic fictional-name generator for any roster slot the real-data JSON doesn't cover
- Caution (see `CLAUDE.md` known issue #5): one research agent's free-text output (not the JSON data itself) contained a fabricated, false claim about a real NASCAR driver — caught and corrected before use, but a reminder to verify future agent-researched claims about real people.

## Real venue backgrounds

**Purpose**: A real photo of a stadium/arena/course/track per sport as the page background on every league-scoped page, replacing a flat gradient — per direct user request, sourced from Wikimedia Commons specifically (not arbitrary "Google Images") for licensing safety, a deliberate deviation from the literal request that was surfaced to the user rather than silently substituted.

**Status**: **Verified complete** for all 10 sports.

- Component: `src/components/LeagueBackdrop.tsx`
- Assets: `src/assets/backgrounds/*.jpg` (compressed to ~80-250KB each via `sips`)
- Wired into: `DraftRoomPage`, `SeasonDashboardPage`, `LineupPage`, `WaiversPage`, `TradesPage`, `EventLobbyPage`. Deliberately NOT wired into `HomePage`/`CreateLeaguePage` (no single sport is in context there).

## Live scores ticker

**Purpose**: Show today's actual real-world scores for the league's sport, pulled from ESPN's public unofficial API, as read-only context alongside the (unrelated, still-local/simulated) fantasy season — per direct user request for "live scores," scoped deliberately to NOT replace the simulation engine (see `DECISIONS.md` for the reasoning, which was explicitly surfaced to the user).

**Status**: **Mostly complete** — works reliably for the 6 team-vs-team sports; degrades silently (renders nothing) for Tennis/NASCAR due to an ESPN CORS inconsistency confirmed in real-browser testing (PGA's live-browser CORS behavior is unverified — only tested via `curl`, which is not equivalent to a browser fetch).

- Component: `src/components/LiveScoresTicker.tsx`
- Logic: `src/utils/liveScores.ts`
- Wired into: `SeasonDashboardPage.tsx`, `EventLobbyPage.tsx`
- Refresh: every 60 seconds while mounted
- No tests (no network-mocked test exists for this integration — see `TESTING.md` gaps)

## AI manager personas

**Purpose**: 7 distinct, named AI opponents with different drafting/trading/waiver behavior, per spec requirement ("at least one that reaches for a favorite position, one strict best-player-available, one that panics on positional runs").

**Status**: **Verified complete.**

- Data: `src/managers/personas.ts` (`AI_PERSONAS` — Ice Callahan, Blitz Okafor, Ace Delgado, Gramps Renwick, Nova Sharpton, Rook Voss, Chaos Marchetti)
- Behavior wiring: `engine/valuation.ts` (draft picks), `engine/trades.ts` (trade evaluation), `AIManager.submitWaiverClaims` (waiver bidding)

## Commissioner undo

**Purpose**: Rebuild league state by replaying the action log minus its last entry — the deterministic-replay architecture's first real consumer.

**Status**: **Planned / implemented-but-unused.** `undoLastAction` exists in `engine/reducer.ts` and is exported, but **no UI button, store method, or any other caller invokes it anywhere in the codebase** (verified via `grep -r "undoLastAction" src/` returning only its own definition and the `ActionType` union's `COMMISSIONER_UNDO` entry, which also has no reducer case — `applyAction`'s `default` branch would throw if that action type were ever dispatched). Classify as: function exists, feature does not.

## Multiplayer

**Purpose**: The architecture's stated long-term direction — swap `Manager`/`StorageAdapter` implementations for remote/DB-backed ones.

**Status**: **Planned, 0% implemented.** No `RemoteManager`, no server entrypoint, no websocket code, no second `StorageAdapter` exists anywhere in the repository. This is documented intent (in `README.md` and this doc set), not partial code.
