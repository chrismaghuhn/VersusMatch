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

- [ ] Lighthouse mobile `/` — see **Lighthouse Results** section (filled after deploy)
- [ ] Lighthouse mobile `/b/[slug]` — see **Lighthouse Results** section

## Lighthouse Results

**Method:** Chrome Lighthouse CLI, mobile form factor, simulated Slow 4G throttling, headless.  
**Battle URL:** `https://memefight.lol/b/eqweqwqwe-38ux` (battle with uploaded images)

| Page | Performance | Top-3 audits (impact) |
|------|-------------|------------------------|
| `/` | **94** | 1. Reduce unused JavaScript (~102 KiB) · 2. Network dependency tree · 3. Legacy JavaScript (~13 KiB) |
| `/b/eqweqwqwe-38ux` | **91** | 1. Reduce unused JavaScript (~99 KiB) · 2. LCP breakdown · 3. LCP request discovery |

_Measured 2026-06-01: Lighthouse CLI, mobile + simulated Slow 4G, headless Chrome._

## Architecture Notes (performance)

- **Feed:** `get_feed_with_results(limit, category, sort)` replaces N+1 `get_battle_results` calls
- **Public pages:** `createPublicClient()` + `revalidate=60`; no session in root layout
- **Battle page:** `React.cache()` dedupes slug fetch; client polls after 2s idle delay
- **Migration required:** `20260601120000_feed_batch_results.sql` in Supabase before feed works

## Non-Goals (unchanged)

- New features (Embed, Hall of Fame, Pro tier, comments)
- Playwright E2E setup
