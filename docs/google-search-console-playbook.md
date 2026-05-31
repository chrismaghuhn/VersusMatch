# Google Search Console — MemeFight Playbook

Operational checklist for organic traffic via battle landing pages. Home is indexed; long-tail growth comes from `/b/` URLs and category feeds.

## Prerequisites

- Property verified: [Search Console](https://search.google.com/search-console) → `https://memefight.lol`
- Sitemap live: `https://memefight.lol/sitemap.xml`
- Robots: `https://memefight.lol/robots.txt` (must reference sitemap without double slash)

---

## Phase 1 — One-time setup (~15 min)

### 1. Submit sitemap

1. Search Console → **Sitemaps**
2. Add: `sitemap.xml`
3. Expected: Status **Success**, ~35+ URLs (home, feed, trending, 6 category pages, battles)

Verify locally:

```bash
npm run seo:list-urls
```

Or open `https://memefight.lol/sitemap.xml` in the browser.

### 2. Request indexing for priority battle URLs

Search Console → **URL inspection** → paste URL → **Request indexing**

Submit these five search-friendly battles first (update slugs if seed script changed):

| Battle | URL |
|--------|-----|
| Pizza vs Burger | `https://memefight.lol/b/pizza-vs-burger-seed01` |
| Minecraft vs Fortnite | `https://memefight.lol/b/minecraft-vs-fortnite-seed04` |
| iPhone vs Android | `https://memefight.lol/b/iphone-vs-android-seo01` |
| Marvel vs DC | `https://memefight.lol/b/marvel-vs-dc-seo01` |
| Coffee vs Tea | `https://memefight.lol/b/coffee-vs-tea-seed02` |

Also submit:

- `https://memefight.lol/trending`
- `https://memefight.lol/feed/gaming`
- `https://memefight.lol/feed/food`

**Note:** “No referring sitemaps” on `/` clears after Google processes the sitemap (1–3 days).

---

## Phase 2 — Content (ongoing)

Google indexes **battle pages**, not generic homepage queries.

**Rules for searchable battles:**

- Title = what people search (`X vs Y`, concrete, English)
- Both options named clearly (meta description auto-generated)
- Upload images when possible (OG + engagement)
- Share in group chats after creation (WhatsApp/Reddit/Discord)

**Target:** 45 active battles by end of month (currently ~25 on prod). Cadence: **5 new battles per week** with searchable `X vs Y` titles.

### 4-week content cadence

| Week | New battles | Example titles |
|------|-------------|----------------|
| 1 | 5 | Mac vs Windows, Spotify vs Apple Music, Valorant vs CS2, Beer vs Wine, City vs Country |
| 2 | 5 | Nintendo vs Steam Deck, Gym vs Home Workout, Book vs Movie, Reddit vs X, Electric vs Gas |
| 3 | 5 | Harry Potter vs LOTR, Jordan vs LeBron, Hot Dog vs Sandwich, Chrome vs Firefox, Sushi vs Burger |
| 4 | 5 | Early Bird vs Night Owl, Brainrot vs Classic Memes, Batman vs Superman, Manual vs Auto, Breakfast vs Brunch |

After each battle: share link in 1–2 group chats immediately.

Seed more battles:

```bash
npm run seed:battles
```

Requires `SUPABASE_SERVICE_ROLE_KEY` and `SEED_CREATOR_ID` (or first auth user) in `.env.local`.

---

## Phase 3 — Weekly monitoring (~5 min)

Every week in Search Console:

| Area | What to check | Goal |
|------|---------------|------|
| **Pages** | Indexed pages count | Rising toward 20+ |
| **Performance** | Filter page URL contains `/b/` | Impressions then clicks |
| **Sitemaps** | No errors, URL count matches live sitemap | Green status |
| **Core Web Vitals** | Mobile URLs | No new “Poor” battle URLs |

Export baseline: note indexed count and `/b/` impressions each Monday.

### Weekly log template

Copy each Monday into a note or issue:

```
Week of YYYY-MM-DD
- Indexed pages: ___
- /b/ impressions (7d): ___
- /b/ clicks (7d): ___
- Sitemap status: OK / errors
- New battles created: ___
- Battles shared in chats: ___
- Notes:
```

**Normal in week 1–2:** 0 clicks, low impressions. Success metric = indexed battle URLs, not homepage rank.

---

## Quick verification commands

```bash
# List URLs for manual GSC submission
npm run seo:list-urls

# Re-seed searchable battles (skips existing slugs)
npm run seed:battles
```

## Related code

- Sitemap: `app/sitemap.ts`
- Category SEO pages: `app/feed/[category]/page.tsx`
- Battle metadata: `app/b/[slug]/page.tsx`
- Trending page: `app/(site)/trending/page.tsx`
- Embed (noindex): `app/(embed)/embed/b/[slug]/page.tsx`
