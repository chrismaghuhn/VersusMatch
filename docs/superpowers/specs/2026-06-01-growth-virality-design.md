# MemeFight Growth / Virality — Design Spec

**Date:** 2026-06-01  
**Status:** Complete  
**Phase:** Post-stabilization growth (Lighthouse 95/97)

## Goal

Increase organic discovery and share conversion via branded social previews, SEO infrastructure, and improved share flows — without new product features (comments, Pro tier, embed).

## Success Criteria

- Battle links show branded 1200×630 OG image with title, options, and vote percentages
- `sitemap.xml` and `robots.txt` live; battle URLs indexable
- Post-vote and post-create share prompts with platform deep links (WhatsApp, X, Telegram)
- 5–10 seed battles on production for feed/sitemap content

## Phase 1 — Branded OG + SEO

### Dynamic OG (`app/b/[slug]/opengraph-image.tsx`)

- 1200×630 black brutalist card
- Title (truncated), Option A vs B labels with percentages, vote count
- Side thumbnails when `image_path` exists (text fallback otherwise)
- MemeFight watermark bottom-right
- `revalidate = 60` aligned with battle page

### SEO infrastructure

- `metadataBase` from `NEXT_PUBLIC_APP_URL` in root layout
- `app/sitemap.ts` — `/`, `/feed`, active `/b/[slug]` URLs
- `app/robots.ts` — allow public routes; disallow `/admin`, `/api`, `/auth`
- JSON-LD on battle page: `WebPage` + interactive `Question` with two `Answer` options

### Default OG

- `app/opengraph-image.tsx` — site-wide default for home/feed metadata

## Phase 2 — Share UX

- Post-vote dismissible banner: "Share your pick"
- Platform links: WhatsApp, X, Telegram + existing copy/Web Share
- Share text: `"{title} — I voted {side}. {url}"`
- Create redirect: `/b/[slug]?created=1` with share banner on battle page

## Non-Goals

- Embed widget (Phase 3, deferred)
- Hall of Fame, comments, Pro tier, Playwright E2E

## Verification

- Open Graph: share debugger on a battle URL with images
- Sitemap: `GET /sitemap.xml` contains battle slugs
- Share: post-vote platform buttons open correct intents
