# MemeFight Party — Lobby settings + host kick

**Date:** 2026-06-02 (rev. 2026-06-02 — review clarifications + pre-implementation plan fixes)  
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
- Auto-save on every control change (v1 uses explicit **Save**; avoids Realtime noise on every slider tap)
- Global account ban (only per-room, 24h TTL)
- Spectators (Wave 3a) — `max_players` counts **active players only**, not spectators (document in Wave 3a spec when built)

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

**Alter existing — `caption_duration_seconds` CHECK (migration must be explicit):**

Added inline in [`20260608120000_party_canvas_editor.sql`](../../../supabase/migrations/20260608120000_party_canvas_editor.sql) without a custom name. PostgreSQL auto-names it **`party_rooms_caption_duration_seconds_check`** (verify in migration SQL before apply):

```sql
-- Verify name if migration fails:
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.party_rooms'::regclass AND contype = 'c'
--   AND pg_get_constraintdef(oid) LIKE '%caption_duration%';

ALTER TABLE public.party_rooms
  DROP CONSTRAINT IF EXISTS party_rooms_caption_duration_seconds_check;

ALTER TABLE public.party_rooms
  DROP CONSTRAINT IF EXISTS party_rooms_vote_duration_seconds_check;

ALTER TABLE public.party_rooms
  DROP CONSTRAINT IF EXISTS party_rooms_max_players_check;

ALTER TABLE public.party_rooms
  ADD CONSTRAINT party_rooms_caption_duration_seconds_check
  CHECK (
    caption_duration_seconds >= 30
    AND caption_duration_seconds <= 120
    AND caption_duration_seconds % 15 = 0
  );
```

Existing rows: keep current values (60/90); new columns backfill via defaults (`vote_duration_seconds = 30`, `max_players = 8`).

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

**Patch semantics (strict JSON):**

- **Partial patch:** only keys present in `p_settings` are updated; omitted keys unchanged.
- **Unknown keys:** any key not in the allowlist below → `invalid_settings` (no silent ignore).
- **Null values:** rejected → `invalid_settings` (no key may be JSON `null`).
- **Empty object `{}`:** rejected → `invalid_settings` (no-op saves not allowed).

**Allowlisted keys** (each optional; validate type and range when present):

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

- `rerolls_per_player <= coalesce(patch.round_count, room.round_count)` — SQL must validate even when patch is only `{ "rerolls_per_player": N }`
- If `max_players` decreases: reject with `too_many_players` when `count(party_players) > new max`
- If `canvas_editor_enabled` set false: allow; caption timer may still be 60–120 (host choice). If true and caption was 60-only legacy, no forced bump required.
- **Static `UPDATE`** with `coalesce(v_*, column)` per field — no dynamic SQL
- `party_log_event('lobby_settings_updated', ...)`
- Return `{ ok: true, room: { ...subset fields } }`

**Errors:** `unauthorized`, `not_host`, `wrong_phase`, `invalid_settings`, `too_many_players`

### `party_kick_player(p_room_id uuid, p_target_user_id uuid, p_block_rejoin boolean default false)`

**Caller:** host, `waiting` only.

**Rules (unambiguous):**

- Host may kick any **non-host** player while `waiting`, as long as **at least 1 player remains** in the room after the kick (the host alone is valid).
- **`party_start_game`** still enforces **≥ 2 players** (`PARTY_MIN_PLAYERS`) — kick does not change that rule.
- **Reject** with `cannot_kick_self` when `p_target_user_id = auth.uid()`.
- **Reject** with `cannot_kick_last` when `count(party_players) <= 1` (would empty the room).
- **Reject** with `player_not_found` when target is not in `party_players`.
- **Reject** with `not_host` / `wrong_phase` per usual.
- Delete target from `party_players` (never delete the host row via this RPC).
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

Replace hardcoded vote timer **only** on assignments that set `phase = 'voting'` (or extend an existing voting-phase timer on caption→vote transition):

```sql
phase_ends_at = now() + (v_room.vote_duration_seconds * interval '1 second')
```

**Do change:** lines in `party_advance_phase` where caption (or tie resolution) transitions **into voting** — e.g. `phase = 'voting'` + `interval '30 seconds'` in [`20260613120000_party_vote_tie_phase.sql`](../../../supabase/migrations/20260613120000_party_vote_tie_phase.sql) (and the current live function body copied into the new migration).

**Do not change:** fixed buffers for reveal, tie screen, guess phase, or finished — e.g. `interval '3 seconds'`, `'8 seconds'`, `'10 seconds'` on reveal/tie/guess paths. **Do not** blanket-replace every `interval '30 seconds'` in the file; some may be tie-adjacent — only lines tied to **entering voting**.

Implementation plan step: grep `interval '30 seconds'` in the **latest** `party_advance_phase` definition and list each line with phase context before editing.

### `party_create_room` (decided)

**Production:** `POST /api/party/rooms` sends **no settings** (empty body `{}`). Server applies defaults from table + RPC logic.

**RPC signature:** **Keep** existing optional parameters for tests/scripts/backward compatibility (e.g. `party_create_room(round_count, rerolls, canvas, modifiers, author_guess)`). When args are omitted, use the **server-owned defaults** table in this spec. Do **not** require a no-arg overload if tests already pass positional args.

**Insert:** include `vote_duration_seconds`, `max_players`, and default feature flags as documented above.

### `party_rematch` (verify)

Rematch resets phase to `waiting`; **do not reset** lobby settings columns (host keeps config). Clear `party_room_bans` optional — **keep bans** across rematch in same room (trolled player stays blocked).

---

## API routes

| Method | Path | Body | RPC |
|--------|------|------|-----|
| `POST` | `/api/party/rooms` | `{}` or empty | `party_create_room()` defaults |
| `PATCH` | `/api/party/rooms/[id]/settings` | settings object | `party_update_lobby_settings` → returns `{ ok: true, snapshot }` when possible |
| `POST` | `/api/party/rooms/[id]/kick` | `{ userId, blockRejoin?: boolean }` | `party_kick_player` |

Use existing `requirePartyApi`, `parsePartyRpc`, `partyRpcStatus`.

---

## Kicked / banned client UX

### Snapshot poll (`GET /api/party/rooms/[id]`)

Today: non-member gets `{ error: "Forbidden" }` (403). **Change (precise):**

| Condition | Response |
|-----------|----------|
| Not authenticated | `401` / existing `requirePartyApi` |
| Room missing | `{ error: "not_found" }` **404** |
| User not in `party_players` but **was** a member (joined before, e.g. kicked) | `{ error: "kicked" }` **403** |
| User not in `party_players` and **never** joined | `{ error: "not_in_room" }` **403** |
| Member | `{ snapshot }` **200** |

Detect “was member” via `party_log_event` / analytics `player_joined` for `(room_id, user_id)`, or helper RPC `party_user_was_room_member`.

Do **not** return a partial snapshot without `isYou`.

`party-room-client` `refresh()`: `kicked` → kick copy; `not_in_room` → generic / redirect `/party`.

### Join after ban

`party_join_room` → `banned_from_room` → join API + `/party/join/[code]` redirect `/party?error=banned_from_room` (distinct from `kicked`).

### Realtime

No special channel required: next poll interval (~3s) is enough for v1. Optional: host kick success toast only on host client.

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
- Kicked user: next `refresh()` receives `error: "kicked"` → clear snapshot, show kick copy, link to `/party`
- Banned user attempting join: `banned_from_room` (see above)

`HostOnboarding.tsx` / `PartyLobbyScreen`:

- Replace read-only `SettingRow` list with host controls or guest read-only mirror
- Player list: kick affordance (⋯ menu) only when `isHost && phase === "waiting"` (UI + SQL `wrong_phase` after start)

`lib/party/peek.ts`: expose `max_players` from peek RPC if join page needs it (optional).

---

## Copy keys (add to `lib/party/copy.ts`)

- `lobbySettingsSave`, `lobbySettingsSaved`, `lobbySettingsFailed`
- `lobbyKick`, `lobbyKickConfirm`, `lobbyKickBlock`, `lobbyKickedTitle`, `lobbyBannedTitle`
- `lobbyMaxPlayersBlocked`, `lobbyCaptionCustom`, vote timer labels
- Map `banned_from_room`, `kicked`, `too_many_players`, `cannot_kick_self`, `cannot_kick_last`, `invalid_settings` for error routes

---

## Security

- All writes via SECURITY DEFINER RPCs; no new direct RLS insert policies for bans
- Rate limit: reuse party API limits on PATCH/POST kick (optional: 10 settings saves/min/room)
- Kick audit via `party_log_event` (existing analytics pipeline)

---

## Testing

| Test | Coverage |
|------|----------|
| `scripts/test-party-lobby-settings.mjs` (new) | valid patch, unknown key → `invalid_settings`, null rejected, empty `{}` rejected, wrong phase, not host, max_players block, caption step validation |
| `scripts/test-party-kick.mjs` (new) | soft kick with 3 players leaves 2; kick with 2 players leaves 1 (host only); reject `cannot_kick_last` at 1 player; reject `cannot_kick_self`; ban blocks join |
| Extend `test:party-handle` if join errors need mapping | `banned_from_room` |
| Manual | Rows in `docs/party-manual-qa.md` § Lobby settings + kick |

---

## Manual QA (add to checklist)

- [ ] Create room from `/party` — no settings form; lands in lobby with defaults
- [ ] Host changes caption 75s, vote 45s, max 4, saves — guests see updates
- [ ] Host sets max 4 with 6 players — save rejected with clear message
- [ ] Host kicks guest (no ban) — guest sees **`kicked`** on next poll (not generic Forbidden); redirected to `/party`
- [ ] Host kicks with block — guest sees **`kicked`**; re-join shows **`banned_from_room`**
- [ ] Start game — settings locked; timers match saved values in caption/vote
- [ ] Rematch — same settings in lobby (play game → rematch → values unchanged)
- [ ] Never joined — open room URL without join → `not_in_room`, not kick copy

---

## Implementation order (for writing-plans)

1. SQL migration: columns (`vote_duration_seconds`, `max_players`), **named** caption CHECK drop/add, bans table, RPCs, join/advance/create updates  
2. Advance-phase audit: grep `interval '30 seconds'` in live `party_advance_phase`; replace **vote-entry only**  
3. Regenerate / patch `lib/database.types.ts`  
4. API routes + `party-rpc` helpers; `GET /api/party/rooms/[id]` returns `kicked` for ex-members  
5. Room client + lobby UI + minimal create (no create-time settings in UI)  
6. Copy + error mapping + tests  
7. Manual QA doc rows  

---

## Related docs

- Wave 3a next: [`../plans/2026-06-04-party-wave-3-split.md`](../plans/2026-06-04-party-wave-3-split.md)
- Lobby polls: [`2026-06-04-party-wave-2.5-lobby-polls-design.md`](2026-06-04-party-wave-2.5-lobby-polls-design.md)
