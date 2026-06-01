# MemeFight Party — Live Private Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship P0 profiles + P1 private live party game (Same Meme, 2–8 players) + P1.5 lobby reactions on `/party`.

**Architecture:** Server-authoritative Postgres RPCs for all gameplay transitions; Supabase Realtime for room sync (never `party_votes`); thin Next.js API routes return `PartySnapshot` JSON; brutalist UI in `components/brutal/party/` already ported. Phase advances via `pg_cron` every 15s + idempotent client calls.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres + Auth + Realtime, existing Magic Link flow, `PARTY_ENABLED` feature flag.

**Spec:** [`docs/superpowers/specs/2026-06-03-meme-party-live-design.md`](../specs/2026-06-03-meme-party-live-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260603150000_profiles.sql` | P0 `profiles` table + RLS |
| `supabase/migrations/20260603160000_party_schema.sql` | P1 tables, RLS, Realtime publication |
| `supabase/migrations/20260603170000_party_rpc.sql` | All party RPCs + pg_cron job |
| `lib/party/types.ts` | `PartySnapshot`, reaction keys (exists) |
| `lib/party/avatar.ts` | Encode/decode preset avatar in `avatar_url` |
| `lib/party/handle.ts` | Normalize + validate handle |
| `lib/party/profanity.ts` | Caption word list |
| `lib/party/snapshot.ts` | Build `PartySnapshot` from DB rows |
| `lib/party/realtime.ts` | Client subscription helpers |
| `lib/supabase/party-rpc.ts` | Typed RPC wrappers |
| `app/api/profile/route.ts` | GET/POST profile |
| `app/api/party/**` | Thin RPC + snapshot routes |
| `app/(site)/onboarding/page.tsx` | Profile gate |
| `app/(site)/party/page.tsx` | Join / create entry |
| `app/(site)/party/room/[id]/page.tsx` | Room shell + phase router |
| `components/brutal/party/party-room-client.tsx` | Realtime + snapshot wiring |
| `components/brutal/party/party-onboarding-form.tsx` | Wired AvatarPicker |
| `assets/party-templates/` | Seed templates + LICENSE |

---

## Phase P0 — Profiles

### Task P0-1: Profiles migration + types

**Files:**
- Create: `supabase/migrations/20260603150000_profiles.sql`
- Modify: `lib/database.types.ts`

- [x] Add migration (spec Section D `profiles`)
- [x] Add `profiles` to `Database["public"]["Tables"]`
- [x] Run `npm run typecheck`

### Task P0-2: Profile API + onboarding

**Files:**
- Create: `lib/party/avatar.ts`, `lib/party/handle.ts`
- Create: `app/api/profile/route.ts`
- Create: `components/brutal/party/party-onboarding-form.tsx`
- Create: `app/(site)/onboarding/page.tsx`
- Modify: `middleware.ts` matcher → include `/party`, `/onboarding`

- [x] POST validates handle `^[a-z0-9_]{3,20}$`, stores `avatar_url` as `party:{id}:{color}`
- [x] Onboarding redirects to `returnTo` query param after save
- [x] `/party` redirects unauthenticated → login; no profile → `/onboarding?returnTo=...`

---

## Phase P1 — Party core

### Task P1-1: Schema migration

- [x] `party_templates`, `party_rooms`, `party_players`, `party_submissions`, `party_votes`, `party_round_results`, `party_reactions`
- [x] `party_is_member`, RLS policies per spec
- [x] Realtime publication (not `party_votes`)

### Task P1-2: RPC migration

- [x] `party_create_room`, `party_join_room`, `party_start_game`, `party_submit_caption`, `party_cast_vote`, `party_send_reaction`, `party_heartbeat`, `party_advance_phase`, `party_advance_stale_rooms`, `party_leave_room`
- [x] Host migration inside `party_advance_phase` step 1
- [x] pg_cron `*/15 * * * * *` → `party_advance_stale_rooms()`

### Task P1-3: Snapshot + API routes

- [x] `lib/party/snapshot.ts` + `GET /api/party/rooms/[id]`
- [x] POST routes: rooms, join, start, submit, vote, reaction, heartbeat
- [x] `PARTY_ENABLED=false` → 503 on party API

### Task P1-4: Room client + pages

- [x] `party-room-client.tsx`: Realtime per spec (no submissions sub during caption; unsub reactions on phase change)
- [x] Phase UI: lobby → caption → vote → reveal → finished
- [x] Host: unsub reactions before `POST /api/party/start`

### Task P1-5: Seed templates

- [x] Storage bucket `party-templates`, ~5–10 placeholder WebP + SQL seed rows
- [x] `MemeFrame` or new `PartyTemplateImage` uses real URLs

---

## Phase P1.5 — Lobby reactions

Covered in P1-2 (`party_send_reaction`) + P1-4 (`LobbyReactions` wired). Verify:

- [x] Rate limit via `last_reaction_at`
- [x] Snapshot query: last 20 / 5 seconds
- [x] DELETE reactions on start; client unsub first

---

## Polish (2026-05-31)

- [x] `PartyErrorState` wired to API/client codes (`room_full`, `bad_code`, `disconnected`, debounced `everyone_left`)
- [x] DE copy pass via `lib/party/copy-de.ts`
- [x] `MobileGame` layouts live (`components/brutal/party/mobile/*`)
- [x] Tutorial overlay on first `/party` visit (`memefight_party_tutorial_v1`)
- [x] Header link to `/party`
- [x] WebP template placeholders (`scripts/generate-party-templates.mjs`)
- Open Items (done vs deferred): see [Spec Section L](../specs/2026-06-03-meme-party-live-design.md#open-items) (synced 2026-05-31)

---

## P1.9 Quick Wins (2026-06-04)

- [x] ShareCard PNG download (`lib/party/share-card-png.ts`, `html-to-image`)
- [x] Footer **Party** link + **Credits** → `/credits`
- [x] Credits page + `lib/party/template-credits.ts`
- [x] Analytics funnel: `party_analytics_events` migration + RPC hooks + `npm run party:analytics`
- Open Items: see [Spec Section L](../specs/2026-06-03-meme-party-live-design.md#open-items)

---

## Testing

- [x] `scripts/test-party-handle.mjs` — handle normalize/validate (`npm run test:party-handle`)
- [x] Manual checklist: [`docs/party-manual-qa.md`](../../party-manual-qa.md)

---

## Execution order

1. P0-1 → P0-2 (this session)
2. P1-1 → P1-2 → P1-3 → P1-4 → P1-5
3. Enable `PARTY_ENABLED=true` on preview deploy only
4. Polish batch (ErrorStates, DE, MobileGame, Tutorial, Nav, WebP)
