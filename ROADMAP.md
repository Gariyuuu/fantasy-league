# ROADMAP.md

No dates/time-estimates exist anywhere in the repository's history for this project — none are invented here, per instruction. Priorities below are inferred from what's been built and what the codebase's own design headroom points toward, not from any stated plan.

## Current milestone

**All 10 sports live with real data, real backgrounds, real-calendar gating, and a real (read-only) live-scores widget.** This milestone is **complete** as of commit `2fb2144` (NBA addition) and the follow-up documentation audit. Every sport from the original concept plus one user-requested addition (NBA) is shipped and deployed.

## Next milestone

Not formally defined by the user. Candidate next milestone, inferred from the codebase's own stated design goals (`README.md` → "Adding multiplayer") and the open items in `TASKS.md`:

**Option A — Harden what exists** (lower risk, no new user-facing scope):
- `localStorage` schema versioning (TASKS.md TECH-1)
- UI error boundary (TASKS.md TECH-2)
- Close the testing gap for UI/pages (TESTING.md)
- Fix the stale README sport count (TASKS.md DOC-1)

**Option B — Multiplayer** (large, matches the architecture's stated purpose):
- Build `RemoteManager` implementing `Manager` via websocket
- Build a server entrypoint reusing `applyAction`/`createEmptyLeagueState` authoritatively
- Build a DB-backed `StorageAdapter`
- This is explicitly the test the current architecture was built to pass (see `README.md` and `DECISIONS.md`) — but is unstarted, and would be the single largest addition in the project's history so far (bigger than any of the 6 sport-build-out sessions).

No priority between A and B is set by the user — this is a genuine open decision, not a recommendation being made here.

## MVP completion

If "MVP" means "the original v1 spec" (NFL/MLB/PGA, three engines, full single-player season simulation with draft/lineups/waivers/trades/playoffs), **that was completed before this documentation audit's visibility window** (commit `6b3d706`, "Initial commit"). Everything since has been additive scope (more sports, cosmetic/UX requests, real data, live scores) on top of an already-complete MVP.

## Post-MVP (shipped)

- Bright sports-app visual redesign (commit `5430b12`)
- Real player/athlete names, all 10 sports
- Real venue background photography, all 10 sports
- Real-calendar season-window gating
- Real (ESPN-sourced) live-scores ticker
- 7 additional sports beyond the original 3 (CFB, EPL, WNBA, NBA, MLS, Tennis, NASCAR)

## Post-MVP (not shipped — candidate ideas, unranked)

- Multiplayer (see "Next milestone" Option B)
- Commissioner tools beyond undo — the `COMMISSIONER_FORCE_LINEUP` action type exists in `types.ts`'s `ActionType` union but **has no reducer handler** (would throw `applyAction`'s default case if ever dispatched) and no UI. Same status as `COMMISSIONER_UNDO`/`undoLastAction`: named in the type system, not implemented.
- `SCORING_EDIT` action type — also present in the `ActionType` union with no handler and no UI. The scoring engine (`scoreStatLine`) is deliberately built to make a scoring-preset edit "rescore every existing box score on read, with nothing to regenerate" (per its own doc comment) — meaning the *engine* is ready for this feature, but the *action/UI* to actually let a commissioner edit weights mid-season doesn't exist.
- A live-data-backed `DataProvider` (the seam is designed for it; genuinely swapping the simulation for real stats was explicitly considered and rejected for the current live-scores feature — see `DECISIONS.md` — but the seam remains available if priorities change)
- Combined ATP+WTA tennis data source for the live-scores ticker (currently ATP-only, `tennis/atp` — noted as a simplification in `src/utils/liveScores.ts`'s own comments/`FEATURES.md`)
- Mobile-responsive layout audit — no responsive-design issues were found in this audit, but no explicit mobile-breakpoint testing was performed either (see `UI_SYSTEM.md`)

## Long-term ideas

Speculative, not validated by any user request:
- Persisting leagues outside a single browser's `localStorage` (would require the DB-backed `StorageAdapter` from the multiplayer track, even for single-player use, if cross-device play is ever wanted)
- A "watch mode" / spectator view unrelated to the human-manager team
- Historical season archive/comparison across multiple completed leagues in the same browser

## Optional improvements

- Code-splitting per sport (TASKS.md UX-2) — would reduce initial bundle size but adds build complexity; not urgent given no reported user-facing performance issue.
- Grid-layout fix for the now-10-sport picker (TASKS.md UX-1) — trivial, cosmetic.

## Out of scope (explicitly, per prior decisions — see DECISIONS.md)

- Real-money betting/wagering of any kind — never requested, never built, would be a fundamentally different (and regulated) product.
- Replacing the local simulation engine with real live game stats feeding fantasy scoring — explicitly considered and rejected in favor of the current read-only live-scores widget (see `DECISIONS.md`).
- Scraping/hotlinking unlicensed images for backgrounds — explicitly rejected in favor of Wikimedia Commons (see `DECISIONS.md`).
