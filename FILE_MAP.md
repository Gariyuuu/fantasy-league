# FILE_MAP.md

A practical map of files a future agent is likely to read or modify. Not exhaustive for trivial/generated files (all 10 sports' `src/fixtures/*/players.ts` and `scripts/data/*.json` follow one repeated pattern — see "Add a sport" below rather than a per-file entry for each).

## Core data model

**`src/types.ts`**
- Purpose: every domain type in the app (`LeagueState`, `Action`, `SportConfig`, `Player`, `Team`, `Manager`, etc.), heavily commented.
- Imported by: almost every other file in `src/`.
- Imports: nothing (leaf file, only type definitions).
- When to edit: adding a new field to an existing concept, or a genuinely new domain concept. Very rarely for day-to-day feature work — most new-sport work only touches `config/sports/`.
- Risk: **high**. Changing an existing field's shape ripples everywhere and can break already-saved `localStorage` leagues (no migration system — see `CLAUDE.md`).

## Engine (pure simulation logic, `src/engine/`)

**`reducer.ts`** — `applyAction(state, action) -> LeagueState`, the only place state changes. Imports the rest of `engine/*`. Edit only to add a new `Action` type's handler (extend, don't modify existing handlers casually — see `CLAUDE.md` "DO NOT CHANGE WITHOUT REVIEW"). High risk.

**`rng.ts`** — seeded RNG primitives (`createSeededRng`, `drawUniform`, `shuffle`, `standardNormal`). Imported by most other `engine/*` files and `useLeagueStore.ts`. Edit only with a very good reason — see `CLAUDE.md`. High risk.

**`draft.ts`** — snake draft order/turn math (`buildDraftOrder`, `roundForOverall`, `teamIdForOverall`, `isDraftComplete`, `draftRounds`). Used by `useLeagueStore.ts`, `AIManager.ts`, `HumanManager.ts`, and draft-room UI. Low-medium risk to extend, medium risk to change existing math (snake-draft correctness).

**`lineup.ts`** — greedy lineup-slot-assignment heuristic (`buildOptimalLineup`), plus UI-facing helpers (`expandSlotInstances`, `assignmentsFromLineup`, `lineupFromAssignments`) used by `LineupPage.tsx`. Medium risk.

**`salaryCap.ts`** — engine-C (salary-cap field) selection heuristic (`buildSalaryCapLineup`), with a documented anti-stranding safeguard (see in-file comment). Medium risk — the stranding-prevention logic is subtle; read the comment before changing.

**`schedule.ts`** — round-robin matchup pairing for engine A (`roundRobinRounds`, `matchupsForPeriod`). Low risk to extend, medium to change (pairing-fairness correctness).

**`scoring.ts`** — `scoreStatLine`: pure dot product of raw stats against a scoring preset's weight map. Tiny, stable, low risk.

**`standings.ts`** — `computeStandings` (head-to-head, win/loss/points) and `computeCumulativeStandings` (rolling-points/salary-cap leaderboard). Low-medium risk.

**`playoffs.ts`** — bracket seeding (`seedPlayoffBracket`), winner resolution (`matchWinner`), round advancement (`nextRoundPairings`, `buildBracketRound`), `regularSeasonWeeks`. Medium risk.

**`trades.ts`** — `evaluateTrade`: AI trade-offer evaluation (accept/counter/decline) driven by persona `tradeGreed` and roster need/surplus. Medium risk (behavioral, not structural).

**`waivers.ts`** — `processWaivers`: FAAB batch resolution (highest bid wins, `waiverPriority` breaks ties). Medium risk.

**`valuation.ts`** — player value ranking (`projectedPoints`, `rankAvailablePlayers`) and the AI "persona pick" algorithm (`choosePersonaPick`, `personaBaseValue`, `detectPositionRuns`, `unmetPositionNeeds`, `exclusivePositionMinimums`). Central to both drafting and lineup-setting AI behavior. Medium-high risk — many other files depend on its exact draw-count contract (`shortlistDrawCount`) staying in sync with what `choosePersonaPick` actually consumes.

**`__tests__/`** — the only tests in the repo. See `TESTING.md`.

## Managers (`src/managers/`)

**`AIManager.ts`** — implements `Manager` for the 7 AI opponents; draft picks, lineup-setting, trade responses, waiver claims, all driven by a `AIPersona` and the seeded RNG. Medium risk.

**`HumanManager.ts`** — implements `Manager` for the human player via a pending-promise pattern the UI resolves. Note: per its own doc comment, the *lineup* and *waiver* pending-promise paths (`setLineup`/`submitLineup`, `submitWaiverClaims`/`submitWaiverClaimsResponse`) are **not actually used by the current UI** (those pages dispatch store actions directly instead) — they exist to keep the `Manager` interface uniformly implemented for future use (e.g. tests, or a generic multi-manager orchestration). Only the *draft-pick* path (`makeDraftPick`/`submitDraftPick`) is live. Medium risk to change, since the draft loop's timing/cancellation logic depends on its exact behavior.

**`personas.ts`** — the 7 hardcoded `AIPersona` objects (name, avatar, aggression, riskTolerance, positionBias, tradeGreed, waiverActivity, runPanic) plus `createManagers()`/`managersFromPersonas()` factory functions. Low risk to tune persona numbers, medium risk to change the factory functions' contracts (used by `useLeagueStore.ts`).

## Sport configuration (`src/config/sports/`)

**`index.ts`** — the `sportConfigs` registry (`Partial<Record<SportId, SportConfig>>`) and `getSportConfig()`. Edit when adding/removing a sport. Low-medium risk (throws a clear error if a sport is requested with no registered config, rather than failing silently).

**`nfl.ts`, `cfb.ts`, `epl.ts`, `mlb.ts`, `wnba.ts`, `nba.ts`, `mls.ts`, `pga.ts`, `tennis.ts`, `nascar.ts`** — one `SportConfig` object each (id, label, engine, season pacing, `realSeasonWindow`, positions, roster slots, scoring presets, draft config, playoffs). Each is self-contained and low risk to edit in isolation — see "Add a sport" below for the full checklist when adding a new one.

## Fixtures (generated player data, `src/fixtures/`)

**`index.ts`** — imports every sport's `players.ts` once for its `registerFixtures()` side effect. Must be updated (one new `import './<sport>/players'` line) whenever a new sport's fixtures are generated, or `SeedDataProvider.getPlayers()` will throw for that sport at league-creation time.

**`<sport>/players.ts`** (10 files) — **generated, do not hand-edit.** Each starts with `// GENERATED FILE — do not edit by hand.` Regenerate via `node scripts/generate-<sport>-fixtures.mjs`.

## Data & storage seams (`src/data/`, `src/storage/`)

**`DataProvider.ts`** — the interface (`getPlayers`, `getProjection`, `generateStatLines`, `requiredDrawCount`). Edit only to change the interface's contract itself (high risk, ripples to the one implementation and every caller).

**`SeedDataProvider.ts`** — the only `DataProvider` implementation; reads the fixture registry, samples stat lines from `{ mean, floor, ceiling }` projections via `standardNormal`. Medium risk.

**`StorageAdapter.ts`** — the interface (`save`, `load`, `list`, `delete`). High risk to change (same reasoning as `DataProvider.ts`).

**`LocalJsonStorageAdapter.ts`** — the only implementation; wraps a single `localStorage` JSON blob. **High risk** — see `CLAUDE.md` "DO NOT CHANGE WITHOUT REVIEW" re: the storage key constant.

## Store (`src/store/useLeagueStore.ts`)

The single Zustand store and the **only** place that orchestrates `Manager`s and dispatches `Action`s through `applyAction`. Every page reads/writes through this file. High risk — it's the integration point for almost everything else in the app; read it fully before changing any of its methods (`createLeague`, `loadLeague`, `startDraft`, `submitHumanPick`, `saveHumanLineup`, `advanceWeek`, `submitHumanWaiverClaim`, `proposeTrade`, `acceptCounterOffer`), plus the two module-level async helpers `runTradeOffer` and `runDraftLoop`.

## Pages (`src/pages/`)

One file per route (see `src/App.tsx` for the route table). Each follows the same pattern: read `leagueId` from `useParams`, `useEffect` to `loadLeague` if not already loaded, guard-render a loading state, then the real page wrapped in `<LeagueBackdrop sport={state.sport}>`. Low-medium risk individually; watch for **the hardcoded-NFL-positions bug class** (see `CLAUDE.md` "Repository structure") when touching any page that filters/lists players by position.

## Components (`src/components/`)

**`LeagueBackdrop.tsx`** — per-sport background photo wrapper. `SPORT_BACKGROUNDS` map must gain an entry whenever a new sport's background image is added (asset import + registry entry) — see "Add a sport" below.

**`LiveScoresTicker.tsx`** + **`src/utils/liveScores.ts`** — the ESPN live-scores widget. `ESPN_PATH` in `liveScores.ts` must gain an entry for any new sport (see "Add a sport" below), and `LEADERBOARD_SPORTS` must be updated if the new sport is an individual-athlete (not team-vs-team) sport.

**`sportMeta.ts`** — `SPORT_ICONS` (emoji per sport, must gain an entry for a new sport) and `FIELD_NOUN` (only used by `EventLobbyPage.tsx`'s copy for salary-cap sports — "golfers"/"players"/"drivers"), plus phase-badge styling helpers.

**`draft/BestAvailableList.tsx`, `pages/WaiversPage.tsx`** — both derive their position-filter tabs from `state.config.positions` (a `useMemo`). **This was a real, shipped bug for a while** (hardcoded to NFL's `['QB','RB','WR','TE','K','DST']`) — fixed during the 10-sport build-out. If you ever see a hardcoded position array outside `config/sports/`/`fixtures/`, it's very likely the same class of bug recurring.

## Scripts (`scripts/`, never imported by the shipped app)

**`generate-<sport>-fixtures.mjs`** (10 files) — Node ESM, run manually (`node scripts/generate-<sport>-fixtures.mjs`), reads `scripts/data/<sport>-real-*.json`, writes `src/fixtures/<sport>/players.ts`. Each uses a seeded `mulberry32` PRNG (its own, independent of the app's `engine/rng.ts` — these are build-time-only and never need to match the app's runtime determinism) to generate realistic-but-fake stat *projection ranges* (not actual game outcomes) per tier, with real names substituted in from the JSON data where available and a small fictional-name generator as fallback.

**`data/<sport>-real-*.json`** (10 files) — researched real player/athlete names, either team-keyed (`{ "ABBR": { "QB1": "Real Name", ... } }`, for the 7 team-based sports) or tier-keyed (`{ "elite": [...], "contender": [...], ... }`, for the 3 individual-athlete sports: PGA, Tennis, NASCAR).

## Where to make common changes

**Add a sport** (full checklist, mechanically repeated 7 times already for CFB/EPL/WNBA/MLS/Tennis/NASCAR/NBA):
1. Add the new `SportId` to the union in `src/types.ts`.
2. Write `src/config/sports/<sport>.ts` (copy the closest-matching existing sport's engine type as a template: `headToHead` → nfl.ts/cfb.ts/epl.ts; `rollingPoints` → mlb.ts/wnba.ts/nba.ts/mls.ts; `salaryCapField` → pga.ts/tennis.ts/nascar.ts). Set a real `realSeasonWindow` (real-world calendar dates, used only for the Create League gating UI — independent of the in-app `season.startDate`/`totalPeriods` pacing).
3. Register it in `src/config/sports/index.ts` (import + add to `sportConfigs`).
4. Add it to `ALL_SPORTS` in `src/pages/CreateLeaguePage.tsx`.
5. Add an emoji to `SPORT_ICONS` in `src/components/sportMeta.ts` (and `FIELD_NOUN` if it's a salary-cap sport).
6. Research real player/athlete names (a background agent doing web search was used for every sport so far — see `scripts/data/*.json` for the expected shape per engine type) and save to `scripts/data/<sport>-real-*.json`. **Spot-check any claims about real people beyond simple roster placement** — see `CLAUDE.md` known-issue #5.
7. Copy the closest-matching `scripts/generate-<sport>-fixtures.mjs` as a template, adjust team/tier tables and stat categories, run it (`node scripts/generate-<sport>-fixtures.mjs`) to produce `src/fixtures/<sport>/players.ts`.
8. Add `import './<sport>/players'` to `src/fixtures/index.ts`.
9. Source a real background photo (Wikimedia Commons — freely licensed only, per this project's explicit choice over unlicensed "Google Images" scraping — see `DECISIONS.md`), compress it (this project used `sips -Z 1280 -s formatOptions 45` to keep each under ~250KB), save to `src/assets/backgrounds/<sport>-<venue>.jpg`, import + register in `SPORT_BACKGROUNDS` in `src/components/LeagueBackdrop.tsx`.
10. Add an `ESPN_PATH` entry in `src/utils/liveScores.ts` (and add to `LEADERBOARD_SPORTS` if it's an individual-athlete sport) for the live-scores ticker.
11. Run `npx tsc -b`, `npm test`, `npm run build`; browser-verify the new sport's draft/event-lobby room shows real names, correct position tabs, and the new background.
12. Commit, push, `vercel --prod --yes`.

**Add a page/route**: add the component to `src/pages/`, add a `<Route>` in `src/App.tsx`, and (if it's league-scoped) follow the existing pages' pattern for loading league state and wrapping in `<LeagueBackdrop>`.

**Modify scoring**: edit the relevant sport's `scoringPresets` in `src/config/sports/<sport>.ts` — the engine (`scoreStatLine` in `engine/scoring.ts`) is a generic weighted dot product, so new stat categories just need a matching key in both a player's `projection` (fixtures) and the scoring preset's `weights`.

**Modify the design system**: `src/index.css` — no separate theme/token file exists (Tailwind v4, CSS-first config). See `UI_SYSTEM.md`.

**Add an environment variable**: none exist today (see `CLAUDE.md`). If ever needed, Vite's convention is `VITE_*`-prefixed vars accessed via `import.meta.env.VITE_*`, with a `.env.example` documenting them (create one — it doesn't exist yet).

**Change deployment settings**: `.vercel/project.json` links this directory to the Vercel project (`fantasy-league`, org `team_gofGt63nGGecSpDl9hBbsFWm`). No `vercel.json` exists — Vercel's zero-config Vite detection is relied on. See `DEPLOYMENT.md`.

**Modify "multiplayer" behavior**: doesn't exist yet — see `ARCHITECTURE.md` → "Server/client boundaries" and `README.md` → "Adding multiplayer" for the intended (unbuilt) path.

**Change permissions**: not applicable — no auth/roles system exists.
