# DECISIONS.md — Architectural Decision Log

Decisions are numbered sequentially. Each is marked **Verified** (confirmed from code/comments/commit history) or **Inferred** (reconstructed from evidence, not from an explicit stated rationale found in the repo). No developer's original reasoning is fabricated — where reasoning isn't directly evidenced, that's stated.

---

### AD-001: Three-engine model instead of one generic scoring engine per sport

- **Status**: Accepted, foundational, unchanged since initial commit.
- **Context**: Different sports need genuinely different game-loop shapes — head-to-head weekly matchups (NFL-style), cumulative daily/rolling leaderboards (MLB-style), and no-draft salary-cap field selection (PGA-style) are not variations of one loop, they're three loops.
- **Decision**: Define exactly three `EngineType`s (`headToHead`, `rollingPoints`, `salaryCapField`) in `types.ts`, and make every sport a `SportConfig` that picks one. `reducer.ts`'s period-advance logic branches on `config.engine`, not on `config.id`.
- **Reasoning**: Verified from `README.md` ("Adding a sport" section) and consistent code structure — adding a sport on an existing engine requires zero engine code changes (proven 7 times: CFB/EPL reused engine A, WNBA/NBA/MLS reused engine B, Tennis/NASCAR reused engine C).
- **Alternatives considered**: Not documented in the repo. A plausible alternative (one fully generic "simulation loop" configurable by many small flags) would likely have been harder to reason about and test — but this is inferred, not evidenced.
- **Consequences**: Adding a 4th genuinely-new game-loop shape (something that's neither weekly-opponent, nor cumulative-no-opponent, nor draft-less-field) would require real engine work, same as `salaryCapField` did originally (per `README.md`: "salaryCapField needed real engine work once ... any future salary-cap sport gets it for free"). No such 4th shape has been needed for any of the 10 sports built so far.
- **Affected files**: `src/types.ts` (`EngineType`), `src/engine/reducer.ts`, every `src/config/sports/*.ts`.
- **Verified**: Yes.

---

### AD-002: `applyAction(state, action) -> LeagueState` as the sole state-mutation point, with a seeded, cursor-addressed RNG

- **Status**: Accepted, foundational, unchanged.
- **Context**: A season involves a lot of randomness (draft order, AI pick noise, stat-line generation) and the codebase's own comments state a goal of full replayability (for undo, debugging, and future server-authoritative multiplayer).
- **Decision**: Every state change is a pure reducer call on a serializable `Action`; every random draw comes from `createSeededRng(league.seed, cursor)`, and each action records exactly how many draws it consumed so the cursor never drifts on replay.
- **Reasoning**: Verified directly from doc comments in `reducer.ts` and `rng.ts` ("this is what makes the action log replayable and what will let v2 run the identical function server-side"). This is the single most load-bearing architectural choice in the codebase — nearly every other design decision below serves it.
- **Alternatives considered**: Not documented. A mutable-state-with-a-mutex-lock model (typical of many simpler simulators) would not support replay/undo/multiplayer the same way — inferred trade-off, not evidenced.
- **Consequences**: Any code path that calls `Math.random()` or `Date.now()` directly inside a reducer handler (instead of receiving it via the action payload or RNG cursor) would silently break determinism. Verified via inspection: no reducer handler does this — timestamps come from `action.timestamp`, all randomness comes from `drawUniform`/RNG cursor threading.
- **Affected files**: `src/engine/reducer.ts`, `src/engine/rng.ts`, every engine file that consumes RNG draws (`draft.ts`, `valuation.ts`, `lineup.ts`, `salaryCap.ts`), `src/store/useLeagueStore.ts` (the orchestration layer that sources draws from the league's cursor before calling engine functions).
- **Verified**: Yes.

---

### AD-003: `Manager` interface unifying human and AI control flow

- **Status**: Accepted, foundational, unchanged.
- **Context**: The draft loop, lineup-setting, trade response, and waiver-claim flows all need to treat "ask the human" and "ask an AI" identically from the orchestrator's point of view.
- **Decision**: One `Manager` interface (`makeDraftPick`, `setLineup`, `respondToTrade`, `submitWaiverClaims`), two implementations: `AIManager` (synchronous local logic wrapped in a resolved promise) and `HumanManager` (a genuinely pending promise the UI resolves later).
- **Reasoning**: Verified from `HumanManager.ts`'s own doc comment: "In v2, RemoteManager will resolve the same way from a websocket message — this is the seam that makes that swap possible."
- **Alternatives considered**: Not documented.
- **Consequences**: Two of `HumanManager`'s four methods (`setLineup`/`submitLineup`, `submitWaiverClaims`/`submitWaiverClaimsResponse`) are **implemented but never actually called by the current UI** (those pages dispatch store actions directly instead — see `FEATURES.md`). This is a deliberate consistency-over-current-necessity choice, verified from the class's own doc comment explaining exactly this.
- **Affected files**: `src/types.ts` (`Manager`), `src/managers/*`.
- **Verified**: Yes.

---

### AD-004: Config-driven sports, not per-sport code branches

- **Status**: Accepted, foundational, unchanged, actively exercised (10 times).
- **Decision**: A sport is entirely described by one `SportConfig` object (id, engine, season pacing, positions, roster shape, scoring presets, draft config, playoffs) plus a fixture file — no sport-specific `if` branches are meant to exist in `engine/`, `store/`, or shared `components/`.
- **Reasoning**: Verified from `README.md`'s "Adding a sport" section and the fact that 7 of the 10 sports were added purely by writing a config + fixtures, no engine changes.
- **Consequences (a real, shipped violation of this principle, found and fixed)**: Two files — `src/components/draft/BestAvailableList.tsx` and `src/pages/WaiversPage.tsx` — had position-filter tabs hardcoded to NFL's position list (`['QB','RB','WR','TE','K','DST']`) instead of reading `state.config.positions`. This silently broke position filtering for every sport added before the fix (found via browser-testing WNBA's draft room, which showed NFL position tabs on a basketball draft). Fixed by deriving tabs from `state.config.positions` in both files. **This is exactly the failure mode this decision is meant to prevent, and it happened anyway** — worth remembering as a concrete "grep for hardcoded sport assumptions" reminder for future sport additions (also recorded in `CLAUDE.md`).
- **Affected files**: `src/config/sports/*`, `src/fixtures/*`, and (as a cautionary tale) `src/components/draft/BestAvailableList.tsx`, `src/pages/WaiversPage.tsx`.
- **Verified**: Yes (both the principle and the violation/fix are directly confirmed in code and commit `4894699`'s content).

---

### AD-005: `localStorage` instead of a real backend/database for v1

- **Status**: Accepted, unchanged since initial commit.
- **Decision**: `StorageAdapter` interface, one implementation (`LocalJsonStorageAdapter`) wrapping a single `localStorage` JSON blob.
- **Reasoning**: Verified from `README.md`: "No backend, no API keys, no live sports data — everything runs against seeded local fixtures in the browser." This is a deliberately scoped single-player, zero-infrastructure v1.
- **Consequences**: No cross-device sync, no data durability beyond one browser's storage, no schema migration path (see `TASKS.md` TECH-1, `CLAUDE.md` known issue #2). Explicitly a "v1" choice per the README's own framing (the word "v1"/"v2" appears repeatedly), with `StorageAdapter` sized for a swap.
- **Affected files**: `src/storage/*`.
- **Verified**: Yes.

---

### AD-006: Bright "sports-app" visual redesign, replacing an initial dark trading-terminal look

- **Status**: Accepted, superseded the original design, unchanged since.
- **Context**: Not verifiable from code alone what the *original* design looked like in detail (that version isn't preserved in git history beyond the "Initial commit" itself, which already may reflect an earlier design iteration) — this decision's context is **inferred** from the commit message "Bright sports-app redesign" (`5430b12`) and the current design system's naming (`.app-card`, `.gradient-text`, emerald/sky accent colors) reading as a deliberate ESPN/Yahoo-Fantasy/Sleeper-style choice.
- **Decision**: A dark-mode-only (not dark-vs-light — see `UI_SYSTEM.md`) design system with emerald-green primary accents, glowing CTA buttons, sport-icon badges, and translucent/blurred cards, defined via Tailwind v4 `@apply` classes in `src/index.css`.
- **Reasoning**: **Inferred** from commit message and resulting design — no in-repo comment states the original user feedback that prompted this.
- **Consequences**: Every page/component built after this point (i.e., everything touched by the 7 additional sports, backgrounds, and live-scores work) consistently reuses this system rather than introducing new visual patterns.
- **Affected files**: `src/index.css`, virtually every `.tsx` file's className usage.
- **Verified**: Partially — the redesign's existence and current state are verified; the *original* look and the *specific reasoning* behind the redesign are inferred from the commit message alone, not from an in-repo document.

---

### AD-007: Wikimedia Commons for background photography, not unlicensed image search results

- **Status**: Accepted, applied consistently across all 10 sports.
- **Context**: A literal reading of "find real background photos, like PNGs you can find on Google" would mean hotlinking arbitrary, unlicensed search-result images.
- **Decision**: Source every background exclusively from Wikimedia Commons (freely-licensed/public-domain content only), not general image search.
- **Reasoning**: Licensing and reliability risk of hotlinking arbitrary web images — this was a deliberate deviation from the literal request, and per this session's own history, **was explicitly surfaced to the user as a substitution rather than done silently**.
- **Consequences**: Some sports' ideal "dramatic packed crowd" shot wasn't available on Commons in the time spent searching (e.g., a rejected WNBA candidate was a random fan-in-costume photo, an EPL candidate ended up being pitch-level action with no visible crowd rather than a stadium-bowl shot) — background quality is good-to-adequate across all 10 sports but not uniformly "ideal," a real trade-off of the licensing constraint.
- **Affected files**: `src/assets/backgrounds/*.jpg`, `src/components/LeagueBackdrop.tsx`.
- **Verified**: Yes (confirmed via this session's own direct history, not inferred).

---

### AD-008: Real player/athlete names via researched data + fictional fallback, not a fully live roster feed

- **Status**: Accepted, applied consistently across all 10 sports.
- **Context**: The user was confused why generated fictional names (e.g., no "Ohtani") appeared instead of real players, and asked for real names.
- **Decision**: Research real current rosters/rankings per sport (via a background research agent doing web search) once, cache as static JSON (`scripts/data/*.json`), consume at fixture-generation time (`scripts/generate-*-fixtures.mjs`) with a small fictional-name generator as fallback for any uncovered slot.
- **Reasoning**: A one-time research-and-cache approach was chosen over a live roster API, consistent with the broader "no live sports data feeds the simulation" boundary (see AD-009) — real names, but the simulation's stats/outcomes are still entirely generated, not sourced from real box scores.
- **Consequences**: Rosters will drift out of date over real time (trades, retirements, etc. that happen after the research date won't be reflected without re-running the generator against fresh research) — an accepted, undocumented-as-explicit-tradeoff but structurally obvious limitation of a "researched once, cached" approach. Also surfaced a real process risk: one research agent's free-text reasoning (not the shipped JSON) fabricated a false claim about a real person (see `CLAUDE.md` known issue #5) — caught before use, but not caught by any automated check, only by the operator reading the agent's output.
- **Affected files**: `scripts/data/*.json`, `scripts/generate-*-fixtures.mjs`, `src/fixtures/*/players.ts`.
- **Verified**: Yes.

---

### AD-009: Live scores are a read-only real-world widget, not a replacement for the simulation engine

- **Status**: Accepted after being explicitly weighed against a more literal alternative.
- **Context**: The user asked for "live scores each day" and, when asked to choose between "skip live scores" and "pick a real API and do it properly," chose the latter — worded in a way ("changing the core game loop from instant-simulate to real-live-data") that could be read as asking for the simulation itself to be replaced by real data.
- **Decision**: Build `LiveScoresTicker`/`fetchLiveScores` as a separate, read-only, best-effort widget showing today's real ESPN scores for context — explicitly **not** wiring real game outcomes into `DataProvider`/`generateStatLines`/the scoring engine.
- **Reasoning**: Fully replacing the simulation with real live stats would require rebuilding the entire stat/scoring data model around real box scores (a much larger, architecturally different project — the fictional/generated-projection model that `SeedDataProvider` and every engine test currently depends on would need to be discarded or run in parallel), and would conflict with the app's core "instant-simulate, no waiting for real games" gameplay loop that every other feature (draft, waivers, trades, playoffs) depends on. This was a genuine scope fork, and the choice made here was explicitly communicated back to the user as a scoping decision, not decided and hidden.
- **Alternatives considered**: (1) Skip live scores entirely — rejected per the user's explicit choice. (2) Rebuild the engine around real live data — considered and rejected as disproportionate scope for the request, and incompatible with existing instant-simulate gameplay. (3) [Chosen] A read-only widget alongside the unchanged simulation.
- **Consequences**: The app's "live scores" feature is honest about what it does (shows real scores) and does not do (does not make your fantasy team's points real) — but this nuance depends on the user understanding the distinction; the UI itself doesn't currently include an explicit disclaimer text to that effect beyond the ticker's own "Live from the real {SPORT} today" label, which is accurate but doesn't spell out the non-connection to fantasy scoring. Worth considering an explicit UI note if this causes user confusion later (see `ROADMAP.md`).
- **Affected files**: `src/components/LiveScoresTicker.tsx`, `src/utils/liveScores.ts`. NOT touched: `src/data/DataProvider.ts`, `src/data/SeedDataProvider.ts`, `src/engine/*`.
- **Verified**: Yes (confirmed via this session's own direct history).

---

### AD-010: ESPN's unofficial `site.api.espn.com` API chosen over documented/paid alternatives

- **Status**: Accepted.
- **Context**: A background research agent evaluated SportsData.io, API-SPORTS, balldontlie.io, and ESPN's unofficial endpoint for live sports data coverage across all target sports.
- **Decision**: Use ESPN's unofficial API — free, no signup, confirmed (at research time) CORS-enabled, and the only option covering all target sports in one consistent shape.
- **Reasoning**: The alternatives each failed on coverage, cost, or requiring a backend proxy (which this project deliberately doesn't have) — verified from the research agent's findings as relayed in this session's history.
- **Consequences**: No SLA, no documentation, no versioning guarantee from ESPN — confirmed in practice during this same project: CORS support turned out to be inconsistent across sport paths (see AD-009's sibling issue in `CLAUDE.md` known issue #1) despite initial `curl` checks suggesting uniform support. This is an accepted, load-bearing risk of the choice, not a defect in how it was implemented.
- **Affected files**: `src/utils/liveScores.ts`.
- **Verified**: Yes.

---

### AD-011: `oxlint` instead of ESLint

- **Status**: Accepted, present since initial commit, unchanged.
- **Decision**: `.oxlintrc.json` configures `oxlint` (a Rust-based, fast linter) rather than the more common ESLint+plugins stack.
- **Reasoning**: **Inferred** — no in-repo comment explains the choice. Plausibly a speed/simplicity preference for a solo project; not confirmed.
- **Consequences**: Only two rules are configured (`react/rules-of-hooks: error`, `react/only-export-components: warn`) — a much smaller rule surface than a typical ESLint+typescript-eslint+react-hooks config would enforce. Anyone expecting ESLint conventions/plugin ecosystem compatibility should note this is a different tool.
- **Affected files**: `.oxlintrc.json`, `package.json`'s `lint` script.
- **Verified**: Partially — the tool choice and its config are verified; the reasoning is inferred.
