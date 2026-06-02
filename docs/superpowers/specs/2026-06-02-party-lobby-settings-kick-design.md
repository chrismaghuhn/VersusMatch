# MemeFight Party — Lobby settings + host kick

**Date:** 2026-06-02  
**Status:** Approved — ready for implementation plan  
**Phase:** Post-QA host control (between Wave 2.5 and Wave 3a)  
**Builds on:** P1 lobby, Wave 1 rematch, Wave 2 guess phase, canvas editor (`caption_duration_seconds`), Wave 2.5 lobby polls  
**Source:** Brainstorm 2026-06-02 — user approved minimal create + save-in-lobby

## Goal

Let the **host** configure game rules in the **waiting lobby** (timers, player cap, rounds, rerolls, feature toggles) and **remove disruptive players** before start. Guests see live read-only settings. Create flow stays fast with server defaults.

## Success criteria

- Host changes any allowed setting in `waiting` → all members see updated values within ~3s (existing room poll / Realtime)
- `party_join_room` respects per-room `max_players` (2–8)
- Vote phase duration uses `vote_duration_seconds` (20 / 30 / 45) in `party_advance_phase` and early-advance paths
- Caption phase uses `caption_duration_seconds` (30–120, step 15) everywhere timers are set
- Kick removes player from lobby; optional 24h room ban blocks re-join with `banned_from_room`
- `/party` create: one action (no rounds/rerolls/toggles on create screen)
- English copy in `lib/party/copy.ts`
- `npm run test:party-handle` + new RPC unit tests green

## Non-goals

- Settings changes after `party_start_game` (locked for game duration; rematch returns to `waiting` with same room settings)
- Spectator / watch mode (Wave 3a)
- Public lobbies / browse (Wave 3b)
- Host-editable lobby polls (Wave 2.5 stays static rotation)
- Auto-save on every control change (v1 uses explicit **Save**)
- Global account ban (only per-room, 24h TTL)

---

## UX decisions (fixed)

| Topic | Choice |
|--------|--------|
| When editable | **`waiting` only**, host only |
| Create screen | **Minimal** — join code + create/join only; no round/reroll/toggle form |
| Lobby save | **Save button** — single RPC per save; disabled while saving; toast on success/error |
| Caption timer | Presets **60 / 90** + custom **30–120** (15s steps) |
| Vote timer | **20 / 30 / 45** seconds |
| Max players ↓ | Blocked until `max_players >= current player count` |
| Kick | **Soft kick** default; checkbox **“Block re-join for 24h”** → room ban |
| Feature toggles in lobby | Canvas editor, round modifiers (chaos), author guess |

### Create defaults (server)

Applied in `party_create_room` when client sends no options:

| Setting | Default |
|---------|---------|
| `round_count` | 5 |
| `rerolls_per_player` | 2 |
| `canvas_editor_enabled` | `true` |
| `caption_duration_seconds` | 90 |
| `vote_duration_seconds` | 30 |
| `round_modifiers_enabled` | `false` |
| `author_guess_enabled` | `true` |
| `max_players` | 8 |

Host adjusts in lobby before start.

---

## Data model

### `party_rooms` (alter)

| Column | Type | Notes |
|--------|------|-------|
| `vote_duration_seconds` | `smallint not null default 30` | CHECK `(vote_duration_seconds in (20, 30, 45))` |
| `max_players` | `smallint not null default 8` | CHECK `(max_players between 2 and 8)` |

**Alter existing:**

- `caption_duration_seconds`: replace CHECK `(60, 90)` with `(caption_duration_seconds between 30 and 120 and caption_duration_seconds % 15 = 0)`

Existing rows: keep current values (60/90); backfill `vote_duration_seconds = 30`, `max_players = 8` via defaults.

### `party_room_bans` (new)

| Column | Type | Notes |
|--------|------|-------|
| `room_id` | uuid FK `party_rooms` ON DELETE CASCADE | |
| `user_id` | uuid FK `auth.users` ON DELETE CASCADE | |
| `banned_by` | uuid FK `auth.users` | host at kick time |
| `expires_at` | timestamptz NOT NULL | `now() + interval '24 hours'` |
| PK | `(room_id, user_id)` | |

RLS: no direct client access; checks only inside SECURITY DEFINER RPCs.

Expired bans ignored (`expires_at > now()`).

---

## RPCs

### `party_update_lobby_settings(p_room_id uuid, p_settings jsonb)`

**Caller:** authenticated host of room.

**Preconditions:**

- `party_rooms.phase = 'waiting'` and `status = 'open'`
- `auth.uid() = host_id` (via `party_players.is_host` or `party_rooms.host_id`)

**Accepted keys** (all optional in patch; validate types):

```json
{
  "round_count": 3 | 5 | 7,
  "rerolls_per_player": 0..round_count,
  "caption_duration_seconds": 30..120 (step 15),
  "vote_duration_seconds": 20 | 30 | 45,
  "max_players": 2..8,
  "canvas_editor_enabled": boolean,
  "round_modifiers_enabled": boolean,
  "author_guess_enabled": boolean
}
```

**Rules:**

- `rerolls_per_player <= round_count`
- If `max_players` decreases: reject with `too_many_players` when `count(party_players) > new max`
- If `canvas_editor_enabled` set false: allow; caption timer may still be 60–120 (host choice). If true and caption was 60-only legacy, no forced bump required.
- Single `UPDATE party_rooms SET ...` + `party_log_event('lobby_settings_updated', ...)`
- Return `{ ok: true, room: { ...subset fields } }`

**Errors:** `unauthorized`, `not_host`, `wrong_phase`, `invalid_settings`, `too_many_players`

### `party_kick_player(p_room_id uuid, p_target_user_id uuid, p_block_rejoin boolean default false)`

**Caller:** host, `waiting` only.

**Rules:**

- Cannot kick self
- Cannot kick if result would leave `< PARTY_MIN_PLAYERS` (2) players **and** host intends to start — actually: allow kick if `count after kick >= 1`; start still requires 2 via existing `party_start_game`. Reject kick if `count <= 1` (cannot empty room) OR if `count - 1 < 1` → reject `cannot_kick_last`
- Delete from `party_players`; if target was host (shouldn't happen), reassign host like `party_leave_room`
- If `p_block_rejoin`: upsert `party_room_bans` with `expires_at = now() + 24h`
- `party_log_event('player_kicked', ...)`
- Return `{ ok: true }`

**Errors:** `unauthorized`, `not_host`, `wrong_phase`, `player_not_found`, `cannot_kick_self`, `cannot_kick_last`

### `party_join_room` (modify)

After room validation, before insert:

```sql
if exists (
  select 1 from public.party_room_bans
  where room_id = v_room.id and user_id = v_uid and expires_at > now()
) then
  return jsonb_build_object('ok', false, 'error', 'banned_from_room');
end if;

-- replace hardcoded 8:
if v_count >= v_room.max_players then
  return jsonb_build_object('ok', false, 'error', 'room_full');
end if;
```

### `party_advance_phase` + related (modify)

Replace every `interval '30 seconds'` used for **voting phase entry** with:

```sql
(v_room.vote_duration_seconds * interval '1 second')
```

Files to touch in migration: latest `party_advance_phase` body (from `20260613120000_party_vote_tie_phase.sql` or successor). Grep `interval '30 seconds'` in party migrations and update vote-phase assignments only (not tie/reveal fixed buffers).

### `party_create_room` (modify)

- Signature may simplify to `party_create_room()` or keep optional overrides for tests/admin but **production API passes no toggles**.
- Insert includes `vote_duration_seconds`, `max_players` defaults.
- `canvas_editor_enabled = true`, `caption_duration_seconds = 90` by default.

### `party_rematch` (verify)

Rematch resets phase to `waiting`; **do not reset** lobby settings columns (host keeps config). Clear `party_room_bans` optional — **keep bans** across rematch in same room (trolled player stays blocked).

---

## API routes

| Method | Path | Body | RPC |
|--------|------|------|-----|
| `POST` | `/api/party/rooms` | `{}` or empty | `party_create_room()` defaults |
| `PATCH` | `/api/party/rooms/[id]/settings` | settings object | `party_update_lobby_settings` |
| `POST` | `/api/party/rooms/[id]/kick` | `{ userId, blockRejoin?: boolean }` | `party_kick_player` |

Use existing `requirePartyApi`, `parsePartyRpc`, `partyRpcStatus`.

---

## Snapshot / client

Extend `PartyRoomSnapshot` in `lib/party/snapshot.ts`:

```ts
vote_duration_seconds: number;
max_players: number;
round_modifiers_enabled: boolean;
author_guess_enabled: boolean;
// canvas_editor_enabled, caption_duration_seconds already present
```

`party-page-client.tsx`:

- Remove round/reroll/modifier/guess state and form controls
- `handleCreate` → POST `{}` or omit body

`party-room-client.tsx` (waiting):

- Host: editable `PartyLobbySettingsForm` with local draft state + **Save**
- Wire kick handler per player row (host only)
- On kick success for target: existing leave redirect; kicked user gets poll error `kicked` / `banned_from_room`

`HostOnboarding.tsx` / `PartyLobbyScreen`:

- Replace read-only `SettingRow` list with host controls or guest read-only mirror
- Player list: kick affordance (⋯ menu) for host

`lib/party/peek.ts`: expose `max_players` from peek RPC if join page needs it (optional).

---

## Copy keys (add to `lib/party/copy.ts`)

- `lobbySettingsSave`, `lobbySettingsSaved`, `lobbySettingsFailed`
- `lobbyKick`, `lobbyKickConfirm`, `lobbyKickBlock`, `lobbyKickedTitle`, `lobbyBannedTitle`
- `lobbyMaxPlayersBlocked`, `lobbyCaptionCustom`, vote timer labels
- Map `banned_from_room`, `kicked`, `too_many_players`, `cannot_kick_self` for error routes

---

## Security

- All writes via SECURITY DEFINER RPCs; no new direct RLS insert policies for bans
- Rate limit: reuse party API limits on PATCH/POST kick (optional: 10 settings saves/min/room)
- Kick audit via `party_log_event` (existing analytics pipeline)

---

## Testing

| Test | Coverage |
|------|----------|
| `scripts/test-party-lobby-settings.mjs` (new) | valid patch, wrong phase, not host, max_players block, caption step validation |
| `scripts/test-party-kick.mjs` (new) | soft kick, ban blocks join, cannot kick self |
| Extend `test:party-handle` if join errors need mapping | `banned_from_room` |
| Manual | Rows in `docs/party-manual-qa.md` § Lobby settings + kick |

---

## Manual QA (add to checklist)

- [ ] Create room from `/party` — no settings form; lands in lobby with defaults
- [ ] Host changes caption 75s, vote 45s, max 4, saves — guests see updates
- [ ] Host sets max 4 with 6 players — save rejected with clear message
- [ ] Host kicks guest (no ban) — guest redirected; can re-join
- [ ] Host kicks with block — guest sees ban message; re-join fails 24h
- [ ] Start game — settings locked; timers match saved values in caption/vote
- [ ] Rematch — same settings in lobby

---

## Implementation order (for writing-plans)

1. SQL migration: columns, bans table, RPCs, join/advance/create updates  
2. Regenerate / patch `lib/database.types.ts`  
3. API routes + `party-rpc` helpers  
4. Snapshot + room client + lobby UI + minimal create  
5. Copy + error mapping + tests  
6. Manual QA doc rows  

---

## Related docs

- Wave 3a next: [`../plans/2026-06-04-party-wave-3-split.md`](../plans/2026-06-04-party-wave-3-split.md)
- Lobby polls: [`2026-06-04-party-wave-2.5-lobby-polls-design.md`](2026-06-04-party-wave-2.5-lobby-polls-design.md)
