# HANDOFF.md

Short, high-signal onboarding for whoever (human or AI) picks this project up next with zero prior context.

## What is this project?

A solo-play, multi-sport (10 sports) fantasy sports simulator, built as a pure client-side React SPA with no backend. Create a league for any of NFL/CFB/EPL/MLB/WNBA/NBA/MLS/PGA/Tennis/NASCAR, draft (or pick a salary-cap field) against 7 distinctly-behaved AI managers, then play out a full season — lineups, waivers, trades, playoffs — with real player names and real venue backgrounds, plus a small widget showing today's actual real-world scores for context. Deployed and live at **https://fantasy-league-iota-six.vercel.app**.

## What should I read first?

In this order:
1. **This file**, to orient.
2. **`CLAUDE.md`** — the full operating manual (tech stack, commands, conventions, "do not change without review" list, known issues).
3. **`PROJECT_STATE.md`** — the exact point development stopped.
4. **`TASKS.md`** — the active queue, if there's specific work to pick up.
5. Whichever of `ARCHITECTURE.md` / `FEATURES.md` / `FILE_MAP.md` / `DATABASE.md` / `API_REFERENCE.md` / `UI_SYSTEM.md` / `SECURITY.md` / `TESTING.md` / `DEPLOYMENT.md` is relevant to the specific task at hand.
6. `DECISIONS.md` if you're wondering *why* something was built a certain way — it's a real decision log with reasoning, not just a feature list.
7. `SESSION_LOG.md` / `CHANGELOG.md` if you want the chronological story.

## What is the current task?

**`[CHECKPOINT-1]`, `[CHECKPOINT-2]`, and `[CHECKPOINT-3]` are all complete.** Three independent sessions, each with no access to the others' conversations, have now verified this repo's docs against the live code. CHECKPOINT-3 (2026-08-07, "final transfer checkpoint") found the docs accurate on everything except one previously-known, previously-deferred item — README.md's stale sport count — which it fixed, and one drift item — the docs still claimed the 17-file doc set was uncommitted, when in fact the user had committed it (`004a4ec`) between CHECKPOINT-2 and CHECKPOINT-3. Both are now resolved. In one line: this project's docs are verified accurate as of 2026-08-07, committed, and ready for a real account switch — no open confirmation items remain except genuine product/backlog decisions (see `TASKS.md`).

## What was the previous agent doing?

Three sessions total, each with no access to the others' conversations:

1. **CHECKPOINT-1 session (2026-08-06)**: (a) added NBA as the app's 10th sport (fully shipped, tested, deployed — commit `2fb2144`); (b) at the user's explicit request, paused all feature work and produced a full 17-file documentation/handoff audit from scratch, verified against the live repository (including running `npm audit`, which surfaced a real, previously-undocumented finding — see "What is broken?" below); (c) at the user's further explicit request, performed its own checkpoint pass on top of that audit.
2. **CHECKPOINT-2 session (2026-08-06)**: at the user's explicit request for a "final account-switch checkpoint," independently re-ran every verification CHECKPOINT-1 performed against the live repo with zero conversational memory of CHECKPOINT-1, and confirmed zero drift. Left the 17 doc files uncommitted, and the README fix undone, both by deliberate deferral pending user go-ahead.
3. **CHECKPOINT-3 session (2026-08-07, this one)**: user committed the 17 doc files themselves (`004a4ec`) sometime after CHECKPOINT-2. This session, with zero access to either prior conversation, re-verified repo state, independently re-confirmed the 10-sport claim by reading `src/config/sports/*` and `src/fixtures/*` directly (not trusting the docs' prose), confirmed the live deploy is real via a direct HTTP check, re-ran `tsc`/tests/lint/`npm audit`, ran a secrets grep across all tracked files, fixed README.md's stale sport table, corrected the now-stale "still uncommitted" claims across several docs, and refreshed this file's handoff prompt.

## What works right now?

Everything. Verified at the time of this handoff: `npx tsc -b` is silent (no type errors), `npm test` passes 49/49 tests across 8 files, `npm run build` succeeds. All 10 sports were browser-verified end-to-end (real names, correct position tabs, correct backgrounds, zero console errors) during their respective build sessions. The app is live and deployed at the production URL above.

## What is broken?

**Nothing is currently broken.** There are known *gaps and risks* (not active breakage) — see `CLAUDE.md` → "Known issues" and `TASKS.md` for the full, current list. Highlights:
- **`react-router`/`react-router-dom` has 2 open high-severity advisories** (CSRF bypass in RSC mode, GHSA-qwww-vcr4-c8h2) — found via `npm audit` during the documentation audit. This app doesn't use RSC mode, so real-world exposure looks low, but it's a genuine, currently-unpatched advisory against the installed version. `npm audit fix --force` would *downgrade* the package (breaking change, per npm's own flag) — don't run it without review. See `SECURITY.md` and `TASKS.md` SEC-1.
- No `localStorage` schema migration path (a future breaking type change could corrupt existing users' saved leagues)
- No UI error boundary
- Zero automated test coverage for any React component/page (only the engine layer is tested)
- ESPN's live-scores API has inconsistent CORS support across sports (fails silently by design, so not user-visible breakage, but worth knowing)
- ~~`README.md`'s sport count is stale~~ **fixed in CHECKPOINT-3 (2026-08-07)**.

## What should I do next?

Depends entirely on what the user asks for. If they want a recommendation: `TASKS.md` → "High priority"/"Medium priority" lists the lowest-risk, highest-value cleanup items (the react-router advisory, storage versioning, error boundary). If they want new product features, `ROADMAP.md` lays out the two candidate directions (hardening what exists, vs. building the multiplayer track the architecture was designed for) without picking one for them — that's a genuine open product decision, not something to assume.

**If the user just asks you to continue building sports/features like the last several sessions did**: follow the exact recipe in `FILE_MAP.md` → "Add a sport" — it's been executed identically 7 times already and is well-proven.

## Exact point to resume from

There is no unfinished code work to resume, and no unfinished documentation work either — `[CHECKPOINT-1]`, `[CHECKPOINT-2]`, and `[CHECKPOINT-3]` are all complete as of this writing (check `TASKS.md` → "Current task" first if you want to double-check that hasn't changed since). There is genuinely nothing queued — go to "What should I do next?" above and either take a `TASKS.md` item or ask the user what they want.

If a *fourth* session ever needs to do another checkpoint pass, the pattern to follow is exactly what CHECKPOINT-3 did: re-run `git status`/`git log`/`git fetch origin`, independently re-confirm any headline claim (sport count, live deploy) directly against code/the live URL rather than trusting prior docs' prose, `npx tsc -b`, `npm test`, `npx oxlint`, `npm audit`, and a secrets grep across all tracked files — don't just trust the prior checkpoint's prose, confirm it against the live repo.

## What the new account must confirm with the user before proceeding

1. **What to do about the `react-router` security advisory** (see "What is broken?" above) — the fix npm suggests is a downgrade; confirm with the user whether that's acceptable, or whether to wait for/investigate a forward-compatible patch, before touching `package.json`.
2. Anything else that would normally warrant asking first per this project's own observed pattern (see `CLAUDE.md` → "User preferences observed") — when in doubt about scope, ask, the way every prior scope decision in this project's history was made.

(The two items CHECKPOINT-2 had left open — whether to commit the 17 doc files, and whether to fix the stale README — are both resolved as of CHECKPOINT-3: the user committed the docs, and this session fixed the README.)

## Which files are most important?

- `src/types.ts` — the entire data model.
- `src/engine/reducer.ts` — the only place state changes.
- `src/store/useLeagueStore.ts` — the orchestration layer every page goes through.
- `src/config/sports/*.ts` + `src/fixtures/*/players.ts` — where each sport's identity lives.

## Which areas are dangerous to modify?

See `CLAUDE.md` → "DO NOT CHANGE WITHOUT REVIEW" for the full list with reasoning. Short version: `types.ts`, `engine/reducer.ts`, `engine/rng.ts`, the `SportId` union + sport registry, the `localStorage` key constant, and any generated `src/fixtures/*/players.ts` file (hand-edits get silently overwritten by the next fixture regeneration).

## Which commands should I run first?

```bash
cd fantasy-league   # or wherever this repo is checked out
npm install
npx tsc -b          # confirm clean before touching anything
npm test            # confirm 49/49 passing before touching anything
git status           # confirm you know what's already changed/untracked
git log --oneline -10   # confirm you're looking at the commit you think you are
```

## How do I verify the app still works?

```bash
npx tsc -b && npm test && npm run build
```
All three must succeed (the build produces an advisory chunk-size warning — that's expected, not a failure, see `TASKS.md` UX-2). For anything touching `src/pages/`/`src/components/`/`src/utils/`, also do a manual browser pass — see `TESTING.md`'s smoke-test checklist. This project has no automated UI tests, so manual browser verification (screenshots + zero-console-errors check) is the established, expected verification method for UI changes, not an optional extra step.

---

## Prompt for the next Claude Code account

Copy-paste this to start the next session:

> Read `CLAUDE.md`, `PROJECT_STATE.md`, `TASKS.md`, and `HANDOFF.md` (this file) in full before doing anything else. Then read whichever of `ARCHITECTURE.md`, `FEATURES.md`, `FILE_MAP.md`, `DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, or `DEPLOYMENT.md` is relevant to what I'm about to ask you to do. Run `git status`, `git log --oneline -10`, and `git fetch origin` (read-only) to confirm the repository's actual current state matches what those files describe — if anything has drifted (a new commit exists that these docs don't reflect, or uncommitted changes are sitting there unexpectedly), tell me before proceeding, don't just silently trust the docs over the live repo. Do not assume "10 sports built" or "live at fantasy-league-iota-six.vercel.app" are still true just because the docs say so — spot-check both directly (`ls src/config/sports/` + `ls src/fixtures/`, and an HTTP request to the production URL) before repeating either claim to me. Then give me a short summary of your understanding of the project and its current state, flag anything in the documentation that looks stale or contradictory compared to what you actually find in the code, and ask me about the specific open item listed in `HANDOFF.md` → "What the new account must confirm with the user before proceeding" (the react-router advisory — the only one still open as of CHECKPOINT-3, 2026-08-07) before touching it. Once I confirm you've got it right, continue whatever I ask for without redoing work that `TASKS.md` → "Recently completed"/`CHANGELOG.md` already shows is done (all 10 sports, the live-scores ticker, the doc/handoff system, and the README sport-count fix are all done and committed — don't rebuild or re-fix any of them). Preserve the existing architecture (the config-driven sport pattern, the pure-reducer/seeded-RNG determinism model, the `Manager`/`DataProvider`/`StorageAdapter` interfaces) unless I explicitly ask you to change it — these are deliberate, well-reasoned choices (see `DECISIONS.md`), not accidents. Only commit if I explicitly ask you to, and never push without explicit instruction. When you're done with whatever I ask for, update `PROJECT_STATE.md`, `TASKS.md`, and append to `SESSION_LOG.md` before finishing, per the permanent rules in `CLAUDE.md`.
