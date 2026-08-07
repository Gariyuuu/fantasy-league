# TESTING.md

## Test framework

**Vitest** `^4.1.10`. Run with `npm test` (alias for `vitest run` — a single non-watch run; there is no separate `test:watch` script, run `npx vitest` directly for watch mode). No React Testing Library, no Playwright/Cypress dependency in `package.json` — **no UI/component/E2E test infrastructure exists in the repository at all.**

## Test directory structure

```
src/engine/__tests__/
  determinism.test.ts
  draftFlow.test.ts
  mlbRollingPoints.test.ts
  pgaSalaryCap.test.ts
  playoffs.test.ts
  seasonSim.test.ts
  waiversAndTrades.test.ts
  testHelpers.ts        (not a test file itself — shared setup: a minimal stub SportConfig and a full-league builder used by the other 7 files)
src/data/__tests__/
  nflFixtures.test.ts
```

**8 test files total, 49 tests total** (verified by running `npm test` at the time of this audit — see "Verification performed" in the handoff report). All 49 pass.

## What's actually tested (verified by reading every test file, not inferred from filenames)

### `determinism.test.ts` — seeded RNG, reducer
- Seeded RNG is deterministic for a given seed
- RNG values land in `[0, 1)`
- Fast-forwarding a generator to a cursor matches continuing a running one
- `LEAGUE_CREATE` moves an empty state to `predraft` and logs the action
- Replaying the same action log from the same seed yields identical state
- `applyAction` throws for action types with no handler yet (i.e., confirms `COMMISSIONER_UNDO`/`COMMISSIONER_FORCE_LINEUP`/`SCORING_EDIT` are genuinely unimplemented — see `FEATURES.md`)

### `draftFlow.test.ts` — full draft simulation (NFL fixture, headToHead engine)
- Completes with the correct pick count, no duplicate players
- Every team ends with a full 15-player roster
- Snake order alternates correctly between rounds 1 and 2
- Fully deterministic for a given seed; produces a different draft for a different seed
- The WR-biased persona (Ace Delgado) drafts relatively more WRs than the RB-biased persona (Gramps Renwick) — a behavioral/persona-distinctiveness test, not just a mechanics test

### `mlbRollingPoints.test.ts` — MLB (`rollingPoints` engine)
- Drafts a full 16-player roster per team, no league-wide duplicates
- Creates zero head-to-head matchups (pure cumulative accumulation)
- Each team's points accumulate day-over-day matching the sum of that day's lineup score
- Standings rank purely by cumulative points, no win/loss/tie record
- No playoff bracket — season ends with the points leader as champion
- Fully deterministic across two identical-seed full-season runs

### `pgaSalaryCap.test.ts` — PGA (`salaryCapField` engine)
- Skips the draft entirely — league creation opens straight to event 1
- Every AI team picks exactly a full field under the salary cap for event 1
- Zero head-to-head matchups — pure event-by-event leaderboard
- Plays through every event, crowns the cumulative leader, no bracket
- Fully deterministic across two identical-seed full-season runs

### `playoffs.test.ts`
- Seeds a 4-team bracket as 1v4/2v3 from final regular-season standings
- Standings freeze once the bracket starts, but `currentPeriod` and playoff box scores keep advancing
- Eliminated (non-bracket) teams never appear in a playoff-period matchup
- Plays through the full bracket to a single champion, marks the league complete
- Fully deterministic across two identical-seed full-season runs, including the champion

### `seasonSim.test.ts`
- Every AI team gets a full lineup immediately after the draft (week-1 default)
- Gracefully handles a roster missing a required position by leaving that slot unfilled, not crashing
- Produces a valid weekly schedule: every team plays exactly once, nobody plays itself
- Scores a matchup as the sum of `scoreStatLine` over starters only, excluding bench
- Recomputes standings so total wins across the league equals total games played
- Carries forward the prior week's lineup when a team never sets one for the new period
- Fully deterministic across two identical-seed multi-week runs

### `waiversAndTrades.test.ts`
- Waivers: contested player awarded to the higher bid, FAAB deducted; tied bid broken by `waiverPriority`; waiver resolution consumes zero RNG (deterministic from recorded bids alone); resubmitting a claim replaces rather than stacks; `AIManager` reacts to an injured rostered player by claiming a healthy replacement
- Trades: AI accepts a trade that clearly fills a need at strong value; AI declines a trade that's clearly bad value; a countered trade asks for a sweetener while keeping the AI's side unchanged; `TRADE_EXECUTE` swaps rosters both ways with no duplicate/lost players league-wide

### `nflFixtures.test.ts` (the one `src/data/__tests__/` file)
- Loads a full, realistic-sized player pool
- Covers every roster-eligible position with enough depth for an 8-team league
- No duplicate player ids or names
- Generates deterministic stat lines from the same seed/cursor
- Scores QB stat lines differently under standard vs. PPR for a receiving player

**Note**: this is the only sport with a dedicated fixture-integrity test. The other 9 sports' fixtures (CFB, EPL, MLB, WNBA, NBA, MLS, PGA, Tennis, NASCAR) have **no equivalent automated test** — their correctness was verified manually via browser testing during development (screenshots, console-error checks), not via an automated assertion. This is a real, if low-severity (the generator scripts are structurally identical, just data-swapped), coverage gap.

## Missing test areas (critical untested flows)

1. **All of `src/pages/*` and `src/components/*`** — zero component tests, zero rendering tests, zero interaction tests (clicking, form submission). Every UI verification in this project's history was manual/ad-hoc Playwright scripting during development sessions, not committed as a repeatable test suite.
2. **`src/store/useLeagueStore.ts`** — the orchestration layer itself (the store's methods, `runDraftLoop`, `runTradeOffer`) has no direct test; it's only exercised indirectly through the engine tests calling the underlying engine functions directly, bypassing the store.
3. **`src/utils/seasonWindow.ts`** — no test exists, including for its trickiest branch (a real-season window crossing a calendar-year boundary, e.g. NFL's Sep–Feb).
4. **`src/utils/liveScores.ts` / `LiveScoresTicker`** — no test exists for response normalization, error handling, or the two-shape (`matchups` vs `leaderboard`) branching. No network mocking (`msw` or similar) is set up in the project at all.
5. **9 of 10 sports' fixture generators** — see `nflFixtures.test.ts` note above.
6. **`HumanManager`'s unused pending-promise paths** (`setLineup`/`submitLineup`, `submitWaiverClaims`/`submitWaiverClaimsResponse`) — not exercised by any test since the current UI doesn't call them either.
7. **Commissioner actions** (`COMMISSIONER_UNDO`, `COMMISSIONER_FORCE_LINEUP`, `SCORING_EDIT`) — only indirectly tested (confirmed to correctly throw as unimplemented), never tested as working features, because they aren't implemented.

## Manual testing procedures used historically (not automated, not committed as scripts)

Per this project's development history: after any UI-affecting change, a Vite dev server was started, and an ad-hoc Playwright script (written fresh each time, saved only to a scratch/temp directory, never committed to the repo) drove the browser through the affected flow, took screenshots, and checked `console.error`/`pageerror` events were empty. This is a real, repeatable-in-spirit but not repeatable-in-practice (nothing is saved) verification method — a future agent inheriting this project should expect to do the same (write a throwaway Playwright script, don't expect one to already exist) until a real test suite is built.

## Test data / fixtures / mocks

No mocking library is used (`vi.mock` from Vitest is available but not observed in use in these test files — they exercise real engine code end-to-end, not mocked units). `testHelpers.ts` provides a hand-built minimal `SportConfig` stub and a `buildLeague`-style helper (used across all 7 engine test files) rather than going through the full `createLeague` store flow — tests call `applyAction` and engine functions directly.

## Test environment variables

None (no env vars exist in the project at all).

## Known flaky tests

None identified — all 49 tests passed consistently across every run performed during this project's history (including immediately before this documentation audit).

## Pre-deployment / pre-release checklist (recommended, not formally documented elsewhere in the repo before this file)

1. `npx tsc -b` — must be silent (no output = success, given `noEmit: true`)
2. `npm test` — expect `8 passed (8)` files, `49 passed (49)` tests
3. `npm run build` — must succeed; note the advisory chunk-size warning is expected/known (see `TASKS.md` UX-2), not a failure
4. Manual smoke test (see checklist below) if any `src/pages/`, `src/components/`, or `src/utils/` file changed
5. `vercel --prod --yes` only after 1-4 pass

## Manual smoke-test checklist (recommended for any UI-affecting change)

- [ ] Home page loads, shows empty state or existing league list correctly
- [ ] Create League: sport picker correctly shows "In season now" vs. "Opens <date>" per sport (verify against today's real date and each sport's `realSeasonWindow`)
- [ ] Create a league for at least one `headToHead` sport (e.g. NFL/CFB/EPL) → draft room loads, shows real player names, correct position tabs (not NFL's tabs on a non-NFL sport — this exact bug happened once, see `DECISIONS.md` AD-004), correct sport background
- [ ] Complete or partially complete a draft → verify pick feed, roster grid update live
- [ ] Create a league for a `rollingPoints` sport (e.g. MLB/WNBA/NBA/MLS) → same checks, plus confirm no head-to-head matchup UI appears
- [ ] Create a league for a `salaryCapField` sport (PGA/Tennis/NASCAR) → confirm it skips straight to the season dashboard (no draft room), "Set Field" flow works, correct field-noun copy ("golfers"/"players"/"drivers")
- [ ] Advance a week/day/event → standings update, no console errors
- [ ] Submit a waiver claim (roster-based sport only) → appears as pending, resolves on next advance
- [ ] Propose a trade → AI responds (accept/counter/decline) with a plausible reason
- [ ] `LiveScoresTicker` renders (or gracefully renders nothing) with zero console errors on the season dashboard for at least one team-sport league currently in its real season
- [ ] Reload the page mid-draft → draft loop resumes correctly (not stuck)
- [ ] Check browser console for any errors across all of the above — zero tolerance, per this project's established verification standard
