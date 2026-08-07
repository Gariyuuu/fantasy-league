# CHANGELOG.md

No CHANGELOG.md existed before this documentation audit. The entries below for prior work are reconstructed from `git log` (commit hashes/dates/messages) — not from any pre-existing changelog — and are dated by commit date, not by any separately-recorded release date (none exist).

## [Unreleased] — CHECKPOINT-3 final transfer checkpoint — 2026-08-07

A further, independent verification pass (zero access to either prior checkpoint's conversation), requested as a "final transfer checkpoint" before handing the repo to a different Claude Code account.

**Fixed**:
- `README.md`'s stale sport table/prose (`TASKS.md` DOC-1) — corrected from "Three sports ship today" / "all five sport configs" to list all 10 sports and their real engines.
- Several docs (`CLAUDE.md`, `PROJECT_STATE.md`, `TASKS.md`, `HANDOFF.md`) still claimed the 17-file doc set was uncommitted; corrected to reflect that the user committed it (`004a4ec`) between CHECKPOINT-2 and this session.

**Verified, unchanged**: "10 sports built" (re-confirmed directly against `src/config/sports/*` and `src/fixtures/*`, not just doc prose), the live deploy (HTTP 200 from the production URL), `tsc -b`/tests (49/49)/`oxlint`, the SEC-1 react-router advisory (still open, unchanged), no secrets found anywhere in tracked files.

**No application behavior changed.** Only `.md` documentation files were edited.

---

## [2026-08-06] Documentation/handoff audit — commit `004a4ec`

A full repository audit was performed and a permanent documentation/memory system was created for this project, per an explicit user request to prepare for a clean account handoff. Committed by the user as `004a4ec` ("docs: add full handoff documentation system").

**Added**:
- `CLAUDE.md`, `PROJECT_STATE.md`, `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `CHANGELOG.md` (this file), `SESSION_LOG.md`, `HANDOFF.md` — 17 new files at the repository root.

**Significant problems discovered during the audit** (none required a code fix as part of this task — see `TASKS.md` for tracked follow-ups; the README item was later fixed in CHECKPOINT-3 above):
- `README.md` is stale — states "Three sports ship today," actually 10. **Fixed in CHECKPOINT-3 (2026-08-07), see above.**
- No `localStorage` schema migration path exists.
- No UI error boundary exists.
- No automated test coverage exists for any React component/page, or for `src/utils/seasonWindow.ts` / `src/utils/liveScores.ts`.
- ESPN live-scores CORS support is confirmed inconsistent across sports in real-browser testing (tennis/nascar fail; pga unverified) despite `curl` showing uniform header support.
- The `ActionType` union includes `COMMISSIONER_UNDO`, `COMMISSIONER_FORCE_LINEUP`, and `SCORING_EDIT`, none of which have a reducer handler or any UI — named in the type system, not implemented.
- `undoLastAction` (the reducer's replay-based undo function) exists but is never called anywhere in the app.
- `npm audit` (run during this audit's verification pass) found 2 open high-severity advisories in `react-router`/`react-router-dom` (CSRF bypass in RSC mode, GHSA-qwww-vcr4-c8h2) — likely low practical risk since this app doesn't use RSC mode, but real and previously undocumented. See `SECURITY.md` and `TASKS.md` SEC-1.

**No product behavior was intentionally changed as part of this task.** Only new `.md` documentation files were added; no `src/`, `scripts/`, or config file was modified.

---

## [2026-08-06] Add NBA as a 10th sport — commit `2fb2144`

**Added**: NBA (`rollingPoints` engine, matching WNBA's pattern), 30-team real 2026-27 roster research (`scripts/data/nba-real-rosters.json`), fixture generator (`scripts/generate-nba-fixtures.mjs`, 240 players), a real background photo (2006 NBA Finals, Wikimedia Commons), real-calendar season window (Oct 21 2026 – Jun 22 2027), ESPN live-scores mapping (`basketball/nba`).

## [2026-08-06] Add real live scores ticker — commit `00b033d`

**Added**: `LiveScoresTicker` component + `liveScores.ts` utility, pulling today's real scores from ESPN's unofficial API, wired into `SeasonDashboardPage` and `EventLobbyPage` for all sports registered at the time. Deliberately does not feed the simulation engine — see `DECISIONS.md` AD-009.

## [2026-08-05] Add 6 more sports + real-calendar season gating — commit `4894699`

**Added**: CFB, EPL (headToHead); WNBA, MLS (rollingPoints); Tennis, NASCAR (salaryCapField) — full configs, real-name research and fixtures for all 6, real venue backgrounds for all 6. Real-calendar `realSeasonWindow` field added to `SportConfig` and all 9 sports registered at the time; `src/utils/seasonWindow.ts` created; `CreateLeaguePage`'s sport picker changed from a static "Coming soon" placeholder to a real-time "In season now" / "Opens <date>" gate.

**Fixed**: two hardcoded-NFL-position bugs found via browser-testing the new sports — `BestAvailableList.tsx` and `WaiversPage.tsx` had position-filter tabs hardcoded to `['QB','RB','WR','TE','K','DST']` instead of deriving from `state.config.positions`, which silently broke position filtering for every non-NFL sport until fixed in this same commit.

## [2026-08-05] Add real venue photography backgrounds — commit `fb0abea`

**Added**: `LeagueBackdrop` component; real stadium/course photos (NFL, MLB, PGA — the 3 sports that existed at the time) sourced from Wikimedia Commons specifically (not general image search) for licensing safety, compressed via `sips`, wired into every league-scoped page.

## [2026-08-05] Bright sports-app redesign + real player names — commit `5430b12`

**Changed**: visual redesign from an earlier (not preserved in git history beyond this point) dark trading-terminal look to the current bright, ESPN/Yahoo-Fantasy/Sleeper-inspired design system (`.app-card`, `.btn-primary`, emerald/sky gradient accents) — see `DECISIONS.md` AD-006.

**Added**: real player names for the original 3 sports (NFL, MLB, PGA), replacing the fictional name generator as the primary source (fictional names remain as a fallback for uncovered roster slots) — see `DECISIONS.md` AD-008.

## [2026-08-05] Initial commit: multi-sport fantasy league app — commit `6b3d706`

**Added**: the full v1 application — `LeagueState`/`Action`/`Manager` type model, pure `applyAction` reducer, seeded RNG, three scoring engines (headToHead, rollingPoints, salaryCapField) with NFL/MLB/PGA as their respective first sports, `AIManager`/`HumanManager` with 7 AI personas, `LocalJsonStorageAdapter`/`SeedDataProvider`, full page set (Home, Create League, Draft Room, Lineup, Season Dashboard, Waivers, Trades, Event Lobby), and the initial 49-test Vitest suite.
