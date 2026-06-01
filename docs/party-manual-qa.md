# MemeFight Party — Manual QA Checklist

**Production status:** `PARTY_ENABLED=true` on memefight.lol (verified **2026-06-01** — create, join, start, full round flow).

Use this checklist when changing party RPCs, Realtime, or UI. Run with at least **two** logged-in test accounts (two browsers or profiles).

## Prerequisites

- `npm run typecheck` and `npm run test:party-handle` pass
- Supabase migrations applied through **`20260608120000_party_canvas_editor`** (production VersusApp)
- **20** licensed templates in Supabase Storage (`node scripts/extract-party-templates.mjs` → `node scripts/upload-party-templates.mjs`; see `assets/party-templates/import/LICENSE`)
- UI copy: `lib/party/copy.ts` (English)

---

## Core flow

- [x] **Create lobby** — `/party` → choose 3/5/7 rounds **and rerolls (0…rounds)** → Create → lands in room with 6-char code
- [x] **Join lobby** — second browser: enter code or open `/party/join/CODE` → player appears on host without full page reload (Realtime or poll within ~3s)
- [x] **Second player (min start)** — host + one guest → host can start game (2-player minimum)
- [x] **Start game** — host Start Game → phase `caption`, **each player sees a different** template image
- [x] **Caption phase** — Top/Bottom fields; locked state after submit; timer advances phase when expired
- [ ] **Reroll** — with rerolls > 0: reroll changes meme preview; text kept; hint banner shown; budget decrements; 3rd reroll when max=2 fails
- [x] **Voting phase** — each card shows **that player's meme** + caption; **self-vote allowed**
- [x] **Reveal** — vote counts shown; scores update on players
- [ ] **Finished** — after final round: leaderboard, tie handling, **ShareCard** (copy link, copy tweet, Twitter intent opens with correct room code)

---

## Full game

- [x] **2-player game** — full round flow with exactly 2 players (production smoke test 2026-06-01)
- [ ] **5-round game** — play through all rounds; templates vary per player per round
- [ ] **8-player round 2 uniqueness** — with 8 players in round 2, all templates differ within that round (pool reset edge case)
- [ ] **Leave lobby** — non-host leaves before start → returns to `/party`; host leaves → next player becomes host; last player leaves → room abandoned
- [ ] **Retract caption** — after submit, unlock/edit caption before phase ends
- [ ] **Retract vote** — after vote, change vote before phase ends
- [ ] **Early advance** — when all players ready in caption/vote, phase advances without waiting for full timer

---

## Auth & onboarding

- [ ] **Join after login** — logged-out user opens `/party/join/XXXXXX` → login → returns to join flow → lands in lobby
- [ ] **Onboarding interrupt** — user without profile redirected to `/onboarding?returnTo=...` → save profile → returns to party URL

---

## Security & API

- [ ] **Caption secrecy** — during `caption` phase, `GET /api/party/rooms/[id]` returns only **your** submission in `submissions` (not peers' captions)
- [ ] **Profanity** — caption with blocked word rejected (409 `profanity_rejected`) via API and direct RPC path
- [ ] **Rate limits (optional)** — 6th room create within 1 hour → `rate_limited`; 11th distinct join within 1 minute → `rate_limited`

---

## Polish & errors

- [ ] **Tutorial** — first `/party` visit shows overlay; reload or after dismiss (`memefight_party_tutorial_v1`) → no overlay
- [ ] **Tutorial vs error** — `/party?error=bad_code` shows error card only, **no** tutorial overlay
- [ ] **Error join** — full room → `room_full`; invalid code → `bad_code`
- [ ] **Error solo** — all others leave mid-game → `everyone_left` only after ~2s debounce (no flash on reconnect)
- [ ] **Header nav** — **PARTY** in site header links to `/party`
- [ ] **Mobile layout** — caption/vote/reveal: bottom CTA, meme fills screen on phone width (< lg / 1024px)
- [ ] **Desktop layout (lg+)** — at 1280px: Arena PartyLayout, composited glow background, voting grid with regular card density (`minmax(230px, 1fr)`); mobile swipe UI unchanged below lg

---

## Share & polish

- [ ] **ShareCard copy link** — clipboard contains `…/party/join/CODE`
- [ ] **ShareCard Twitter** — intent URL includes room code and join URL
- [ ] **ShareCard PNG** — Download PNG saves `memefight-party-CODE.png` with meme + winner text (1200×675)
- [ ] **Footer nav** — **Party** in site footer PRODUCT column; **Credits** link in footer bar → `/credits`
- [ ] **Credits page** — `/credits` lists Party meme template attribution (20 templates + Meme Archive License)
- [ ] **Party disabled** — `PARTY_ENABLED=false` → party API returns **503** (preview/staging only)

---

## P2 Caption Studio (rich captions)

Verified on Production **2026-06-01** — full round with styled captions.

- [x] **Leading/trailing spaces** — type `" hello "` → renders correctly after submit (voting + reveal)
- [x] **Internal spaces** — two spaces mid-line preserved in preview and voting card
- [x] **Multi-line box** — Shift+Enter in a field; text wraps in live preview without clipping
- [x] **4-panel meme** — template with 4 text boxes shows 4 inputs; all boxes render in voting
- [x] **Toolbar Schräg** — toggle matches `~text~` syntax on same selection
- [x] **Sync submit parse** — submit `~hello` immediately (no debounce wait) → DB has slant segment, not literal tildes
- [x] **ShareCard PNG parity** — finished/download PNG shows same skew/scale as voting card (desktop finished PNG re-enabled)
- [x] **Legacy pipe replay** — room with old `top|bottom` pipe captions (no `captionRich`) still displays correctly

---

## P2.5 Meme Canvas Editor

Branch `feat/party-meme-canvas-p25` — `npm run typecheck`, `test:caption-fields`, `test:caption-rich`, `test:caption-layout` pass; manual verification pending before merge/deploy.

- [ ] **Canvas off** — create room without Canvas Editor toggle → caption phase **60s**, fixed template boxes, v2 submit path unchanged (identical to P2 Caption Studio)
- [ ] **Canvas on** — create room with Canvas Editor enabled → caption phase **90s** timer; overlay handles visible on meme
- [ ] **Drag template box** — canvas on: drag a template text box within bounds; preview updates live
- [ ] **Resize template box** — canvas on: resize via handle; layout clamped to image bounds (no overflow past edges)
- [ ] **WYSIWYG layout** — submit offset/resized layout in caption editor → desktop voting grid and reveal show text at the **same positions** as the editor (no fit-to-card shift); ShareCard PNG matches
- [ ] **Custom boxes** — **+ Text** adds custom box (max 2); 3rd add rejected in UI; delete removes active custom box only
- [ ] **Reset layout** — restores template box defaults and removes all custom boxes
- [ ] **Reroll dialog** — canvas on with custom boxes + rerolls: reroll shows confirmation; confirm → new meme, custom boxes gone, layout reset
- [ ] **Reroll revision** — after reroll, `layout_revision` bumps; editor state resets immediately (draft cleared server-side)
- [ ] **Undo / redo** — Ctrl+Z / Ctrl+Shift+Z (desktop) or toolbar buttons restore layout + text (stack depth 10)
- [ ] **Timer freeze** — countdown display pauses during drag/resize; phase still advances on server when timer expires
- [ ] **stale_revision** — submit with outdated `layoutRevision` (e.g. after reroll in another tab) → API/RPC error `stale_revision`
- [ ] **ShareCard PNG** — finished/download PNG matches editor layout (`density="export"`)
- [ ] **Legacy v2 replay** — canvas-off room or old v2 `caption_rich` submissions display unchanged in voting/reveal

---

## Notes

Record room IDs, browser versions, and any console/network errors when filing bugs.

Spec reference: [`docs/superpowers/specs/2026-06-03-meme-party-live-design.md`](superpowers/specs/2026-06-03-meme-party-live-design.md) — Open Items in Section L.

Analytics report (service role): `npm run party:analytics` (optional `-- 30` for 30-day window).
