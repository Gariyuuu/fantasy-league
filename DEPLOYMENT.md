# DEPLOYMENT.md

## Hosting platform

**Vercel.** Confirmed via `.vercel/project.json`:
```json
{"projectId":"prj_jyyWU4JCzqymLAgJPxiqM8jrjOsI","orgId":"team_gofGt63nGGecSpDl9hBbsFWm","projectName":"fantasy-league"}
```
No `vercel.json` exists in the repo — Vercel's zero-config auto-detection of the Vite framework preset is relied on entirely.

## Production URL

**https://fantasy-league-iota-six.vercel.app** (per project history/memory — not independently re-verified as still live at the exact moment of this audit, but this is the consistently-used production URL across every deploy in this project's history).

## Repository / source control

GitHub: `github.com/Gariyuuu/fantasy-league`, branch `main`. Every commit in this project's history has been pushed to `origin/main` directly (no PR/review workflow observed — solo-developer, direct-to-main pattern). No GitHub Actions or other CI/CD workflow files exist in the repository (`find . -iname "*.github*"` returns nothing) — Vercel's own build step is the only CI-like gate, and it runs on Vercel's side, not via a repo-defined workflow.

## Build command

`npm run build`, which runs `tsc -b && vite build`. This is almost certainly what Vercel's zero-config Vite detection also runs automatically on push (not independently re-verified against Vercel's dashboard settings, since no `vercel.json` pins it explicitly — **flagging as inferred, not directly confirmed from a Vercel dashboard screenshot**).

## Install command

`npm install` (implied by the presence of `package-lock.json` — Vercel's zero-config detection uses `npm` when a `package-lock.json` is present rather than `yarn.lock`/`pnpm-lock.yaml`, neither of which exist here).

## Runtime version

Not pinned anywhere in the repo (no `.nvmrc`, no `engines` field in `package.json`). Vercel will use its own default Node version for the build unless configured otherwise in the Vercel dashboard (not verifiable from the repository alone).

## Output directory

`dist/` (Vite's default, unconfigured/default in `vite.config.ts` — no custom `build.outDir`).

## Environment variables

**None required or configured** — this project has zero environment variables (see `CLAUDE.md`). Nothing to set in the Vercel dashboard for this app to function.

## Domains

Only the default Vercel-provided domain (`fantasy-league-iota-six.vercel.app`) is used, per every reference to the production URL across this project's history. No custom domain configuration was found or referenced.

## Preview deployments

Not specifically exercised in this project's history — every deploy observed in the session history used `vercel --prod --yes` directly (an explicit, immediate production deploy), not the preview-then-promote flow. Vercel's default GitHub integration (if connected, which the presence of a linked `.vercel/project.json` suggests but doesn't guarantee) would also auto-generate preview deployments on non-`main` pushes/PRs — not verified either way, since this project has only ever pushed directly to `main`.

## Production deployment procedure (as actually used throughout this project)

```bash
# 1. Make and verify changes
npx tsc -b        # must be silent
npm test          # must show 49 passed (49)
npm run build     # must succeed

# 2. Commit and push
git add <files>
git commit -m "..."
git push origin main

# 3. Deploy
vercel --prod --yes
```

Note: GitHub → Vercel auto-deploy may also be linked (the project is linked via `.vercel/project.json`), but every deploy in this project's history has used the explicit `vercel --prod --yes` step as a deliberate, confirmed action rather than relying solely on the webhook — continue this pattern for predictability (you get an immediate deployment URL and status back in the same command, rather than needing to separately check a dashboard).

## Database migrations

Not applicable — no database (see `DATABASE.md`).

## Storage setup

Not applicable — storage is the end-user's own browser `localStorage`, nothing to provision.

## External service setup

The one external integration (ESPN's unofficial API, see `API_REFERENCE.md`) requires zero setup — no account, no API key, no configuration. It's called directly by URL from the deployed static site.

## Scheduled jobs / webhooks

None exist — nothing to configure for deployment.

## Known build warnings (expected, not failures)

```
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```
This is Vite's advisory warning, not a build failure — the build succeeds and deploys correctly despite it. See `TASKS.md` UX-2 for the un-actioned code-splitting suggestion.

## Runtime limitations

None specific to Vercel's static hosting for this app — it's a plain SPA with client-side routing (`react-router-dom`'s `BrowserRouter`). **One thing to verify if routing ever breaks in production but works in dev**: `BrowserRouter` requires the host to rewrite all paths to `index.html` (a client-side-routing SPA fallback) — since no `vercel.json` exists to explicitly configure this, it's relying on Vercel's default SPA-fallback behavior for the Vite framework preset. This was not independently re-verified by navigating directly to a deep link (e.g. `/league/<id>/season`) on the production URL during this audit — **flagging as unverified, recommended as a first check if a "404 on refresh" bug is ever reported.**

## Rollback procedure

Not formally documented anywhere in the repo. The practical rollback path with Vercel: either (a) use the Vercel dashboard/CLI to promote a previous deployment back to production (`vercel rollback` or the dashboard's "promote to production" on an older deployment), or (b) `git revert`/`git reset` to a prior commit and redeploy via the same `vercel --prod --yes` flow. Neither has been exercised in this project's history (no rollback has ever been needed, per the clean, incrementally-verified commit history).

## Health checks

None configured — no uptime monitoring, no health-check endpoint (there's no backend to health-check; "is the site up" is simply "does the static HTML/JS load," which Vercel's own platform-level monitoring covers, not anything this repo configures).

## Post-deployment verification (as actually practiced in this project's history)

After every `vercel --prod --yes`, the practice observed in this project was to browser-test the live/preview URL for the specific feature just shipped (not a full regression pass against production every time — the pre-deploy `tsc`/`test`/`build` + local browser verification was treated as suf1ficient confidence, with production checked more lightly). No automated post-deploy smoke test exists. Recommended, not yet built: adopt the manual smoke-test checklist in `TESTING.md` against the production URL after any deploy that touches `src/pages/` or `src/components/`.

## Deployment checklist (synthesized from the above, for a future agent's use)

- [ ] `npx tsc -b` silent
- [ ] `npm test` → 49/49 passing
- [ ] `npm run build` succeeds
- [ ] Manual browser smoke test locally (see `TESTING.md`) if UI changed
- [ ] `git add` (specific files, not `-A` blindly — see the git-safety guidance every session in this project has followed) → `git commit` → `git push origin main`
- [ ] `vercel --prod --yes`
- [ ] Spot-check the production URL for the specific change just shipped
- [ ] Update `PROJECT_STATE.md`, `TASKS.md`, `SESSION_LOG.md`, `CHANGELOG.md` per `CLAUDE.md`'s permanent rules
