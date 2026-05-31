# MemeFight Stabilization Audit — Design Spec

**Date:** 2026-05-31  
**Status:** Approved  
**Phase:** Post-Brutalist-Launch hardening

## Goal

Make MemeFight production-ready after the brutalist redesign by deploying pending fixes, running a systematic smoke audit on memefight.lol, and resolving findings by priority. No new product features in this phase.

## Non-Goals

- New features (Embed, Hall of Fame, Pro tier, comments)
- Brutalist visual redesign changes
- New E2E test framework (Playwright/Cypress setup)
- Stack or infrastructure migration

## Context

**Already live (main):** Brutalist UI, stats API, ops stack (admin sessions, reports, Resend, Turnstile, Sentry), performance fixes.

**Local only (not yet on production):**

| Fix | Files |
|-----|-------|
| Exact Supabase hostname in `remotePatterns` | `next.config.ts` |
| `BattleImage` with native `<img>` fallback | `components/battle-image.tsx` |
| VS slider direction (`aPct`, green bottom) | `components/battle-vote.tsx` |
| Safe vote JSON parsing | `lib/votes.ts`, `lib/parse-json-response.ts` |
| Vote API try/catch always returns JSON | `app/api/vote/route.ts` |
| Turnstile verify safe JSON | `lib/turnstile.ts` |
| Vote origin guard (www + dev) | `lib/vote-request-guards.ts` |
| Upload failure rollback + error messages | `app/create/actions.ts`, `app/create/page.tsx` |
| Feed cards use `BattleImage` | `components/battle-card.tsx` |
| Polling error isolation | `components/battle-vote.tsx` |

## Success Criteria

- All pending fixes deployed to production
- All P0 flows pass on memefight.lol (desktop + mobile)
- No known vote/create/admin blockers open
- Lighthouse Performance ≥ 80 on `/` and `/b/[slug]` (mobile)
- Findings documented; P0/P1 resolved in this sprint

## Phase 1 — Deploy Pending Fixes

1. Commit all stabilization files (exclude `.agents/`, `skills-lock.json`)
2. Push to `main` → Vercel auto-deploy
3. Verify deploy succeeded in Vercel dashboard

## Phase 2 — Smoke Audit Checklist

Run on **production** (https://memefight.lol). Mark pass/fail per item.

### Vote flow (P0)

- [ ] Battle page loads without runtime errors
- [ ] Option images render when `image_path` exists in DB
- [ ] Text-only battles show label placeholder (no crash)
- [ ] Vote submits without `JSON.parse` SyntaxError
- [ ] Turnstile appears and vote succeeds when configured
- [ ] Results update after vote; VS moves toward winning side
- [ ] VS at center with 0 votes; green side (A) → VS down; pink side (B) → VS up
- [ ] Live polling (8s) updates counts without console errors
- [ ] Share / copy link works

### Create flow (P0)

- [ ] Unauthenticated user redirected to login
- [ ] Magic link login → create page
- [ ] Battle with images uploads successfully
- [ ] Failed image upload shows error (no silent text-only battle)
- [ ] Redirect to `/b/[slug]` with images visible

### Feed & Home (P1)

- [ ] Home hero stats show real numbers (or sane fallback)
- [ ] Feed cards show images and vote percentages
- [ ] Category + sort filters work
- [ ] Empty states render correctly

### Report & Admin (P0)

- [ ] Report submit succeeds; email received at `REPORT_NOTIFY_EMAIL`
- [ ] `/admin/login` requires secret; no data without session
- [ ] Reports list: Offen / Alle filters
- [ ] Actions: Erledigt, Schließen, Löschen work

### Mobile (P1)

- [ ] Battle page: stacked layout, VS moves horizontally
- [ ] Header CTA + navigation usable
- [ ] Create form usable on small viewport

### Performance (P2)

- [ ] Lighthouse mobile on `/` — Performance ≥ 80
- [ ] Lighthouse mobile on `/b/[slug]` — Performance ≥ 80
- [ ] No regression vs pre-redesign warm-load times (subjective)

## Phase 3 — Fix Findings

| Priority | Definition | SLA |
|----------|------------|-----|
| **P0** | Core flow broken (vote, create, admin, crash) | Fix before phase close |
| **P1** | Images, VS, stats wrong, mobile layout broken | Fix in same sprint |
| **P2** | Lighthouse, minor UI polish | Backlog if time runs out |

Document each failure: URL, steps, expected vs actual, browser/device.

## Architecture Notes

No new APIs or schema changes expected. Fixes stay in existing routes and components.

**Vote request guard:** `isVoteRequestAllowed` compares request origin to `NEXT_PUBLIC_APP_URL` with www-normalization. Verify `NEXT_PUBLIC_APP_URL=https://memefight.lol` on Vercel.

**Images:** Next.js optimizer requires exact Supabase hostname in `remotePatterns`. `BattleImage` falls back to unoptimized `<img>` on optimizer failure.

**Error handling:** All client `fetch` → JSON paths use `parseJsonResponse`; vote API wrapped in try/catch.

## Testing Approach

- Manual checklist only (no new automated tests in this phase)
- Test at least one battle **with uploaded images** (not text-only)
- Test vote from desktop Chrome and mobile viewport (DevTools or real device)
- Re-test after each P0 fix deploy

## Rollback

If deploy breaks production: revert commit on `main` via Vercel instant rollback or git revert + push.

## Deliverables

1. Deployed stabilization commit on production
2. Completed checklist (pass/fail notes in issue or chat)
3. P0/P1 fixes merged
4. Optional: update `DEPLOY.md` smoke section if new checks added

## Implementation Order

1. Commit + push pending fixes
2. Production smoke audit (checklist above)
3. Fix P0 findings → deploy
4. Fix P1 findings → deploy
5. Lighthouse pass → close phase
