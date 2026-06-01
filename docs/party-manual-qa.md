# MemeFight Party — Manual QA Checklist

Use this checklist before enabling `PARTY_ENABLED` on production. Run against a preview or local dev with `PARTY_ENABLED=true` and at least three logged-in test accounts (three browsers or profiles).

Prerequisites:

- `npm run typecheck` and `npm run test:party-handle` pass
- Supabase migrations applied (including `party_leave_room`, template seed, RPC hardening)
- Party templates uploaded: `node scripts/upload-party-templates.mjs` (requires `.env.local` service role)

---

## Core flow

- [ ] **Create lobby** — `/party` → choose 3/5/7 rounds → Create → lands in room with 6-char code
- [ ] **Join lobby** — second browser: enter code or open `/party/join/CODE` → player appears on host without full page reload (Realtime or poll within ~3s)
- [ ] **Third player** — third browser joins; host sees 3+ players
- [ ] **Start game** — host Start Game → phase `caption`, template image visible
- [ ] **Caption phase** — each player submits; locked state after submit; timer advances phase when expired
- [ ] **Voting phase** — all submissions visible; **self-vote allowed** (own caption in pool)
- [ ] **Reveal** — vote counts shown; scores update on players
- [ ] **Finished** — after final round: leaderboard, tie handling, **ShareCard** (copy link, copy tweet, Twitter intent opens with correct room code)

---

## Full game

- [ ] **5-round game** — play through all rounds; templates vary (8 placeholders; pool resets after exhaustion per `party_pick_template`)
- [ ] **Leave lobby** — non-host leaves before start → returns to `/party`; host leaves → next player becomes host; last player leaves → room abandoned

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

## Share & polish

- [ ] **ShareCard copy link** — clipboard contains `…/party/join/CODE`
- [ ] **ShareCard Twitter** — intent URL includes room code and join URL
- [ ] **Party disabled** — `PARTY_ENABLED=false` → party API returns **503**

---

## Notes

Record room IDs, browser versions, and any console/network errors when filing bugs.

Spec reference: [`docs/superpowers/specs/2026-06-03-meme-party-live-design.md`](superpowers/specs/2026-06-03-meme-party-live-design.md)
