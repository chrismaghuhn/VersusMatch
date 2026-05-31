# MemeFight Brutalist Redesign — Design Spec

**Date:** 2026-05-31  
**Status:** Approved  
**Source mock:** `C:\Users\chris\Documents\Neuer Ordner\Complete design for VersusMatch` → `BrutalistVersion`

## Goal

Replace MemeFight's current soft Geist/purple UI with the approved **brutalist** visual system from the Figma export. Port Figma components into the existing Next.js 15 app and wire them to **real Supabase data only** — no fake marketing sections.

## Non-Goals

- RageWall, MegaMarquee, LiveTicker with fabricated content
- Comments / social feed API
- Editorial or Fight Night variants from the mock
- Stack migration (stay on Next.js + Supabase + Vercel)
- New product features (brackets, embed, Pro tier)

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|--------|
| `--brutal-bg` | `#000000` | Page background |
| `--brutal-surface` | `#0a0a0a` | Sections, cards |
| `--brutal-primary` | `#CCFF00` | CTAs, selection, win states |
| `--brutal-accent` | `#FF2D87` | Badges, alerts, VS energy |
| `--brutal-secondary` | `#00E1FF` | Secondary highlights |
| `--brutal-warning` | `#FFB800` | Stats, timers |
| `--brutal-border` | `rgba(255,255,255,0.1)` | All dividers |
| `--brutal-muted` | `rgba(255,255,255,0.35–0.6)` | Secondary text |

Map into Tailwind `@theme` in [`app/globals.css`](app/globals.css), replacing current oklch purple tokens.

### Typography

- **Font:** Inter (weights 400, 600, 800, 900) via `next/font/google`
- **Headlines:** 900 weight, negative letter-spacing (`-0.04em` to `-0.065em`), tight line-height (~0.82–0.92)
- **Labels:** 10–11px, uppercase, wide tracking (`0.15em–0.22em`)
- **Body:** 14–16px, white at 70–80% opacity on black

Geist may be removed from [`app/layout.tsx`](app/layout.tsx) or kept only for monospace stats.

### Shape & Effects

- **Border radius:** 0–2px max (override shadcn `rounded-lg` defaults)
- **Borders:** 1px solid `border-white/10`; emphasis blocks use solid fills (no glassmorphism except rare backdrop on badges)
- **Shadows:** Minimal; prefer hard offset or none
- **Decorative:** Reuse mock `Noise` component (SVG/CSS grain), optional grid overlay on hero sections only
- **Selection:** `::selection { background: #CCFF00; color: #000 }`

### UI Primitives

Update [`components/ui/button.tsx`](components/ui/button.tsx), [`input.tsx`](components/ui/input.tsx):

| Variant | Style |
|---------|--------|
| Primary | `#CCFF00` bg, black text, no radius |
| Ghost | Transparent, white border |
| Destructive | `#FF2D87` fill |
| Outline | `border-white/20`, hover `white/10` bg |

## Component Port Map

Figma source → MemeFight target:

| Figma (`src/app/components/`) | Target | Data source |
|-------------------------------|--------|-------------|
| `Header.tsx` | [`components/site-header.tsx`](components/site-header.tsx) | `getSession()` |
| `Footer.tsx` | `components/site-footer.tsx` (new) | Static links |
| `Hero.tsx` | [`app/page.tsx`](app/page.tsx) | `/api/stats` + feed preview |
| `BattleFeed.tsx` | [`app/feed/page.tsx`](app/feed/page.tsx) + [`battle-card.tsx`](components/battle-card.tsx) | `getActiveBattlesFeed` |
| `FeaturedBattle` layout patterns | [`components/battle-vote.tsx`](components/battle-vote.tsx) | Battle + `getBattleResults` + `/api/vote` |
| `CreateCta` styling | [`app/create/page.tsx`](app/create/page.tsx) | Existing server actions |
| `Noise.tsx` | `components/brutal/noise.tsx` (new) | Static |

**Excluded from port:** `RageWall`, `MegaMarquee`, `LiveTicker` (fake data).

**Optional later:** `TopTicker` band in header — only after `/api/stats` exists.

## Pages (full scope)

All routes get brutalist shell (header/footer) and page-specific layouts:

1. `/` — Home (Hero + recent battles grid)
2. `/feed` — Full feed + [`feed-filters.tsx`](components/feed-filters.tsx) restyled
3. `/b/[slug]` — Battle vote (highest priority UX)
4. `/create` — Create battle form
5. `/auth/login` — Login
6. `/my-battles` — Creator list
7. `/admin/login`, `/admin/reports` — Moderation (functional, minimal flair)

Secondary: [`battle-report-button.tsx`](components/battle-report-button.tsx), [`turnstile-widget.tsx`](components/turnstile-widget.tsx), [`results-bar.tsx`](components/results-bar.tsx) — restyle only, no logic changes.

## New API: Public Stats

**Route:** `GET /api/stats`

**Response:**
```json
{
  "activeBattles": 12,
  "totalVotes": 48291,
  "votesLast24h": 1204
}
```

**Implementation:** Server route using Supabase admin or anon-safe RPC/count queries. Cache `Cache-Control: public, s-maxage=60` to limit DB load.

**Used by:** Home Hero badge (replaces mock "14 BATTLES LIVE"), optional header ticker in phase 2.

No new tables required for V1 stats.

## Port Rules (Figma → Next.js)

1. Do **not** copy `node_modules`, MUI, or unused Radix components from the mock repo
2. Convert client-only interactivity explicitly (`"use client"`)
3. Replace `ImageWithFallback` with `next/image` + Supabase storage URLs
4. Keep existing auth, vote, report, rate-limit, Turnstile, Sentry behavior unchanged
5. Preserve accessibility: focus rings (lime), contrast on `#CCFF00` buttons, keyboard vote flow
6. Mobile-first: mock's 12-column grid collapses to single column under `md`

## Implementation Phases

### Phase 1 — Foundation (0.5–1 day)
- Design tokens in `globals.css`
- Inter font in layout
- Brutalist button/input variants
- `Noise` component

### Phase 2 — Shell (0.5 day)
- Port Header, new Footer
- Replace [`site-header.tsx`](components/site-header.tsx) sticky brutal bar

### Phase 3 — Battle Page (1–2 days)
- Restyle `battle-vote`, `results-bar`, report button, Turnstile wrapper
- VS layout, vote buttons, share copy — match FeaturedBattle energy with real data

### Phase 4 — Home + Feed (1–2 days)
- Home Hero + battle grid
- Feed cards + filters
- `GET /api/stats` for Hero metrics

### Phase 5 — Remaining routes (1–2 days)
- Create, login, my-battles, admin pages

### Phase 6 — Polish (0.5 day)
- OG/Twitter meta consistency (dark + lime accent in descriptions)
- Report email HTML optional rebrand
- Lighthouse pass on `/` and `/b/[slug]`

## Error Handling

- Stats API failure: Hero shows fallback copy without numbers ("Battles live now")
- Image load failures: gray brutal placeholder box with border
- Vote/report/admin flows: existing error messages, styled with `#FF2D87` text

## Testing

- Visual: Home, Feed, Battle (voted + not voted), Create, Login on mobile + desktop
- Functional: Vote, share, report, create battle, admin login — unchanged behavior
- Performance: no new client bundles from MUI; avoid re-adding Sentry Session Replay
- CSP: no new external font/script domains beyond Google Fonts (Inter)

## Success Criteria

- All public and auth routes visually consistent with brutalist mock
- Battle page feels like Figma `FeaturedBattle` but uses live Supabase data
- No mock/fake user content on production
- Core Web Vitals not worse than pre-redesign on warm requests
