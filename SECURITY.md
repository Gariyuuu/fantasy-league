# SECURITY.md

Defensive review only — no destructive testing, no attempts to access unauthorized systems were performed for this document, per the task's own constraints.

## Overall threat model

This is a **static, client-side-only application with no backend, no database, no authentication, and no user accounts.** The traditional web-app attack surface (SQL injection, server-side auth bypass, session hijacking, IDOR, broken access control between users) **does not apply** because none of the systems that surface targets exist here. The realistic threat surface is much narrower: (1) client-side code-injection risk from any data rendered as HTML, and (2) the one outbound network call to a third party.

## Authentication boundaries

None exist. There is no login, no session token, no password, nothing to authenticate. This is not a gap to fix — it's a structural property of a single-browser, single-implicit-user app. If the app ever adds real user accounts (e.g. for cross-device sync), this entire section will need to be rewritten from scratch, not patched.

## Authorization boundaries

None exist, for the same reason. Every "team" in a league (including the 7 AI teams) is fully readable/writable by whoever has the browser tab open — there's no concept of "the human can only see their own team's private info," and none of the AI teams' data is hidden from the human today (the draft room shows all rosters, for instance) — this appears to be an intentional design choice for a solo-play game, not an oversight, but is worth knowing if multiplayer is ever built (a real opponent's hidden info would need actual access control that doesn't exist in any form today).

## Protected routes

None. Every route in `src/App.tsx` is reachable by anyone who has the URL, with no gating beyond "does a league with this ID exist in this browser's `localStorage`" (and if not, the page shows a "Loading league…" state indefinitely rather than a 404 — see `KNOWN_ISSUES` in `CLAUDE.md`; not a security issue, but worth knowing).

## Secret handling

**No secrets exist in this codebase.** No API keys, no tokens, no credentials of any kind — verified via `grep` for common secret patterns and by the simple fact that the app's one external call (ESPN) is unauthenticated. There is nothing to leak.

## Environment variables

**None exist** (see `CLAUDE.md`). Nothing client-exposed, nothing server-side, because there is no server and no `.env` file.

## Input validation

Minimal, and entirely client-side (there's no server to validate against). League/team name fields use HTML5 `required` only — no length limits, no sanitization beyond whatever React does by default when rendering text content (React escapes text-content interpolation by default, so a league named `<script>alert(1)</script>` would render as literal text, not execute — this was not independently re-verified via a live XSS attempt in this audit, but is standard, well-established React behavior and no code in this app was found bypassing it — see "Cross-site scripting risk" below).

## Output encoding / Cross-site scripting (XSS) risk

**No use of `dangerouslySetInnerHTML` was found anywhere in `src/`** (verified via `grep -r "dangerouslySetInnerHTML" src/` — zero matches). All user-supplied text (league name, team name) is rendered via normal JSX text interpolation, which React escapes automatically. **Assessed risk: low**, contingent on this remaining true — if any future code introduces `dangerouslySetInnerHTML` or renders raw HTML from user input or the ESPN API response, revisit this section.

## SQL injection risk

Not applicable — no database, no SQL.

## CSRF protection

Not applicable — no server-side state-changing endpoints exist to forge a request against. The one network call (`fetch` to ESPN) is a same-origin-policy-governed `GET` with no side effects and no credentials attached.

## File upload risks

Not applicable — no file upload feature exists anywhere in the app.

## Webhook verification

Not applicable — no webhooks are received (the app makes one outbound `GET`, receives no inbound webhooks).

## Rate limiting

None implemented (nothing to rate-limit — no backend endpoints of this app's own). The one external call self-limits to once per 60 seconds per mounted `LiveScoresTicker`, which is a UX/politeness choice toward ESPN's unofficial API, not a security control.

## Admin access

Not applicable — no admin role/panel exists. The `ActionType` union in `types.ts` includes `COMMISSIONER_FORCE_LINEUP` and `COMMISSIONER_UNDO`, suggesting a "commissioner" role was planned, but **no reducer handler and no UI exists for either** (confirmed — see `FEATURES.md`/`ROADMAP.md`) — there is no actual privileged-access surface today, planned or otherwise implemented.

## Database policies

Not applicable — no database. See `DATABASE.md` for what plays a database's role (`localStorage`) and its complete lack of any access-control layer (by design, since there's only ever one implicit user per browser).

## Logging of sensitive data

No sensitive data exists to log (no PII, no credentials, no payment data). No logging infrastructure exists at all beyond default browser console output for uncaught errors.

## Dependency concerns

**`npm audit` was run as part of this documentation task's verification pass, and found a real, currently-unpatched issue:**

- **`react-router` / `react-router-dom` — 2 high-severity advisories** ([GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)): "React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response." Affects the installed range (currently `react-router-dom@7.18.2` per `package.json`'s `^7.18.2` and `npm ls`), advisory range `7.12.0 - 8.2.0`.
  - **Relevance to this app**: this app does not use React Router's RSC (React Server Components) mode or server-side data-mutation `action`s at all — it's a plain client-side `BrowserRouter` with no server actions, no forms wired to router actions, no RSC anywhere in the codebase (verified — this is a Vite SPA, not a framework with RSC support). **The vulnerable code path is very likely not reachable by this app's actual usage**, but this was not exhaustively proven (reading the advisory's exact trigger conditions in full was not part of this audit) — treat as a real, verified advisory against an installed package, with an *inferred-low* practical risk given how the package is actually used here.
  - `npm audit`'s suggested fix (`npm audit fix --force`) would install `react-router-dom@7.11.0` — note this is **older** than the currently-installed `7.18.2`, which `npm` itself flags as a semver-major/breaking change to accept. **This was deliberately not run as part of this documentation task** (out of scope — "do not begin implementing new product features," and a forced dependency downgrade is a real, risky code change that deserves its own reviewed task, not a silent side-effect of writing documentation).
  - **Recommended next step**: added to `TASKS.md` as a tracked item — evaluate whether a newer, non-downgrading patched version has since been released (check again at the time this is picked up, since `npm audit`'s suggestion reflects what was available at the moment this audit ran) before deciding whether to accept the downgrade or wait for a forward-compatible patch.
- No other vulnerabilities were reported (`npm audit`'s summary: 0 info, 0 low, 0 moderate, 2 high, 0 critical).

The rest of the dependency list is small and from well-known, actively-maintained packages (React 19, Zustand 5, Vite 8, Vitest 4, Tailwind 4) with no other flagged issues.

## Production security gaps

1. **No error boundary** (see `CLAUDE.md`/`TASKS.md` TECH-2) — not a security vulnerability per se, but an uncaught error could theoretically expose a raw error message/stack trace to the user in a way a production app would normally shield (React's default error overlay in dev mode; in a production build, an uncaught error in a component would unmount that part of the tree with no graceful fallback, which is a UX gap more than a security one, but worth listing here since "production security gaps" was explicitly asked for).
2. **`localStorage` has no encryption at rest** — not currently a real risk since no sensitive data is stored (see "Logging of sensitive data" above), but worth noting if the stored data model ever expands to include anything sensitive.
3. **The ESPN integration has no response validation** (see `API_REFERENCE.md`) — a malicious or malformed response (if ESPN's endpoint were ever compromised, or if a browser extension/MITM tampered with the response) would be trusted and rendered without schema checking. Given the response is rendered as plain text (not HTML) via React's escaping, the realistic worst case is a garbled/incorrect-looking score display, not code execution — but this is inferred from React's default behavior, not independently penetration-tested.

## Recommended fixes (in priority order, given the app's actual risk profile)

1. None are urgent — this app's attack surface is genuinely small given its no-backend, no-auth, no-database architecture.
2. If/when a backend or user accounts are ever added, this entire document needs a full rewrite, not incremental additions — the threat model changes qualitatively at that point.
3. Lowest-effort, non-zero-value hardening available today: add basic response shape validation to `fetchLiveScores` (defensive, not security-critical, but would improve robustness against a malformed ESPN response) and add the UI error boundary already tracked in `TASKS.md` TECH-2.
