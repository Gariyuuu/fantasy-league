# API_REFERENCE.md

## No internal API exists

This project has **no backend**, and therefore no internal API routes, server actions, RPC functions, or webhooks. Every "operation" in the app (create a league, draft a player, advance a week, etc.) is a synchronous or client-side-async function call — see `ARCHITECTURE.md` → "Request lifecycle" for the equivalent flow, and `FILE_MAP.md` → `src/store/useLeagueStore.ts` for the closest thing to an "API surface" (the store's public methods, which pages call directly, in-process — not over HTTP).

For reference, the store's public methods (all in `src/store/useLeagueStore.ts`, all callable only from within the same browser tab, no network involved):

| "Endpoint" (store method) | Purpose | Reducer action(s) it dispatches |
|---|---|---|
| `refreshLeagueList()` | Reload the league summary list from storage | none (read-only) |
| `createLeague(input)` | Create a new 8-team league | `LEAGUE_CREATE` |
| `loadLeague(id)` | Load a league by ID, resume draft loop if mid-draft | none (read-only, but may trigger `runDraftLoop`) |
| `startDraft()` | Begin the snake draft | `DRAFT_START`, then loops `DRAFT_PICK`/`DRAFT_AUTOPICK` per turn, then `DRAFT_COMPLETE` |
| `submitHumanPick(playerId)` | Resolve the human's pending draft pick | (indirectly) `DRAFT_PICK` |
| `saveHumanLineup(lineup)` | Save a lineup for the current period | `LINEUP_SET` |
| `advanceWeek()` | Resolve one full period: waivers → AI lineups → stat generation → scoring → playoff/completion transitions | `WAIVER_CLAIM_SUBMIT`*, `WAIVER_PROCESS`?, `LINEUP_SET`* (per AI team), `PERIOD_ADVANCE`, `PLAYOFFS_START`\|`PLAYOFFS_ADVANCE`? |
| `submitHumanWaiverClaim(input)` | Submit the human's FAAB claim for this period | `WAIVER_CLAIM_SUBMIT` |
| `proposeTrade(input)` | Propose a trade to an AI team, get its response | `TRADE_PROPOSE`, `TRADE_RESPOND`, `TRADE_EXECUTE`? |
| `acceptCounterOffer(tradeId)` | Accept a previously-countered trade | `TRADE_PROPOSE`, `TRADE_RESPOND`, `TRADE_EXECUTE`? |

(`*` = zero or more times; `?` = conditionally)

## External integration: ESPN unofficial scoreboard API

This is the **only** network call the shipped application makes.

- **Name**: ESPN Site API (unofficial/undocumented — this is the same internal API espn.com's own website uses, not a published product with a stable contract)
- **Base path pattern**: `https://site.api.espn.com/apis/site/v2/sports/{sportPath}/scoreboard`
- **Source file**: `src/utils/liveScores.ts`
- **HTTP method**: `GET`
- **Purpose**: Fetch today's real-world scores/events for a given sport, for the read-only `LiveScoresTicker` widget.
- **Authentication**: None. No API key, no token, no signed request.
- **Authorization**: None (public endpoint).
- **Parameters**: None beyond the URL path itself — `{sportPath}` is one of the 10 hardcoded mappings below (`ESPN_PATH` constant). No query parameters are sent (ESPN's endpoint defaults to "today," which is exactly the desired behavior here).
- **Request body**: None (`GET`).
- **Response**: JSON. Shape varies by sport category — see below.
- **Status codes handled**: Only `res.ok` is checked; a non-2xx throws `Error("ESPN scoreboard request failed: ${status}")`, caught by the caller (`LiveScoresTicker`) and treated as "render nothing."
- **Validation**: None — the response is loosely typed (`Record<string, any>` casts) and defensively optional-chained (`ev.status?.type ?? {}`, etc.) rather than schema-validated. A malformed response would likely produce an empty/partial render rather than a crash, but this hasn't been exhaustively tested.
- **Side effects**: None (read-only).
- **Database operations**: None.
- **Rate limits**: Unknown/undocumented (unofficial API). The app self-limits to one fetch per mounted ticker per 60 seconds.
- **Retry behavior**: None — a failed fetch is not retried until the next 60-second interval tick.
- **Errors**: Any thrown error (network failure, non-2xx status, JSON parse failure) is caught in `LiveScoresTicker`'s `useEffect` and results in the component rendering `null` — no error is surfaced to the user, logged to any service, or even necessarily visible in the console beyond whatever the browser's own network-error logging does by default.
- **Test/sandbox mode**: None exists — always hits the real live endpoint.
- **Environment variables**: None required (see `CLAUDE.md` — this project has zero env vars).

### Sport → ESPN path mapping (`ESPN_PATH` in `src/utils/liveScores.ts`)

| `SportId` | ESPN path | Response category |
|---|---|---|
| `nfl` | `football/nfl` | matchups (team vs. team) |
| `cfb` | `football/college-football` | matchups |
| `epl` | `soccer/eng.1` | matchups |
| `mlb` | `baseball/mlb` | matchups |
| `wnba` | `basketball/wnba` | matchups |
| `nba` | `basketball/nba` | matchups |
| `mls` | `soccer/usa.1` | matchups |
| `pga` | `golf/pga` | leaderboard (individual) |
| `tennis` | `tennis/atp` | leaderboard (individual) — **ATP only**, not combined ATP+WTA (a documented simplification) |
| `nascar` | `racing/nascar-premier` | leaderboard (individual) |

The `LEADERBOARD_SPORTS` set (`pga`, `tennis`, `nascar`) determines which of the two response-normalization branches runs — see `ARCHITECTURE.md` → "External API flow" for the shape difference.

### Example request (as actually issued by the browser)

```
GET https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard
```

No headers are set beyond what `fetch()` sends by default; no `Origin`-restricted behavior is deliberately worked around — CORS either works (most sports) or the fetch silently fails and the widget renders nothing (tennis/nascar, confirmed; pga, unverified in-browser — see `TASKS.md`).

### Example response shape (matchup sport, abbreviated — real field, verified via `curl` during development)

```json
{
  "events": [
    {
      "id": "...",
      "name": "Toronto Blue Jays at Houston Astros",
      "date": "2026-08-05T18:10Z",
      "status": { "type": { "state": "post", "shortDetail": "Final/10" } },
      "competitions": [
        {
          "competitors": [
            { "homeAway": "home", "score": "4", "team": { "displayName": "Houston Astros", "shortDisplayName": "Astros" } },
            { "homeAway": "away", "score": "5", "team": { "displayName": "Toronto Blue Jays", "shortDisplayName": "Blue Jays" } }
          ]
        }
      ]
    }
  ]
}
```

### Example response shape (leaderboard sport, abbreviated — real field, verified via `curl`)

```json
{
  "events": [
    {
      "id": "...",
      "name": "Wyndham Championship",
      "status": { "type": { "state": "pre", "description": "Scheduled" } },
      "competitions": [
        {
          "competitors": [
            { "athlete": { "displayName": "Thorbjørn Olesen" }, "score": "E" },
            { "athlete": { "displayName": "Jordan Smith" }, "score": "E" }
          ]
        }
      ]
    }
  ]
}
```

### Known issues with this integration

See `CLAUDE.md` known issue #1 and `TASKS.md` BUG-INVESTIGATE-1 — CORS support is not uniform across the 10 sport paths despite `curl` showing the header present on all of them; confirmed via real Playwright/Chromium browser testing that `tennis/atp` and `racing/nascar-premier` fail in-browser, `golf/pga` is unverified.
