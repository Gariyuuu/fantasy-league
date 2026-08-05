# Fantasy League

A multi-sport fantasy league app: create a league, draft (or pick a
salary-cap field) against 7 AI managers with distinct personas, play out a
season — lineups, waivers, trades, playoffs — solo. Built so live
multiplayer is a swap later, not a rewrite (see [Adding multiplayer](#adding-multiplayer)).

Three sports ship today, one per scoring engine:

| Sport | Engine | Format |
|---|---|---|
| NFL | Head-to-head weekly | Snake draft, weekly matchups, W-L-T standings, 4-team playoff bracket |
| MLB | Daily rolling points | Snake draft, daily lineups, cumulative points leaderboard |
| PGA Tour | Salary-cap field | No draft — pick a fresh field each event under a budget |

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # vitest — 49 tests covering the engine layer
npm run build     # tsc -b && vite build
```

No backend, no API keys, no live sports data — everything runs against
seeded local fixtures in the browser. League state persists to
`localStorage` (see [Storage](#storage--data)).

## Architecture

```
src/
  types.ts              LeagueState, Action, Manager — written before any feature code
  engine/                pure functions: reducer, RNG, draft/lineup/trade/waiver/playoff logic
  managers/               AIManager, HumanManager (both implement Manager)
  config/sports/          one SportConfig per sport
  fixtures/               generated player data per sport (scripts/generate-*-fixtures.mjs)
  data/                   DataProvider interface + SeedDataProvider
  storage/                StorageAdapter interface + LocalJsonStorageAdapter
  store/                  useLeagueStore.ts — the only place that orchestrates managers + dispatches actions
  pages/, components/     UI
```

Six things hold this together:

1. **`Manager` interface** — `AIManager` and `HumanManager` both implement
   `makeDraftPick` / `setLineup` / `respondToTrade` / `submitWaiverClaims`.
   `HumanManager` resolves via a pending promise the UI fulfills; nothing
   else in the codebase knows the difference between a human and an AI.
2. **`applyAction(state, action) -> state`** (`engine/reducer.ts`) is the
   *only* place `LeagueState` changes. It's pure — same inputs, same
   output, no mutation. Every user-visible event (a pick, a lineup save, a
   week advancing) is a serializable `Action` run through it.
3. **Seeded RNG** (`engine/rng.ts`) — every draw comes from
   `(league.seed, league.rngCursor)`. Actions record how many draws they
   consumed, so replaying the same seed + action log reproduces the exact
   same season, always.
4. **`StorageAdapter`** — one interface, `save`/`load`/`list`/`delete`.
   `LocalJsonStorageAdapter` mirrors one JSON blob to `localStorage`
   (there's no filesystem in a browser).
5. **`DataProvider`** — one interface for players, projections, and stat
   generation. `SeedDataProvider` reads from the fixture registry.
6. **Action log** — every action is appended to `LeagueState.actionLog`.
   It's the audit trail commissioner undo will read, and the sync
   primitive multiplayer will use.

## Adding a sport

A sport is a `SportConfig` object (`src/config/sports/<sport>.ts`) plus a
fixture file. Three engines cover the format space — pick the one that
matches:

- **`headToHead`** — snake draft, roster + bench, weekly opponent
  matchups, optional playoff bracket (`config.playoffs`).
- **`rollingPoints`** — snake draft, roster + bench, no opponent — every
  period's lineup score adds to a cumulative total, ranked as a
  leaderboard.
- **`salaryCapField`** — no draft (`draft: { type: 'none' }`), no
  persistent roster. Each period, `config.fieldSize` athletes are picked
  fresh from the full pool under `config.salaryCap`.

Concretely, to add a sport:

1. **Write the config** (`src/config/sports/<sport>.ts`): id/label/engine,
   `season` (start date, period label, how many periods), `positions`,
   `roster` (slot shape — see NFL for a shared-eligibility `FLEX` example),
   `scoringPresets` (standard/ppr/custom weight maps — stat keys are your
   own; keep them unambiguous the way NFL's `interceptionsThrown` vs.
   `defInterceptions` are, since one weights map scores every position),
   `draft`, `lineupLock`, and optionally `playoffs: { teamCount, weeks }`.
2. **Generate fixtures**: copy `scripts/generate-nfl-fixtures.mjs`,
   change the team/position/tier tables, run it — it writes
   `src/fixtures/<sport>/players.ts` and calls `registerFixtures()`.
   Import that file once in `src/fixtures/index.ts`.
3. **Register the config** in `src/config/sports/index.ts`.
4. **List it** in `CreateLeaguePage.tsx`'s `ALL_SPORTS` (only sports with a
   registered config are selectable; others show "Coming soon").

That's it for `headToHead` and `rollingPoints` sports — no engine code
changes. `salaryCapField` needed real engine work once
(`engine/salaryCap.ts` + the no-draft branch in `handleLeagueCreate` +
the `EventLobbyPage`), which any *future* salary-cap sport (Tennis,
NASCAR) gets for free by just setting `engine: 'salaryCapField'` in its
config.

## Storage & data

- `LocalJsonStorageAdapter` (v1) → swap for a DB-backed class implementing
  the same `StorageAdapter` interface. Nothing outside `store/` touches
  storage directly.
- `SeedDataProvider` (v1) → swap for a live-API-backed class implementing
  the same `DataProvider` interface. No `fetch` calls exist anywhere else.

## Adding multiplayer

This is the test the architecture was built to pass — the list should
stay short:

1. **`src/managers/RemoteManager.ts`** — implements `Manager`, resolving
   each method from a websocket message instead of local AI logic or a UI
   promise. Same shape as `HumanManager`'s pending-promise pattern.
2. **A server entrypoint** that imports the *same*
   `applyAction`/`createEmptyLeagueState` from `src/engine/reducer.ts` and
   runs it authoritatively — the reducer doesn't know or care whether it's
   running in a browser tab or a Node process.
3. **A DB-backed `StorageAdapter`** on the server, behind the same
   interface `LocalJsonStorageAdapter` implements today.
4. **`useLeagueStore.ts`**: swap the local `applyAction(state, action)`
   calls in `runDraftLoop`/`advanceWeek`/`runTradeOffer` for
   `socket.emit(action)` + apply whatever state/action the server sends
   back. The `set({ state })` React-facing half of the store doesn't
   change — only where `next` comes from.

Everything else — types, engine logic, all five sport configs, every
page and component — is unaware of single- vs. multiplayer and needs no
changes. Out of scope for both v1 and this list: auth, accounts, and the
websocket transport itself.
