# MemeFight Stabilization Audit — Design Spec

**Date:** 2026-05-31  
**Status:** Complete  
**Closed:** 2026-06-01  
**Phase:** Post-Brutalist-Launch hardening + performance closeout

## Goal

Make MemeFight production-ready after the brutalist redesign by deploying pending fixes, running a systematic smoke audit on memefight.lol, and resolving findings by priority. No new product features in this phase.

## Delivered in closeout commit

- Batch feed RPC (`get_feed_with_results`) — single DB round-trip for Home/Feed
- ISR `revalidate=60` on `/`, `/feed`; cached stats + parallel home fetches
- Static header (client auth island) — no layout `cookies()` on public pages
- Server `BattleCard` + `FeedImage` (no feed hydration); dynamic Turnstile; delayed poll
- Bundle tuning: `optimizePackageImports`, Inter 600/900, AVIF/WebP, Sentry replay off
- Full English UI copy pass

## Delivered in performance phases (post-closeout)

- API routes for vote polling (`/api/battle/[id]/results`), header auth (`/api/me`), magic link (`/api/auth/magic-link`) — no browser Supabase on public pages
- Deferred Sentry client init + `bundleSizeOptimizations` (shared JS **179 kB → 104 kB**)
- Battle vote UI split: server-rendered grid (`BattleVoteSection` + `BattleSideDisplay`); client island (`BattleVoteControls`) for voting, polling, share
- LCP image strategy: Side A only `priority` + preload; Side B `loading="eager"` without competing preload (fixes Speed Index regression on Slow 4G)

## Success Criteria

- [x] All pending fixes deployed to production
- [x] P0 flows pass (create, vote, images — user verified)
- [x] No known vote/create/admin blockers
- [x] Lighthouse Performance ≥ 80 on `/` and `/b/[slug]` (mobile, Slow 4G) — see scores below
- [x] All user-facing copy in English

## Smoke Audit Checklist (production)

### Vote flow (P0)

- [x] Battle page loads without runtime errors
- [x] Option images render when `image_path` exists
- [x] Vote submits without `JSON.parse` SyntaxError
- [x] Results update after vote; VS moves toward winning side
- [x] Share / copy link works
- [ ] Turnstile + report email — manual verify when needed

### Create flow (P0)

- [x] Battle with images uploads successfully
- [x] Redirect to `/b/[slug]` with images visible

### Feed & Home (P1)

- [x] Home hero stats show real numbers
- [x] Feed cards show images and vote percentages
- [x] Category + sort filters work

### Performance (P2)

- [x] Lighthouse mobile `/` — **95**
- [x] Lighthouse mobile `/b/[slug]` — **97**

## Lighthouse Results

**Method:** Chrome Lighthouse CLI, mobile form factor, simulated Slow 4G throttling, headless incognito.  
**Battle URL:** `https://memefight.lol/b/eqweqwqwe-38ux` (battle with uploaded images)

| Page | Performance | LCP | Speed Index | TBT | CLS | Top audits (impact) |
|------|-------------|-----|-------------|-----|-----|---------------------|
| `/` | **95** | 2.9s | 2.6s | 70ms | 0 | LCP · Speed Index · unused JS (~108 KiB shared chunk) |
| `/b/eqweqwqwe-38ux` | **97** | 2.6s | 2.7s | 50ms | 0 | LCP · Speed Index · bfcache |

_Measured 2026-06-01 (final): Lighthouse CLI 13.x, mobile + simulated Slow 4G, headless Chrome. Battle score confirmed on two consecutive runs (97 + 96). Prior dual-`priority` preload caused Speed Index ~11s; single LCP preload restored SI to ~3s._

## Architecture Notes (performance)

- **Feed:** `get_feed_with_results(limit, category, sort)` replaces N+1 `get_battle_results` calls
- **Public pages:** `createPublicClient()` + `revalidate=60`; no session in root layout
- **Battle page:** Server grid (`battle-vote-section.tsx`) + client controls island; `React.cache()` slug dedupe; poll after 2s delay; Side A LCP preload only
- **Auth/login:** Magic link via `POST /api/auth/magic-link` — no `@supabase/ssr` browser client on `/auth/login`
- **Migration required:** `20260601120000_feed_batch_results.sql` in Supabase before feed works

## Non-Goals (unchanged)

- New features (Embed, Hall of Fame, Pro tier, comments)
- Playwright E2E setup
