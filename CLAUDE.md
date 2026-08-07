# CLAUDE.md — Operating Manual for AI Coding Agents

Read this file first, every session. Then read `PROJECT_STATE.md` and `TASKS.md`.

## Project identity

- **Name**: Fantasy League (package name `fantasy-league`)
- **One-sentence description**: A solo-play, multi-sport fantasy sports simulator — draft or pick a salary-cap field against 7 AI managers, play out a season (lineups, waivers, trades, playoffs), entirely client-side.
- **Detailed summary**: A single-page React app where a user creates a fantasy league for one of 10 sports, is grouped into an 8-team league with 7 AI-controlled opponents (each with a distinct drafting/trading persona), drafts or picks a field, then advances the season period-by-period (week/day/event) with the whole engine — stat generation, scoring, standings, waivers, trades, playoffs — resolved by a deterministic seeded simulation. There is no real backend: state lives in the browser's `localStorage`. Player names and team/venue backgrounds are real (researched); the season simulation itself is entirely fictional/generated, not real sports data. A "live scores" widget separately shows today's real scores from ESPN's public API for context, but does not feed the simulation.
- **Target audience**: One person wanting a self-contained "play a fantasy season solo" toy/demo across many sports, not a real money-line or multiplayer product.
- **Current development stage**: Working demo / hobby project, deployed and publicly live. Not hardened for multi-user/production traffic (no auth, no rate limiting, no backend to attack, but also no user accounts or data isolation — it's single-browser, single-user by construction).
- **Production status**: Deployed and live at **https://fantasy-league-iota-six.vercel.app** (Vercel, auto-builds from `main` on push, verified via `vercel --prod` deploys in git history/session log).
- **Repository type**: Single app, not a monorepo. One `package.json` at the root.

## User preferences observed (from conversation history, not derivable from code alone)

These patterns were consistent across every session in this project's history and are worth defaulting to when a future request is ambiguous about scope:

- **When offered a choice between a minimal-scope option and a thorough/complete option, this user has chosen the thorough option every time it was asked.** Concretely: asked whether to build a subset of the remaining sports or all 6 at once, chose all 6. Asked whether to skip live scores or "pick a real API and do it properly," chose to do it properly. This does not mean silently expanding scope without asking — it means that *when* a scope question is worth asking (see next point), default the presented options toward "the thorough one" rather than assuming the user wants the cheapest version, and don't be surprised if they pick it.
- **The user does want to be asked before large scope commitments**, not just have them silently done. Every 6-sport-build-out, live-API-integration, and NBA-addition decision in this project's history was preceded by either an explicit user request or (for the ambiguous "how far should this go" questions) an `AskUserQuestion` clarifying the scope first. Two clarifying questions were used at once in the same turn when both the sport-count and the live-data-architecture questions were genuinely independent and both large — that pattern (batch independent scope questions rather than asking serially) worked well and is worth repeating.
- **The user explicitly values literal-request substitutions being surfaced, not silently made.** Two concrete examples: sourcing background photos from Wikimedia Commons instead of literally hotlinking "Google Images" (licensing-risk substitution), and building a read-only live-scores widget instead of literally rewiring the simulation engine around real live data (scope-risk substitution). In both cases the deviation from the literal request was explained to the user in the same response, not just done quietly. Continue this pattern for any future literal-request-vs-better-alternative situation.
- **The user cares about the distinction between "real" and "simulated."** They were genuinely confused, early in this project's history, about whether the app tracked real live games (it doesn't — the season simulation is fully local/generated even though player names are now real). Any future feature touching real-world data (the live-scores ticker, real names, real season windows) should keep this distinction explicit in both UI copy and documentation — don't let "looks real" bleed into "is real" in how a feature is described to the user or end-users of the app.
- **Browser-verification (not just `tsc`/`test`/`build`) is the established, expected standard for any UI-affecting change** in this project, given there is no automated UI test suite. This isn't just a nice-to-have — it caught two real, shipped-then-fixed bugs in this project's history (hardcoded NFL position tabs breaking every non-NFL sport; hardcoded "golfers" copy breaking non-PGA salary-cap sports). Skipping it because `tsc`/`test`/`build` are green would be a real regression in verification quality, not just a shortcut.
- **Destructive/irreversible actions require explicit instruction, separate from feature-work instructions.** This surfaced clearly across two different task types in the same session: feature-building tasks in this project have historically included commit+push+deploy as part of normal, expected flow (done proactively after each verified change, without a separate ask each time) — but documentation-only tasks in this same project have come with an explicit "do not commit/push/deploy/reset unless told to" instruction. **Do not assume the feature-work commit/deploy norm carries over to a documentation or audit task** — check what kind of task is actually being requested before deciding whether proactive commit/deploy is appropriate.

## Current status

See `PROJECT_STATE.md` for the exact point development stopped — that file is the one to trust over this section if they ever disagree, since it's updated per-session.

- **Latest completed milestone**: All 10 sports are built and live — NFL, CFB, EPL (head-to-head engine), MLB, WNBA, NBA, MLS (rolling-points engine), PGA, Tennis, NASCAR (salary-cap engine). Real player/athlete names, real venue background photos, real-calendar season-window gating on the sport picker, and a real ESPN live-scores ticker are all shipped.
- **Current active task**: `[CHECKPOINT-1]` (the original documentation/handoff audit + its own checkpoint pass) is complete. `[CHECKPOINT-2]` — a later, separate session the same day with no access to CHECKPOINT-1's conversation — independently re-verified every claim in the docs against the live repo and found **zero drift** (see `TASKS.md` → "Current task" and `SESSION_LOG.md`'s CHECKPOINT-2 entry). No product code has been changed by either checkpoint.
- **Known blockers**: None blocking the app itself. See "Known issues" in this file and `TASKS.md` for open items. One non-technical blocker on the *documentation* task: the 17 `.md` files (this one included) are still uncommitted — see `PROJECT_STATE.md` and `HANDOFF.md` for why, and what the next account needs to confirm with the user before proceeding.
- **Highest-priority next task**: See `TASKS.md` → "Next up"/"High priority". As of this checkpoint, no urgent bug is open in the *application*; the highest-value next steps are either the low-risk cleanup items in `TASKS.md` (stale README, the react-router advisory) or a product/scope decision (see `ROADMAP.md`) — genuinely the user's call, not to be assumed.

## Technology stack

Versions below are copied verbatim from `package.json` — do not assume newer/older behavior than these ranges without checking `package-lock.json`.

- **Language**: TypeScript `~6.0.2` (strict-ish config, see `tsconfig.app.json`)
- **Runtime/package manager**: Node.js (repo built/tested under Node v26.3.0 in this session; no `.nvmrc` or `engines` field pins a version — unverified minimum), npm (`package-lock.json` present, so use `npm`, not yarn/pnpm)
- **Frontend framework**: React `^19.2.8`, ReactDOM `^19.2.8`
- **Routing**: `react-router-dom` `^7.18.2` (client-side `BrowserRouter`, no SSR)
- **State management**: `zustand` `^5.0.14` — one store, `src/store/useLeagueStore.ts`
- **Styling**: Tailwind CSS `^4.3.3` via `@tailwindcss/vite` `^4.3.3` (no `tailwind.config.js` — Tailwind v4's CSS-first config, all customization lives in `src/index.css`)
- **Build tool**: Vite `^8.2.0` with `@vitejs/plugin-react` `^6.0.4`
- **Testing**: Vitest `^4.1.10`
- **Linting**: `oxlint` `^1.75.0` (config: `.oxlintrc.json`) — not ESLint
- **No formatter config detected** (no `.prettierrc` or equivalent found)
- **Database**: none. No ORM, no DB provider.
- **Auth provider**: none. No accounts, no sessions, no login.
- **Storage**: browser `localStorage` only (`src/storage/LocalJsonStorageAdapter.ts`), one JSON blob under key `fantasy-league:blob:v1`.
- **Hosting**: Vercel (`.vercel/project.json` present; `projectName: "fantasy-league"`). No `vercel.json` — Vercel auto-detects the Vite build.
- **Analytics**: none detected.
- **Payments**: none.
- **Email provider**: none.
- **External APIs**: ESPN's unofficial public scoreboard API (`site.api.espn.com`), called client-side, unauthenticated, no API key. See `API_REFERENCE.md`.
- **No environment variables exist in this project** — no `.env`, `.env.example`, or `import.meta.env.VITE_*` usage found anywhere in `src/`.

## Essential commands

All commands run from the repository root (`/Users/gariyuu/Projects/fantasy-league` in this environment) — there is no monorepo/workspace structure.

```bash
npm install          # install dependencies
npm run dev           # vite dev server, http://localhost:5173 (tests in this session used --port 5183 to avoid conflicts)
npm run build          # tsc -b && vite build -> outputs to dist/
npm run preview        # vite preview — serve the dist/ build locally
npm test               # vitest run — runs the full suite once (49 tests / 8 files as of this audit)
npm run lint            # oxlint
```

There is no `typecheck` script separate from `build` — `tsc -b` (no emit, `noEmit: true` in `tsconfig.app.json`) is the type-check step, bundled into `npm run build`. To type-check without building, run `npx tsc -b` directly.

No database migration/seed commands exist (no database). No E2E test command exists (no Playwright/Cypress config in the repo — manual/ad-hoc Playwright scripts were used during development sessions but are not committed).

### Regenerating fixture (fake player) data

Each sport's player roster is generated by a script, not hand-written:

```bash
node scripts/generate-<sport>-fixtures.mjs   # e.g. generate-nfl-fixtures.mjs
```

This reads `scripts/data/<sport>-real-*.json` (real researched names) and writes `src/fixtures/<sport>/players.ts` (a generated, git-tracked file — **do not hand-edit** files under `src/fixtures/*/players.ts`, they start with `// GENERATED FILE — do not edit by hand.`). See `FILE_MAP.md` → "Add a sport" for the full flow.

### Deployment

```bash
vercel --prod --yes    # deploy the current working tree to production
```

GitHub → Vercel auto-deploy is also linked (per project history), but sessions in this repo have used explicit `vercel --prod --yes` after `git push` for a confirmed, on-demand deploy rather than relying on the auto-deploy webhook.

## Repository structure

```
fantasy-league/
├── src/
│   ├── types.ts              Single source of truth for every domain type (LeagueState, Action, SportConfig, Manager, ...). Written before any feature code — read this first to understand the data model.
│   ├── engine/                 Pure functions only. No React, no I/O. This is the simulation core.
│   │   ├── reducer.ts            applyAction(state, action) -> state — the ONLY place LeagueState changes.
│   │   ├── rng.ts                Seeded RNG (mulberry32) — determinism backbone.
│   │   ├── draft.ts              Snake draft order/turn math.
│   │   ├── lineup.ts             Lineup-slot assignment heuristic.
│   │   ├── salaryCap.ts          Salary-cap field selection heuristic (engine C).
│   │   ├── schedule.ts           Round-robin matchup pairing (engine A).
│   │   ├── scoring.ts            Stat-line -> fantasy points (pure dot product against weights).
│   │   ├── standings.ts          Standings computation (head-to-head and cumulative).
│   │   ├── playoffs.ts           Bracket seeding/advancement.
│   │   ├── trades.ts             AI trade evaluation logic.
│   │   ├── waivers.ts            FAAB waiver processing.
│   │   ├── valuation.ts          Player value ranking + AI "persona" pick logic.
│   │   └── __tests__/            Vitest suite — the only tests in the repo.
│   ├── managers/                AIManager, HumanManager (both implement the `Manager` interface), personas.ts (7 AI personalities).
│   ├── config/sports/           One `SportConfig` object per sport (10 files) + `index.ts` registry.
│   ├── fixtures/                Generated player data per sport (do not hand-edit) + `index.ts` that imports all of them for their `registerFixtures()` side effect.
│   ├── data/                    `DataProvider` interface + `SeedDataProvider` (the only implementation; reads the fixture registry).
│   ├── storage/                 `StorageAdapter` interface + `LocalJsonStorageAdapter` (the only implementation; wraps `localStorage`).
│   ├── store/                   `useLeagueStore.ts` — the only place that orchestrates managers and dispatches actions. All page components read/write through this store.
│   ├── pages/                   One component per route (see `src/App.tsx` for the route table).
│   ├── components/               Shared UI, including `LeagueBackdrop.tsx` (per-sport background photo), `LiveScoresTicker.tsx` (ESPN live scores widget), and `draft/`, `season/` subfolders for page-specific pieces.
│   ├── utils/                   `seasonWindow.ts` (real-calendar season gating), `liveScores.ts` (ESPN fetch/normalize logic).
│   ├── App.tsx, main.tsx         React Router route table; app entry point (imports `./fixtures` once for its side effects, then mounts `<App/>`).
│   └── index.css                 Tailwind v4 entry + all custom design tokens/classes (`.app-card`, `.btn-primary`, gradient background, animations). No separate theme file.
├── scripts/
│   ├── generate-<sport>-fixtures.mjs   Build-time-only Node scripts (never imported by the app). One per sport.
│   └── data/<sport>-real-*.json         Researched real player/athlete names, consumed by the generator scripts.
├── public/favicon.svg
├── index.html                   Vite entry HTML.
├── package.json, vite.config.ts, tsconfig*.json, .oxlintrc.json
├── README.md                     Human-written architecture doc — still accurate on architecture, **stale on sport count** (says "three sports ship today"; actually 10 as of this audit — do not trust that specific claim in README.md).
└── (this file and its siblings)   CLAUDE.md, PROJECT_STATE.md, ARCHITECTURE.md, FILE_MAP.md, FEATURES.md, TASKS.md, ROADMAP.md, DECISIONS.md, DATABASE.md, API_REFERENCE.md, UI_SYSTEM.md, SECURITY.md, TESTING.md, DEPLOYMENT.md, CHANGELOG.md, SESSION_LOG.md, HANDOFF.md
```

What should NOT be placed where:
- Nothing sport-specific belongs in `engine/` — the whole point of the config-driven design is that engine code is sport-agnostic. If you find yourself writing `if (sport === 'nfl')` outside `config/sports/` or `fixtures/`, that's very likely a bug (two such bugs — hardcoded NFL position tabs — were found and fixed in `BestAvailableList.tsx` and `WaiversPage.tsx` during the 10-sport build-out; grep for `'QB'`, `'DST'`, etc. outside `config/sports`/`fixtures` if you suspect a repeat).
- Nothing in `src/fixtures/*/players.ts` should be hand-edited — regenerate via the script instead.
- No `fetch`/network calls belong anywhere except `src/utils/liveScores.ts` — the README's stated invariant ("No `fetch` calls exist anywhere else") was true before the live-scores ticker was added, and is now scoped to that one file plus `DataProvider`'s designed-for-it seam. Keep it that way; a live-data `DataProvider` implementation is the one sanctioned place a second `fetch` boundary should ever be added.

## Architecture summary

This is a **pure client-side SPA**. There is no server, no API routes, no database. Everything described below runs in the browser.

- **Rendering strategy**: Client-side rendered only (`ReactDOM.createRoot` + `BrowserRouter`). No SSR/SSG.
- **Routing**: `react-router-dom`, routes defined in `src/App.tsx`. All league-scoped routes take a `:leagueId` param and independently `loadLeague(id)` from the store on mount.
- **State management**: One global Zustand store (`useLeagueStore`) holds the currently-loaded `LeagueState`, the `Manager` instances for the 8 teams, and UI-only draft-clock state. Components read via selectors (`useLeagueStore((s) => s.state)`), write via store actions that internally build an `Action`, run it through `applyAction`, persist the result, then `set({ state: next })`.
- **Data flow / request lifecycle**: There is no request lifecycle in the network sense. The "request" is a user interaction (click Draft, click Advance Week, submit a lineup) → a store method builds a serializable `Action` → `applyAction(state, action)` (pure, synchronous, in `engine/reducer.ts`) computes the next `LeagueState` → the store persists it via `StorageAdapter.save()` (writes all of `localStorage` synchronously) → Zustand's `set()` triggers a React re-render.
- **Determinism**: Every league has a `seed` (random at creation) and a `rngCursor` (advances monotonically). All randomness — draft order shuffle, AI pick noise, stat-line sampling — draws from `createSeededRng(seed, cursor)` and the action recording how many draws it consumed. Replaying the same `(seed, actionLog)` always reproduces the same season. This is the property `undoLastAction` (commissioner undo, implemented but not yet wired to any UI) and any future server-authoritative replay depend on.
- **Server/client boundary**: None exists yet. The codebase is deliberately structured (see "Adding multiplayer" in `README.md` and `DECISIONS.md`) so that `applyAction`/`createEmptyLeagueState` could run identically on a future Node server, and `Manager`/`StorageAdapter`/`DataProvider` are already interfaces with exactly one implementation each, sized for a second (remote/DB-backed/live) implementation to be added later without touching call sites.
- **Auth/authorization flow**: None. No login exists; "the human manager" is just whichever browser tab has the league in its `localStorage`.
- **Storage/data access pattern**: `LocalJsonStorageAdapter` reads the entire `localStorage` blob into an in-memory cache on construction, then keeps that cache and `localStorage` in sync on every `save()`/`delete()`. There's no per-key storage — one JSON blob (`fantasy-league:blob:v1`) holds every league the user has ever created in that browser.
- **External integration flow**: `LiveScoresTicker` (component) → `fetchLiveScores(sport)` (`src/utils/liveScores.ts`) → `fetch()` directly to `https://site.api.espn.com/...` (no proxy, no backend in between) → normalizes the response into one of two shapes (`matchups` for team sports, `leaderboard` for individual-athlete sports) → renders. Fails silently (renders nothing) on any error — see `KNOWN_ISSUES`.
- **Background/scheduled jobs**: None. The AI turn loop (`runDraftLoop`, `advanceWeek`) runs entirely client-side, triggered by user action, using `setTimeout`/`setInterval` for pacing (draft clock countdown, cosmetic AI-pick delay) — not a real job queue.
- **Caching**: None beyond the in-memory `StorageAdapter` cache described above. `LiveScoresTicker` refetches every 60s on an interval while its page is mounted; no HTTP caching layer.
- **Error handling/logging**: No centralized error boundary or logging service. Errors mostly surface as thrown `Error`s in engine code (e.g., "no fixtures registered for sport X") that would currently crash the relevant async call chain uncaught in the UI — there is no global error boundary component in `src/`. The live-scores fetch is the one place that deliberately swallows errors (by design, see `KNOWN_ISSUES`).
- **Deployment architecture**: Vite static build (`dist/`) deployed to Vercel as a static site. No serverless functions, no edge middleware.

## Coding conventions

All verified by direct inspection of the codebase (not assumed):

- **Naming**: `camelCase` for functions/variables, `PascalCase` for React components and types/interfaces, `SCREAMING_SNAKE_CASE` for true constants (`SHORTLIST_SIZE`, `AI_PERSONAS`). Files match their default export's name (`LeagueBackdrop.tsx` exports `LeagueBackdrop`).
- **File organization**: One concept per file in `engine/`; pages are one file per route in `pages/`; shared UI in `components/`, further split into `components/draft/` and `components/season/` for page-specific pieces only used by the draft room / season dashboard respectively.
- **Imports**: `verbatimModuleSyntax: true` in `tsconfig.app.json` — type-only imports must use `import type { ... }`. Relative imports throughout (no path aliases configured).
- **Components**: Function components only, `export function ComponentName(props: Props) { ... }` — no `export default` for components (only `App.tsx` and `main.tsx` use default export, per Vite's convention). Props typed via a local `Props`/`interface` above the component.
- **Hooks**: Zustand selectors called individually per piece of state needed (`useLeagueStore((s) => s.state)`, a separate call for each field) rather than one destructured selector — consistent throughout `pages/`.
- **Engine functions**: Pure, synchronous, no `class` (except `AIManager`/`HumanManager`, which hold instance state — pending promises, persona — and `LocalJsonStorageAdapter`/`SeedDataProvider`, which implement an interface). Every exported engine function has a one-to-few-line doc comment explaining *why*, not *what* (the "why over what" comment style is consistent across the whole codebase — match it).
- **Validation**: None beyond TypeScript's static types — no runtime schema validation (no zod/yup) anywhere, including on data crossing the `fetch` boundary in `liveScores.ts` (that response is cast with `any`/loose typing and defensively optional-chained rather than schema-validated).
- **Types**: All domain types centralized in `src/types.ts`, heavily commented. Do not redefine a shape that already exists there.
- **Styling**: Tailwind utility classes inline in JSX; a small set of shared classes (`.app-card`, `.btn-primary`, `.btn-secondary`, `.gradient-text`, `.stat-number`) defined once in `src/index.css` via `@apply` and reused everywhere rather than repeating long utility strings for the same visual role.
- **Error handling**: Engine code throws descriptive `Error`s on invariant violations (missing team, missing fixtures, etc.) rather than returning null/undefined silently — these are treated as programmer errors, not expected runtime conditions. The one exception is `LiveScoresTicker`, which treats its external API as unreliable by design and swallows errors.
- **Async**: `async`/`await` throughout; no raw `.then()` chains in application code (the one exception, `raceHumanPick` in `useLeagueStore.ts`, uses `.then()` inside a `new Promise` executor, which is idiomatic for that specific race pattern).
- **Comments**: Sparse and deliberate — explain *why*, not *what*. This is a strongly and consistently held convention in this codebase; match it in any new code (do not add comments restating what the next line obviously does).
- **Tests**: Vitest, `describe`/`it`, colocated under `__tests__/` next to the code they test. See `TESTING.md`.

## UI and design system

See `UI_SYSTEM.md` for full detail. Summary:

- **Theme**: Dark-only. `color-scheme: dark` is hardcoded in `:root` (`src/index.css` line 3) — there is no light mode and no theme toggle.
- **Design tokens**: Not in a separate config file (Tailwind v4 has no `tailwind.config.js` here) — defined as CSS custom classes in `src/index.css` (`.app-card`, `.btn-primary`, etc.) and inline Tailwind utilities.
- **Color language**: Emerald/green as the primary accent (`emerald-400`/`500`), zinc grayscale for surfaces/text, sky-blue and violet as secondary gradient accents. Status colors: emerald = good/active, amber = warning/pending, rose = danger/negative, sky = informational/live.
- **Background system**: `LeagueBackdrop.tsx` — a real venue photo per sport (Wikimedia Commons, freely licensed), imported as a Vite asset, applied as a CSS `background-image` with a dark linear-gradient scrim so the translucent `.app-card` UI on top stays readable. Wired into every league-scoped page (draft, season, lineup, waivers, trades, event lobby). `HomePage`/`CreateLeaguePage` intentionally do NOT use it (no single sport is in context there) — they keep the ambient radial-gradient page background instead.
- **Icons**: Emoji, not an icon library (`SPORT_ICONS` in `src/components/sportMeta.ts` maps each `SportId` to one emoji; AI manager avatars are also emoji, in `personas.ts`).

## Environment setup

**There are zero environment variables in this project.** No `.env`, `.env.example`, or `import.meta.env.VITE_*` reference exists anywhere in `src/` or the config files. The ESPN live-scores API is called unauthenticated with no key. If a future task adds a real backend, database, or authenticated API, this section and a new `.env.example` must be created at that time — do not assume any exist today.

## Database summary

**Not applicable — there is no database.** All persistence is a single `localStorage` JSON blob in the user's browser (see `DATABASE.md` for the full explanation of what stands in for a schema).

## Authentication and authorization

**Not applicable — there is no authentication system.** See `SECURITY.md` for what this means for the app's threat model (short version: there's nothing to authenticate into; the browser's own `localStorage` isolation is the only access boundary, and it's per-browser-profile, not per-user).

## API and integrations

**No internal API routes exist** (no backend). One external integration:

- **ESPN unofficial scoreboard API** (`site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard`) — called client-side from `src/utils/liveScores.ts`. Unauthenticated, no API key, no documented SLA (it's ESPN's own website's internal API, not a published product). See `API_REFERENCE.md` for the full path mapping and known reliability caveats (CORS support is NOT uniform across all 10 sport mappings — confirmed via browser testing, not just `curl`).

## Testing and verification

See `TESTING.md` for full detail. Summary: `npm test` runs Vitest, 49 tests across 8 files, all in `src/engine/__tests__/` (7 files) and `src/data/__tests__/` (1 file) — covering determinism, draft flow, MLB rolling-points scoring, PGA salary-cap selection, playoffs, a full season simulation, waivers/trades, and NFL fixture data integrity. **No UI/component tests exist** — the design/season simulation/scoring engine is well-tested; React components, pages, routing, and the live-scores ticker have zero automated test coverage. Manual browser testing (via ad-hoc Playwright scripts, not committed to the repo) was the verification method used for UI changes during development.

## Deployment

See `DEPLOYMENT.md`. Summary: `npm run build` → `vercel --prod --yes`. Production URL: https://fantasy-league-iota-six.vercel.app. GitHub repo: `github.com/Gariyuuu/fantasy-league`, `main` branch.

## DO NOT CHANGE WITHOUT REVIEW

- **`src/types.ts`** — the entire app's data model. A breaking change here cascades everywhere; `LeagueState` shape changes also silently break existing users' `localStorage` data (there is no migration system — see `KNOWN_ISSUES`).
- **`src/engine/reducer.ts`, specifically `applyAction`** — must stay pure (no mutation, no `Date.now()`/`Math.random()` calls inside handlers — timestamps and randomness are threaded in via the `Action` payload/RNG cursor) or every determinism guarantee and the entire "replay the action log" architecture (used by `undoLastAction` and planned for multiplayer) breaks silently.
- **`src/engine/rng.ts`** — changing the `mulberry32` algorithm, its seeding, or the draw-order in any engine function that consumes it will silently desync any already-created league's simulation from what a fresh replay of its action log would produce. There is no version-tagging on the RNG algorithm, so this is a silent-corruption risk, not a loud one.
- **`SportId` union in `types.ts` and the `sportConfigs` registry in `src/config/sports/index.ts`** — removing a sport ID that an existing user's `localStorage` league references will make `getSportConfig` throw when they try to load it. There is no handling for "sport config no longer exists."
- **`src/storage/LocalJsonStorageAdapter.ts`'s `STORAGE_KEY` constant** (`'fantasy-league:blob:v1'`) — changing this orphans every existing user's saved leagues (they become permanently unreadable, silently — `readBlob()` just returns an empty object for a missing/different key, no error, no warning).
- **`src/fixtures/*/players.ts`** — generated files. Hand-edits will be silently blown away the next time someone runs the corresponding `generate-*-fixtures.mjs` script, and in the meantime create drift between the script and its output.
- **`scripts/data/*.json`** — real, researched player/athlete names. See `KNOWN_ISSUES` for a documented instance of a research agent asserting a false, sensitive claim about a real person (a fabricated death) in its reasoning output — the claim itself never reached this JSON, but it's a reminder to spot-check research-agent output about real people before trusting it, especially anything beyond simple roster placement.

## Known issues

1. **ESPN live-scores CORS is not uniform across sports.** Confirmed via `curl -I` that all mapped endpoints send `Access-Control-Allow-Origin: *`, but real in-browser testing (Playwright/Chromium) showed `tennis/atp` and `racing/nascar-premier` consistently fail CORS in-browser despite `curl` seeing the header — likely an inconsistency in ESPN's own CDN/edge layer for lower-traffic sport paths, not a bug in this app's code. **Severity**: low (the component fails silently — no visible breakage, the ticker just doesn't render for those sports). **Affected files**: `src/utils/liveScores.ts`, `src/components/LiveScoresTicker.tsx`. **Status**: known and accepted, documented in code comments and `src/config/sports/*` is unaffected (this is purely the optional real-world-context widget, not the simulation). **Workaround**: none needed — by design, absence of the ticker is a silent, non-breaking degradation. **Recommended next investigation, if pursued**: test `golf/pga`'s CORS behavior in-browser too (untested as of this audit — only tennis/racing were confirmed to fail; PGA's status is unverified).
2. **No `localStorage` migration system.** If `LeagueState`'s shape ever changes in a breaking way (a field renamed/removed, a new required field added), any league a user already saved under the old shape will likely error or behave incorrectly when loaded — there's no version field on the stored blob and no migration/upgrade path. **Severity**: medium if `types.ts` is ever changed carelessly; zero impact so far since every session's changes to `SportConfig` so far have been additive-only (new optional/present-on-every-config fields like `realSeasonWindow`), which happens not to break old leagues. **Affected files**: `src/types.ts`, `src/storage/LocalJsonStorageAdapter.ts`. **Status**: open, never addressed. **Recommended next step if this becomes a real problem**: add a `schemaVersion` field to the stored blob and a migration function in `LocalJsonStorageAdapter.readBlob()`.
3. **No error boundary / global error handling in the UI.** An uncaught exception in engine code (e.g., `SeedDataProvider` throwing "no fixtures registered") during a store action will reject that action's promise with nothing catching it at the UI layer in most call sites — the user would see a stuck/broken UI with only a console error, not a friendly message. **Severity**: low in practice (fixtures exist for all 10 registered sports, so this specific throw shouldn't currently trigger from normal use) but structurally present. **Status**: open, never addressed.
4. **README.md is stale on sport count.** It says "Three sports ship today" — actually 10 as of this audit. The rest of README.md's architecture description was verified accurate and is a good secondary reference, but do not trust that one specific line. Not yet corrected as part of this documentation audit (see `CHANGELOG.md` "not yet corrected" note) — **recommended next step**: update README.md's sport table/count to match reality, low-risk, high-value cleanup.
5. **`react-router`/`react-router-dom` has 2 open high-severity advisories** (GHSA-qwww-vcr4-c8h2, a CSRF bypass in RSC mode), found via `npm audit` during this documentation audit. This app doesn't use RSC mode, so practical exposure is likely low, but it's a real, verified, currently-unpatched advisory against the installed `react-router-dom@7.18.2`. `npm audit fix --force` would *downgrade* to `7.11.0` (npm flags this as breaking) — do not run it without first checking for a newer non-downgrading patch and treating it as its own reviewed task. See `SECURITY.md` and `TASKS.md` SEC-1.
6. **A background research agent (session-level, not code-level) fabricated a false claim about a real NASCAR driver's death** while researching `scripts/data/nascar-real-drivers.json`. The false claim never made it into the actual JSON data (it was in the agent's free-text reasoning/summary only) and was caught and the roster corrected before use, but it's recorded here as a caution: **do not trust agent-researched claims about real, identifiable people beyond simple factual roster placement without independent verification**, especially anything sensitive (health, death, legal trouble). This is a process risk for any *future* fixture research, not a current code defect.

## AI working instructions

1. Read `CLAUDE.md` (this file).
2. Read `PROJECT_STATE.md`.
3. Read `TASKS.md`.
4. Read whichever of `ARCHITECTURE.md` / `FEATURES.md` / `API_REFERENCE.md` / `DATABASE.md` / `UI_SYSTEM.md` is relevant to the task at hand.
5. Inspect the affected code before changing it — this codebase rewards reading the existing pattern first (see "Coding conventions" above); most new-sport/new-feature work here has been mechanical repetition of an established pattern, not novel design.
6. Check `git status` before modifying files.
7. Avoid overwriting unrelated work.
8. Make small, reviewable changes.
9. Run `npx tsc -b`, `npm test`, and `npm run build` after changes — all three are fast (well under a minute combined) and were run after every meaningful change in this project's history; there's no excuse to skip them.
10. Update documentation after meaningful changes (`PROJECT_STATE.md`, `TASKS.md`, `SESSION_LOG.md` at minimum — see the permanent rules below).
11. Never claim something works without verification. This codebase's own convention (browser-verifying UI changes with screenshots, not just trusting `tsc`/tests) is worth continuing for anything touching `pages/`, `components/`, or `utils/liveScores.ts`.
12. Never expose secrets. (None currently exist in this project — if any are ever added, this rule becomes load-bearing.)
13. Never modify production data without explicit permission. (N/A today — no production database — but this app's "production data" analog is a real user's `localStorage`; never write code that would silently wipe/corrupt it.)
14. Never perform destructive database operations without explicit permission. (N/A — no database.)
15. Never silently replace an existing architectural pattern with a new one — this codebase has a small number of load-bearing seams (`Manager`, `DataProvider`, `StorageAdapter`, `applyAction`) specifically designed for future extension; extend through them, don't route around them.
16. Never remove a dependency without checking all usages (`grep -r` the package name across `src/`).
17. Never change the RNG algorithm, the `LeagueState` shape, the storage key, or deployment configuration casually — see "DO NOT CHANGE WITHOUT REVIEW" above.
18. Record unresolved uncertainty rather than guessing — this file uses "Unable to verify"/"Unverified" labels deliberately; keep doing that in updates rather than presenting a guess as fact.

### Permanent rules — after every meaningful coding task

1. Update `PROJECT_STATE.md`.
2. Update `TASKS.md`.
3. Append to `SESSION_LOG.md` (append, never overwrite prior entries).
4. Update affected feature/architecture/API/database/testing/deployment/security documentation.
5. Remove or correct stale information you find, wherever it lives.
6. Record meaningful architectural decisions in `DECISIONS.md`.
7. Run `npx tsc -b`, `npm test`, `npm run build` (and browser-verify if you touched UI).
8. Clearly record anything not verified.
9. Keep this repository — not chat history — as the permanent source of project memory.

### Permanent rules — before every meaningful coding task

1. Read `CLAUDE.md`.
2. Read `PROJECT_STATE.md`.
3. Read `TASKS.md`.
4. Read the relevant technical documentation.
5. Inspect `git status`.
6. Inspect the files you're about to change.
7. Confirm the requested work hasn't already been completed (`TASKS.md` → "Recently completed" and `SESSION_LOG.md` are both good places to check).
8. Preserve unrelated work.
9. Identify risks before touching anything listed under "DO NOT CHANGE WITHOUT REVIEW".
