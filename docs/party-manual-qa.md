# MemeFight Party — Manual QA Checklist

Use this checklist before enabling `PARTY_ENABLED` on production. Run against a preview or local dev with `PARTY_ENABLED=true` and at least **two** logged-in test accounts (two browsers or profiles; a third is optional for 3+ player flows).

Prerequisites:

- `npm run typecheck` and `npm run test:party-handle` pass
- Supabase migrations applied (including `party_leave_room`, template seed, RPC hardening, `party_retract_*`, `party_min_players_2`, `party_analytics_events`, **`party_own_meme_mode`**)
- Party templates: `node scripts/generate-party-templates.mjs` then `node scripts/upload-party-templates.mjs` (8× `meme-*.svg` in `assets/party-templates/`) (requires `.env.local` service role)

---

## Core flow

- [ ] **Create lobby** — `/party` → choose 3/5/7 rounds **and rerolls (0…rounds)** → Create → lands in room with 6-char code
- [ ] **Join lobby** — second browser: enter code or open `/party/join/CODE` → player appears on host without full page reload (Realtime or poll within ~3s)
- [ ] **Second player (min start)** — host + one guest → host can start game (2-player minimum)
- [ ] **Start game** — host Start Game → phase `caption`, **each player sees a different** template image
- [ ] **Caption phase** — Oben/Unten fields; locked state after submit; timer advances phase when expired
- [ ] **Reroll** — with rerolls > 0: reroll changes meme preview; text kept; hint banner shown; budget decrements; 3rd reroll when max=2 fails
- [ ] **Voting phase** — each card shows **that player's meme** + caption; **self-vote allowed**
- [ ] **Reveal** — vote counts shown; scores update on players
- [ ] **Finished** — after final round: leaderboard, tie handling, **ShareCard** (copy link, copy tweet, Twitter intent opens with correct room code)

---

## Full game

- [ ] **2-player game** — full round flow with exactly 2 players (regression after min-players change)
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

- [ ] **Caption secrecy** — during `caption` phase, `GET /api/party/rooms/[id]` returns only **your** submission in `submissions` (not peers’ captions)
- [ ] **Profanity** — caption with blocked word rejected (409 `profanity_rejected`) via API and direct RPC path
- [ ] **Rate limits (optional)** — 6th room create within 1 hour → `rate_limited`; 11th distinct join within 1 minute → `rate_limited`

---

## Polish & errors

- [ ] **Tutorial** — first `/party` visit shows overlay; reload or after dismiss (`memefight_party_tutorial_v1`) → no overlay
- [ ] **Tutorial vs error** — `/party?error=bad_code` shows error card only, **no** tutorial overlay
- [ ] **Error join** — full room → `room_full`; invalid code → `bad_code`
- [ ] **Error solo** — all others leave mid-game → `everyone_left` only after ~2s debounce (no flash on reconnect)
- [ ] **Header nav** — **PARTY** in site header links to `/party`
- [ ] **Mobile layout** — caption/vote/reveal: bottom CTA, meme fills screen on phone width

---

## Share & polish

- [ ] **ShareCard copy link** — clipboard contains `…/party/join/CODE`
- [ ] **ShareCard Twitter** — intent URL includes room code and join URL
- [ ] **ShareCard PNG** — Download PNG saves `memefight-party-CODE.png` with meme + winner text (1200×675)
- [ ] **Footer nav** — **Party** in site footer PRODUCT column; **Credits** link in footer bar → `/credits`
- [ ] **Credits page** — `/credits` lists Party meme template attribution
- [ ] **Party disabled** — `PARTY_ENABLED=false` → party API returns **503**

---

## Notes

Record room IDs, browser versions, and any console/network errors when filing bugs.

Spec reference: [`docs/superpowers/specs/2026-06-03-meme-party-live-design.md`](superpowers/specs/2026-06-03-meme-party-live-design.md) — Open Items in Section L.

Analytics report (service role): `npm run party:analytics` (optional `-- 30` for 30-day window).
