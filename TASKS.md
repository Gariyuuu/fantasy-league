# TASKS.md

Active execution queue. Update this file after every meaningful task (move items between sections, add new ones found along the way).

## Current task

**[CHECKPOINT-1] and [CHECKPOINT-2] are complete** (see `SESSION_LOG.md`). **[CHECKPOINT-3]**, a further-later session on 2026-08-07 with no access to either prior checkpoint's conversation, ran as a "final transfer checkpoint": re-verified repo state, independently re-confirmed the 10-sport claim and the live deploy, re-ran `tsc`/tests/lint/`npm audit`, ran a secrets grep, and fixed the one real staleness item both prior checkpoints had found and deliberately left open — README.md's stale sport count (`DOC-1`). It also corrected several docs (`CLAUDE.md`, `PROJECT_STATE.md`, `HANDOFF.md`, this file) that still claimed the 17-file doc set was uncommitted; the user committed it themselves (`004a4ec`) between CHECKPOINT-2 and this session. No other product code is in flight; this remains a documentation/verification-only task.

- **Exact objective**: final verification pass before handing this repo to a different Claude Code account: (1) re-verify `PROJECT_STATE.md`/`TASKS.md`/`FEATURES.md` against real code, specifically the "10 sports built" and "live deploy" claims; (2) record true git state; (3) scan for committed secrets; (4) resolve cross-file contradictions; (5) refresh the handoff prompt in `HANDOFF.md`; (6) commit as one scoped commit if anything changed.
- **What has already been completed** (this session): git state re-verified (`main`, clean, up to date with `origin`) → 10-sport claim independently re-confirmed via `src/config/sports/*.ts` (10 files) and `src/fixtures/*` (10 dirs) → live deploy confirmed via direct HTTP request (200) → `npx tsc -b`, `npm test` (49/49), `npx oxlint` (clean), `npm audit` (2 known high-severity advisories, unchanged) all re-run → secrets grep across all tracked files (clean) → README.md's stale sport table fixed → stale "uncommitted docs" claims corrected across `CLAUDE.md`/`PROJECT_STATE.md`/this file/`HANDOFF.md` → `SESSION_LOG.md` CHECKPOINT-3 entry appended → `HANDOFF.md`'s "Prompt for the next Claude Code account" section refreshed.
- **What remains**: nothing outstanding from this checkpoint's own scope. One scoped commit for this session's doc changes, per user instruction (not pushed).
- **Relevant files**: `README.md`, `CLAUDE.md`, `PROJECT_STATE.md`, `TASKS.md` (this file), `HANDOFF.md`, `SESSION_LOG.md`, `CHANGELOG.md` (none of `src/`/`scripts/`/config touched).
- **Known errors**: none. The two standing, already-documented findings are SEC-1 (react-router advisory, unchanged) and UX-2 (bundle size, unchanged) — see below.
- **Blockers**: none. The prior "whether to commit the 17 doc files" open item is resolved (user committed `004a4ec`).
- **Acceptance criteria**: (1) all doc files describe repo state identically (no contradictions); (2) `SESSION_LOG.md` has an entry for this checkpoint; (3) zero secrets/tokens/credentials appear in any doc or tracked file; (4) no `src/`/`scripts/`/config file was modified; (5) changes committed but not pushed.
- **Verification steps** (all performed, see `PROJECT_STATE.md`'s "Verification performed for this checkpoint"): `git status`/`git log`/`git fetch origin`; `src/config/sports/`+`src/fixtures/` sport-count spot-check; live-URL HTTP check; `tsc -b`/`npm test`/`oxlint`/`npm audit`; secrets grep across tracked files; full read-through of all 17 doc files for contradictions.

## Next up

Nothing is queued by explicit user request. See `ROADMAP.md` for candidate next steps if the user wants a recommendation, or `TASKS.md`'s own "High priority"/"Medium priority" sections below for the lowest-risk starting points (react-router advisory, storage versioning, error boundary).

## Blocked

None.

## High priority

- **[SEC-1] `react-router`/`react-router-dom` has 2 high-severity advisories** (GHSA-qwww-vcr4-c8h2, CSRF bypass in RSC mode), found via `npm audit` during this documentation audit's verification pass — see `SECURITY.md` → "Dependency concerns" for full detail. This app doesn't use RSC mode, so practical exposure is likely low, but this is a real, currently-open advisory against an installed package, not a hypothetical. `npm audit fix --force` would downgrade `react-router-dom` from `7.18.2` to `7.11.0` (a breaking change per npm's own flag) — **do not run this blindly**; first check whether a newer, non-downgrading patched version exists, and treat any dependency change here as a reviewed task on its own, not a drive-by fix. Files: `package.json`, `package-lock.json`. Still open as of CHECKPOINT-3 (2026-08-07) — `npm audit` re-run, identical result.
- ~~**[DOC-1] Correct README.md's stale sport count.**~~ **Done in CHECKPOINT-3 (2026-08-07).** README.md's sport table and prose now list all 10 sports and their real engines.

## Medium priority

- **[TECH-1] `localStorage` schema versioning.** No migration path exists if `LeagueState`'s shape changes breakingly. Files: `src/types.ts`, `src/storage/LocalJsonStorageAdapter.ts`. Acceptance: a `schemaVersion` field on the stored blob, and a migration function that runs on `readBlob()` for old versions (even if the initial migration set is empty/no-op). Dependencies: none. Notes: only becomes urgent if/when a breaking `LeagueState` change is made — no breaking change has been made yet (all sport-config additions so far have been additive).
- **[TECH-2] Add a UI error boundary.** No component catches an unexpected engine-level throw. Files: new `src/components/ErrorBoundary.tsx` (or similar), wired around `<App/>` or per-route. Acceptance: an engine throw during any store action shows a user-facing message instead of a silently-stuck UI. Dependencies: none.
- **[BUG-INVESTIGATE-1] Verify PGA's live-scores CORS behavior in-browser.** Tennis and NASCAR were confirmed (via Playwright/Chromium, not just `curl`) to fail CORS for the ESPN endpoint; PGA (`golf/pga`) was never tested the same way — only `curl`-verified, which doesn't reflect real browser CORS enforcement. Files: `src/utils/liveScores.ts` (no code change needed unless it also fails — just a verification gap). Acceptance: a real-browser test (mocked-clock, in-season, or PGA's real season window Jan–Sep) confirms whether the ticker actually renders for a PGA league.

## Low priority

- **[UX-1] `CreateLeaguePage`'s sport-picker grid has 10 items in a 3-column grid** (`grid-cols-3`), leaving the last row with a single lonely card (NASCAR, currently last in `ALL_SPORTS`). Purely cosmetic. Files: `src/pages/CreateLeaguePage.tsx`. Acceptance: a grid arrangement (e.g. `grid-cols-5` on wider screens, or reordering `ALL_SPORTS`) that doesn't leave an orphaned single card. Low priority — functional either way.
- **[UX-2] Bundle size.** `vite build` warns the main JS chunk exceeds Vite's 500kB advisory threshold (≈947kB uncompressed / ≈177kB gzipped as of the NBA build) due to bundling all 10 sports' fixture data. Files: `vite.config.ts` (would need `build.rolldownOptions.output.codeSplitting` or per-sport dynamic `import()` in `src/fixtures/index.ts`). Not currently causing any observed user-facing slowness — flagged because Vite itself surfaces the warning on every build and it will only grow.

## Bugs

None currently open. Two were found and fixed during the 10-sport build-out (see `CHANGELOG.md` and `DECISIONS.md` for detail — not re-listing here since they're resolved, not active):
- Hardcoded NFL position-filter tabs in `BestAvailableList.tsx` and `WaiversPage.tsx` (fixed).
- Hardcoded "golfers" copy in `EventLobbyPage.tsx` for all salary-cap sports (fixed).
- A fabricated claim by a research agent about a real NASCAR driver, caught before it reached shipped data (not a code bug, but recorded as a process risk — see `CLAUDE.md` known issue #5).

## Technical debt

See "Medium priority" (TECH-1, TECH-2) and "Low priority" (UX-2) above — all technical debt currently known is captured there, not duplicated here.

## Testing needed

- **No UI/component/integration tests exist at all** — only the engine layer (`src/engine/__tests__/`, `src/data/__tests__/`) is covered. Every page, every component, the live-scores ticker, and the season-gating utility have zero automated test coverage. See `TESTING.md` for the full gap analysis and a manual smoke-test checklist to use in the meantime.
- No test exists for `src/utils/seasonWindow.ts`'s year-boundary-crossing branch (NFL's Sep–Feb window) — it was reasoned through manually, not test-covered.
- No test exists for `src/utils/liveScores.ts`'s response normalization logic (the `matchups` vs. `leaderboard` branching, or defensive handling of a malformed/empty ESPN response).

## Documentation needed

This audit (the 17 files including this one) is intended to close the major documentation gap. Follow-up, lower-priority documentation ideas:
- A per-sport quick-reference table (engine type, roster shape, real season window) — currently that information is scattered across 10 separate config files; a single summary table would be convenient but isn't load-bearing (`FEATURES.md`/`FILE_MAP.md` describe the pattern, and any individual config file is short and self-explanatory).
- `.env.example` doesn't exist — not needed today (zero env vars), but should be created the moment a first one is ever added, per `CLAUDE.md`.

## Recently completed

(Most recent first — mirrors `git log` and `CHANGELOG.md`, kept brief here; see those for detail.)

1. [CHECKPOINT-2] Second, independent account-switch verification pass (documentation-only; zero drift found against CHECKPOINT-1's docs; see `SESSION_LOG.md`).
2. Add NBA as a 10th sport (commit `2fb2144`).
3. Add real live-scores ticker via ESPN API (commit `00b033d`).
4. Add 6 more sports (CFB, EPL, WNBA, MLS, Tennis, NASCAR) + real-calendar season gating (commit `4894699`).
5. Add real venue photography backgrounds per sport (commit `fb0abea`).
6. Bright sports-app redesign + real player names for the original 3 sports (commit `5430b12`).
7. Initial build: NFL/MLB/PGA, full engine, storage, managers (commit `6b3d706`).
8. [CHECKPOINT-1] documentation/handoff audit + first checkpoint pass (uncommitted at the time of writing — see `PROJECT_STATE.md`).

## Deferred

- **AI-initiated trades (AI proposes to human)** — explicitly out of scope per the original spec (per `HumanManager.ts`'s own doc comment), not a bug. Revisit only if the product direction changes.
- **Commissioner undo UI** — the engine function (`undoLastAction`) exists but nothing calls it. Deferred, not actively planned.

## Rejected ideas

- **Hotlinking arbitrary "Google Images" results for backgrounds** — the user's literal request, deliberately not done due to licensing/reliability risk; Wikimedia Commons was substituted instead, with the substitution explicitly surfaced to the user rather than silently done. See `DECISIONS.md`.
- **Replacing the simulation engine with real live sports data** — considered as the most literal reading of "add live scores," rejected as a much larger scope than reasonable for the request; a read-only real-scores widget was built instead, alongside the unchanged local simulation. See `DECISIONS.md`.
