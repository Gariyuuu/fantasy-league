# UI_SYSTEM.md

## Layout system

No layout-grid framework beyond Tailwind's utility classes. Every page is its own top-level container (`<div className="min-h-svh p-6">` or similar), individually wrapped in `<LeagueBackdrop>` for league-scoped pages. There is no shared `<Layout>` component — each page in `src/pages/` composes its own structure directly, following a consistent-by-convention (not by shared-component) pattern: outer full-height div → `mx-auto max-w-{3xl,4xl,5xl,7xl}` content column → `<LeagueNav>` (if league-scoped) → page content in `space-y-4`-spaced `.app-card` blocks.

## Navigation

`src/components/LeagueNav.tsx` — the persistent top bar on every league-scoped page. Shows the league name/sport icon (links home), current phase label, and a tab row (`Lineup`/`Event Lobby`, `Season`, `Waivers`, `Trades`, `Draft Recap`) that conditionally shows/hides tabs based on `state.config.engine`/`state.config.draft.type` (e.g., salary-cap sports show "Event Lobby" instead of "Lineup" and hide Waivers/Trades entirely, since those don't apply without a persistent roster) and only renders once the league has left the predraft/drafting phase.

No mobile hamburger menu / responsive nav collapse exists — the nav is a single flex row at all viewport widths (not verified problematic, just not specifically designed for narrow viewports — see "Responsive" below).

## Page structure

See "Layout system" above. `HomePage`/`CreateLeaguePage` are the two pages with no `<LeagueBackdrop>` (no single sport is in context on either) — they sit directly on the app-wide ambient background (see below).

## Reusable components

| Component | File | Used by |
|---|---|---|
| `LeagueNav` | `components/LeagueNav.tsx` | every league-scoped page |
| `LeagueBackdrop` | `components/LeagueBackdrop.tsx` | every league-scoped page |
| `LiveScoresTicker` | `components/LiveScoresTicker.tsx` | `SeasonDashboardPage`, `EventLobbyPage` |
| `BestAvailableList`, `PickFeed`, `RosterGrid`, `PositionNeed`, `DraftClockBar` | `components/draft/*` | `DraftRoomPage` |
| `StandingsTable`, `MatchupResults`, `PlayoffBracketView` | `components/season/*` | `SeasonDashboardPage` |
| `positionColors.ts` (`positionColor(pos)`) | `components/draft/positionColors.ts` | anywhere a position badge is rendered (draft list, lineup page, waivers, trades) |
| `sportMeta.ts` (`SPORT_ICONS`, `FIELD_NOUN`, `phaseBadgeClass`, `phaseLabelText`) | `components/sportMeta.ts` | widely reused for consistent sport iconography and phase-badge styling |

## Component hierarchy (draft room, as an example of the deepest page)

```
DraftRoomPage
├── LeagueBackdrop
│   ├── (header bar: sport icon, league name, phase, pick progress)
│   ├── DraftClockBar (only once drafting/regularSeason)
│   ├── (post-draft banner, only once regularSeason)
│   ├── grid: PositionNeed | BestAvailableList | PickFeed
│   └── RosterGrid
```

## Themes

**Dark mode only.** `color-scheme: dark` is hardcoded in `:root` in `src/index.css`. There is no light-mode stylesheet, no theme toggle component, no `prefers-color-scheme` media query usage found anywhere in the codebase. Do not assume a light mode exists or needs to be supported without an explicit request.

## Background system

Two layers:
1. **App-wide ambient background** (`html` selector in `src/index.css`): a fixed, near-black (`#05070d`) background with three soft radial gradients (emerald top-left, sky-blue top-right, violet bottom-center) — used on every page as the base, visible directly on `HomePage`/`CreateLeaguePage`.
2. **Per-sport photo backdrop** (`LeagueBackdrop.tsx`): on top of the above (visually replacing it, since it sets its own `background-image`), a real venue photo + a dark linear-gradient scrim (`rgba(5,7,13,0.88)` → `rgba(5,7,13,0.95)`, top to bottom) so the translucent `.app-card` UI stays readable. Used only on league-scoped pages where a single sport is in context.

## Colors

No formal design-token file — colors are Tailwind's default palette, used consistently by convention:

- **Primary accent**: `emerald-400`/`emerald-500` (buttons, active states, positive numbers, "in season now" labels)
- **Surface**: `zinc-800`/`zinc-900`/`zinc-950` at various opacities (`.app-card` = `bg-zinc-900/70`)
- **Text**: `zinc-200` (body), `zinc-400`/`zinc-500`/`zinc-600` (secondary/muted), `zinc-50`/`zinc-100` (headings/emphasis)
- **Secondary gradient accents**: `sky-400` (used in `.gradient-text` and some progress bars), `violet`/`purple` (ambient background only)
- **Status colors**: `emerald` = good/active/live-in-progress-positive, `amber` = warning/pending/questionable-injury-status, `rose` = danger/negative/live-red-dot/out-injury-status, `sky` = informational/drafting-phase-badge

## Typography

System font stack (`ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) — no custom web font is loaded (no `@font-face`, no Google Fonts link in `index.html`). Numeric/stat displays use `.stat-number` (`font-mono font-black tabular-nums`) for consistent digit alignment. Headings use `font-black`/`font-bold` with `tracking-tight` on the largest ones (page titles, `<h1>` in `HomePage`).

## Spacing

Standard Tailwind spacing scale, no custom scale defined. Page content columns are consistently `space-y-4`; card internal padding is consistently `p-4`/`p-6`/`px-4 py-3` depending on card density.

## Border radius

`.app-card`/`.app-card-glow` use `rounded-2xl`; buttons (`.btn-primary`/`.btn-secondary`) use `rounded-xl`; small badges/pills use `rounded-full` or `rounded-lg`/`rounded-md`.

## Shadows

`.app-card` has a subtle `shadow-lg shadow-black/30`. `.btn-primary` has a colored glow shadow (`shadow-emerald-500/25`, brightening on hover to `/40`). The draft clock has two custom keyframe animations (`clock-glow`/`clock-glow-urgent`, defined in `index.css`) that pulse a colored box-shadow — emerald normally, rose when time is running low — around the clock component.

## Breakpoints

No custom breakpoints defined (Tailwind defaults implicitly available via the utility classes, but no systematic mobile-first pass was found across the codebase — most layouts use fixed `grid-cols-N`/`max-w-*` without a responsive variant). **Not verified to be broken on mobile, but not verified to be good either** — no explicit mobile testing evidence exists in the repository or its history.

## Animation system

Defined via `@keyframes` directly in `src/index.css` (not a separate animation library): `clock-glow`/`clock-glow-urgent` (draft clock pulse), `pick-flash-in` (visible in the CSS but not fully read in this audit — likely a new-pick-appears flash in the pick feed, consistent with the file's naming). Tailwind's built-in `animate-pulse` is used elsewhere (e.g. the live-scores ticker's red "live" dot).

## Icon system

**Emoji, not an SVG icon library.** No `lucide-react`, `heroicons`, or similar dependency exists in `package.json`. `SPORT_ICONS` (in `sportMeta.ts`) maps each sport to one emoji (🏈 NFL/CFB, ⚽ EPL/MLS, ⚾ MLB, 🏀 WNBA/NBA, ⛳ PGA, 🎾 Tennis, 🏁 NASCAR). AI manager avatars are also emoji (defined per-persona in `personas.ts`, e.g. 🧊 Ice Callahan, 🚨 Blitz Okafor).

## Image asset conventions

Background photos: `src/assets/backgrounds/<sport>-<venue-type>.jpg`, imported as Vite static assets (`import nflBg from '../assets/backgrounds/nfl-stadium.jpg'`), compressed via `sips -Z 1280 -s formatOptions 45` during development (target: under ~250KB each; actual range observed: ~80KB–245KB across the 10 current backgrounds). No `.webp`/`.avif` conversion, no responsive `srcset` — one fixed-size JPEG per sport, served as-is.

## Accessibility conventions

No systematic accessibility audit evidence in the repository — no `aria-*` attributes found beyond whatever React/HTML provides implicitly (e.g. `<button>`/`<input>` semantics). No skip-links, no explicit focus-management code, no `alt` text convention verified for background images (they're CSS `background-image`, not `<img>`, so they're inherently non-decorative-content and don't need `alt` text — but no `aria-label` on the container conveys the venue photo's context to screen readers either). **This is an unaudited area, not a verified-clean one — do not claim WCAG compliance without a real audit.**

## Responsive design rules

See "Breakpoints" above — not systematically implemented. `CreateLeaguePage`'s sport-picker grid (`grid-cols-3`) and most draft-room `grid-cols-12`-style layouts are fixed-column, not responsive. If a mobile-friendly pass is ever requested, expect to need real work here, not just a quick tweak.

## Known visual inconsistencies

- `CreateLeaguePage`'s 10-sport picker grid has an orphaned single card in the last row (see `TASKS.md` UX-1) — cosmetic only.
- Background photo quality/framing varies by sport (see `DECISIONS.md` AD-007) — all are real, licensed, and reasonably on-theme, but not uniformly "dramatic packed crowd" shots (e.g. the EPL background is pitch-level action with no visible stadium bowl, unlike most others).

## The W9 numerics family layer (added 2026-09-05)

**Source of truth:** `~/Projects/.design-system/families/numerics.css` (v1.0).
**Vendored here as** ``src/design-system/numerics.css``, imported from ``src/index.css`` immediately after
`master.css`. The copy is byte-identical to the source apart from a two-line header.
**Do not patch the vendored copy** — fix the source and re-vendor, exactly as with
`MASTER.css`.

### What it is

A *family* layer, sitting between `MASTER.css` and per-project overrides:

```
MASTER.css  ->  families/numerics.css  ->  overrides/<project>.css  ->  this repo's globals.css
```

MASTER holds what all 115 portfolio repos need. A family layer holds what one kind of
surface needs and no one else does. "Green means up" is meaningless in a 3D world or a
narrative game; tabular numerals are wrong for prose. Twelve numbers-first repos share
this one (see `~/Projects/OVERHAUL-GROUPS.md` group W9).

### What it provides

| Class | Use |
|---|---|
| `.num` | tabular figures on any element |
| `.num-col` | right-aligned tabular column — **apply to the `<th>` and the `<td>`** |
| `.num-mono` | monospaced identifier column (ticker, order id) with a slashed zero |
| `.num-display` | a headline figure |
| `.delta[data-dir="up\|down\|flat"]` | a signed change (see the rule below) |
| `.delta-chip` | the same, as a filled pill |
| `.spark` / `.spark-line` / `.spark-area` / `.spark-dot` | one sparkline stroke spec |
| `.feed-card` + `-meta` / `-title` / `-body` / `-foot` / `-link` | the shared feed entry |
| `.freshness[data-state="live\|stale\|offline\|loading"]` + `.freshness-dot` | refresh state |
| `.no-data` + `.no-data-title` / `.no-data-body` | a surface with a known shape and nothing in it |
| `.is-stale`, `.num-flash`, `.num-ghost` | stale region, value-change flash, ghost row |

### The rule this layer exists to enforce

**A signed number never states its direction in colour alone.** Red/green is the most
common colour-vision collision (deuteranopia, ~6% of men) and every surface in this
family is one where a sign is the point. `.delta` emits ▲/▼/– from `::before`, so a
call site *cannot* forget it. If a surface genuinely cannot carry the glyph, use
`data-cue="sign"` (explicit +/−) — still redundant, still non-colour. `data-cue="none"`
exists only for values that already print their own sign, and using it is a decision to
be justified, not a default.

`content` is deliberately declared **twice** on `.delta::before`. The second is the
CSS alt-text form (`content: "▲" / ""`), which marks the glyph decorative so assistive
tech reads the number rather than "black up-pointing triangle" — but it is only
understood by Chrome 77+, Firefox 118+, Safari 17.4+. In an older engine that whole
declaration is invalid and the glyph would vanish, taking the accessible cue with it.
The plain declaration is the fallback. Do not "clean up" the duplicate.

### Dark mode is opt-in by selector

Dark values attach only to `.dark`, `[data-theme="dark"]` and `[data-scheme="dark"]` —
never to `prefers-color-scheme`, because a light-only app on a dark-OS machine would
otherwise inherit the dark ramp on a white background and fail contrast everywhere.
**This app is dark-only and has no theme class** (it sets `color-scheme: dark`
in CSS), so `index.html`'s `<html>` carries `data-scheme="dark"`. Without that hook the
family layer would serve its *light* delta colours onto a near-black gradient backdrop.

### Contrast

Every family token clears **4.5:1 as text** on the MASTER surface stack in both ramps
(light: up 4.67, down 5.13, flat 5.03, warn 4.54; dark: 8.04 / 5.28 / 5.69 / 7.45).
Re-measure after any re-tint with `python3 ~/Projects/.design-system/tools/contrast.py <ink> <surface>`.

### This repo re-points the family tokens at its own palette

The app sits on a saturated near-black gradient and already speaks in emerald/rose, so
`src/index.css` binds `--num-up`/`--num-down`/`--num-flat`/`--num-warn` to those hues.
Measured against the darkest backdrop stop (`#05070d`) and the zinc-900 card:
emerald `#34d399` **10.48:1 / 9.22:1**, rose `#fb7185` **7.48:1 / 6.58:1**.

That binding is declared **unlayered**, while the family layer's dark ramp sits in
`@layer tokens`. Per the cascade-layers spec unlayered normal declarations beat every
layer, so the repo palette wins — verified by inspecting the built CSS, not assumed.

`.stat-number` (this repo's pre-existing `font-mono font-black tabular-nums`) is kept
and now sits alongside `.num-col` for table columns.
