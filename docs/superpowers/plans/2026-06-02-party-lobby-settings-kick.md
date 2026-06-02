# Party Lobby Settings + Host Kick — Implementation Plan

> **Rev. 2026-06-02** — Pre-implementation review fixes (strict TS numbers, SQL rerolls vs room state, static UPDATE, precise `kicked` vs `not_in_room`, kick UI gated on `waiting`).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host edits game rules in the waiting lobby (timers, caps, toggles) and can kick players (optional 24h room ban); create screen stays minimal; kicked/banned users get explicit error codes.

**Architecture:** One Supabase migration adds columns + `party_room_bans`, new RPCs `party_update_lobby_settings` / `party_kick_player`, and patches `party_join_room`, `party_create_room`, `party_advance_phase`. Thin Next.js API routes call RPCs; TS validation mirror for unit tests; lobby UI uses draft state + Save button.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres RPC (SECURITY DEFINER), `node:test`, existing `buildPartySnapshot` poll loop.

**Spec:** [`docs/superpowers/specs/2026-06-02-party-lobby-settings-kick-design.md`](../specs/2026-06-02-party-lobby-settings-kick-design.md)

**Branch:** `feat/party-lobby-settings-kick`

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260616120000_party_lobby_settings_kick.sql` | Schema + RPCs + `party_user_was_room_member` + patched join/create/advance |
| `lib/party/lobby-settings.ts` | Allowlist, patch validation (TS mirror for tests) |
| `lib/supabase/party-rpc.ts` | `partyUpdateLobbySettingsRpc`, `partyKickPlayerRpc`; update create defaults |
| `lib/party/snapshot.ts` | `vote_duration_seconds`, `max_players`, settings on snapshot |
| `lib/party/rpc-response.ts` | HTTP status for new error codes |
| `lib/party/copy.ts` | Lobby save/kick copy + `PARTY_ERRORS` for `kicked`, `banned_from_room`, etc. |
| `app/api/party/rooms/route.ts` | POST `{}` → create with server defaults |
| `app/api/party/rooms/[id]/route.ts` | GET: `kicked` only if ex-member; `not_in_room` if never joined |
| `app/api/party/rooms/[id]/settings/route.ts` | PATCH settings |
| `app/api/party/rooms/[id]/kick/route.ts` | POST kick |
| `app/api/party/join/route.ts` | Map `banned_from_room` |
| `components/brutal/party/party-page-client.tsx` | Remove create-time settings UI |
| `components/brutal/party/screens/JoinScreen.tsx` | Drop create props (keep `designPreview` mocks) |
| `components/brutal/party/lobby-settings-form.tsx` | Host draft + Save; guest read-only |
| `components/brutal/party/screens/HostOnboarding.tsx` | Wire settings form + kick menu on players |
| `components/brutal/party/party-room-client.tsx` | Settings/kick handlers; `kicked` error UX |
| `app/(site)/party/join/[code]/page.tsx` | `banned_from_room` redirect |
| `lib/database.types.ts` | New columns + functions (manual patch or `supabase gen types`) |
| `scripts/test-party-lobby-settings.mjs` | Unit tests for `validateLobbySettingsPatch` |
| `scripts/test-party-rpc-parse.mjs` | New error → status mappings |
| `docs/party-manual-qa.md` | Lobby settings + kick rows |
| `package.json` | `test:party-lobby-settings` script |

---

## Task 1: TS lobby settings validation (TDD)

**Files:**
- Create: `lib/party/lobby-settings.ts`
- Create: `scripts/test-party-lobby-settings.mjs`
- Modify: `package.json` (add script)

- [ ] **Step 1: Write failing tests**

Create `scripts/test-party-lobby-settings.mjs`:

```javascript
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LOBBY_SETTINGS_KEYS,
  validateLobbySettingsPatch,
} from "../lib/party/lobby-settings.ts";

test("rejects empty patch", () => {
  const r = validateLobbySettingsPatch({});
  assert.equal(r.ok, false);
  assert.equal(r.error, "invalid_settings");
});

test("rejects unknown keys", () => {
  const r = validateLobbySettingsPatch({ foo: 1 });
  assert.equal(r.ok, false);
});

test("rejects null values", () => {
  const r = validateLobbySettingsPatch({ round_count: null });
  assert.equal(r.ok, false);
});

test("accepts partial valid patch", () => {
  const r = validateLobbySettingsPatch({ vote_duration_seconds: 45 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.patch, { vote_duration_seconds: 45 });
});

test("caption must be 30-120 step 15", () => {
  assert.equal(validateLobbySettingsPatch({ caption_duration_seconds: 75 }).ok, true);
  assert.equal(validateLobbySettingsPatch({ caption_duration_seconds: 70 }).ok, false);
});

test("rerolls cannot exceed round_count in same patch", () => {
  const r = validateLobbySettingsPatch({ round_count: 3, rerolls_per_player: 4 });
  assert.equal(r.ok, false);
});

test("rejects string numbers (no coercion)", () => {
  assert.equal(validateLobbySettingsPatch({ caption_duration_seconds: "75" }).ok, false);
  assert.equal(validateLobbySettingsPatch({ vote_duration_seconds: "30" }).ok, false);
  assert.equal(validateLobbySettingsPatch({ max_players: "8" }).ok, false);
});

test("rerolls cannot exceed context round_count when only rerolls patched", () => {
  const r = validateLobbySettingsPatch({ rerolls_per_player: 7 }, { roundCount: 5 });
  assert.equal(r.ok, false);
});

test("allowlist is stable", () => {
  assert.ok(LOBBY_SETTINGS_KEYS.includes("max_players"));
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test:party-lobby-settings
```

Expected: module not found / function not defined.

- [ ] **Step 3: Implement `lib/party/lobby-settings.ts`**

```typescript
export const LOBBY_SETTINGS_KEYS = [
  "round_count",
  "rerolls_per_player",
  "caption_duration_seconds",
  "vote_duration_seconds",
  "max_players",
  "canvas_editor_enabled",
  "round_modifiers_enabled",
  "author_guess_enabled",
] as const;

export type LobbySettingsKey = (typeof LOBBY_SETTINGS_KEYS)[number];
export type LobbySettingsPatch = Partial<
  Record<
    LobbySettingsKey,
    number | boolean
  >
>;

const ROUND_COUNTS = new Set([3, 5, 7]);
const VOTE_SECONDS = new Set([20, 30, 45]);

const NUMERIC_KEYS = new Set([
  "round_count",
  "rerolls_per_player",
  "caption_duration_seconds",
  "vote_duration_seconds",
  "max_players",
]);

function requireInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export type LobbySettingsValidationContext = {
  /** Current room round_count — required for rerolls-only patches at API layer */
  roundCount?: number;
};

export function validateLobbySettingsPatch(
  input: Record<string, unknown>,
  context?: LobbySettingsValidationContext
): { ok: true; patch: LobbySettingsPatch } | { ok: false; error: "invalid_settings" } {
  const keys = Object.keys(input);
  if (keys.length === 0) return { ok: false, error: "invalid_settings" };

  const patch: LobbySettingsPatch = {};
  for (const key of keys) {
    if (!(LOBBY_SETTINGS_KEYS as readonly string[]).includes(key)) {
      return { ok: false, error: "invalid_settings" };
    }
    const value = input[key];
    if (value === null || value === undefined) {
      return { ok: false, error: "invalid_settings" };
    }
    if (NUMERIC_KEYS.has(key) && !requireInt(value)) {
      return { ok: false, error: "invalid_settings" };
    }
    if (
      (key === "canvas_editor_enabled" ||
        key === "round_modifiers_enabled" ||
        key === "author_guess_enabled") &&
      typeof value !== "boolean"
    ) {
      return { ok: false, error: "invalid_settings" };
    }
    (patch as Record<string, unknown>)[key] = value;
  }

  if (patch.round_count !== undefined && !ROUND_COUNTS.has(patch.round_count)) {
    return { ok: false, error: "invalid_settings" };
  }
  if (
    patch.vote_duration_seconds !== undefined &&
    !VOTE_SECONDS.has(patch.vote_duration_seconds)
  ) {
    return { ok: false, error: "invalid_settings" };
  }
  if (patch.caption_duration_seconds !== undefined) {
    const c = patch.caption_duration_seconds;
    if (c < 30 || c > 120 || c % 15 !== 0) return { ok: false, error: "invalid_settings" };
  }
  if (patch.max_players !== undefined) {
    const m = patch.max_players;
    if (m < 2 || m > 8) return { ok: false, error: "invalid_settings" };
  }
  if (patch.rerolls_per_player !== undefined && patch.rerolls_per_player < 0) {
    return { ok: false, error: "invalid_settings" };
  }

  const effectiveRounds = patch.round_count ?? context?.roundCount;
  if (
    patch.rerolls_per_player !== undefined &&
    effectiveRounds !== undefined &&
    patch.rerolls_per_player > effectiveRounds
  ) {
    return { ok: false, error: "invalid_settings" };
  }

  return { ok: true, patch };
}
```

Add to `package.json` scripts:

```json
"test:party-lobby-settings": "node --experimental-strip-types --test scripts/test-party-lobby-settings.mjs"
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test:party-lobby-settings
```

- [ ] **Step 5: Commit**

```bash
git add lib/party/lobby-settings.ts scripts/test-party-lobby-settings.mjs package.json
git commit -m "feat(party): add lobby settings patch validation"
```

---

## Task 2: SQL migration — schema + RPCs

**Files:**
- Create: `supabase/migrations/20260616120000_party_lobby_settings_kick.sql`

**Source functions to copy before editing (latest wins):**
- `party_advance_phase` → from `20260614120000_party_tie_bugfixes.sql` if newer than `20260613120000`; else `20260613120000_party_vote_tie_phase.sql`
- `party_join_room` → `20260606211000_party_log_event_join_fix.sql`
- `party_create_room` → `20260612120000_party_wave2_guess_author.sql`

- [ ] **Step 1: Schema + bans table**

```sql
-- Party: lobby settings + host kick

alter table public.party_rooms
  add column if not exists vote_duration_seconds smallint not null default 30,
  add column if not exists max_players smallint not null default 8;

alter table public.party_rooms
  drop constraint if exists party_rooms_caption_duration_seconds_check;

alter table public.party_rooms
  drop constraint if exists party_rooms_vote_duration_seconds_check;

alter table public.party_rooms
  drop constraint if exists party_rooms_max_players_check;

alter table public.party_rooms
  add constraint party_rooms_caption_duration_seconds_check
  check (
    caption_duration_seconds >= 30
    and caption_duration_seconds <= 120
    and caption_duration_seconds % 15 = 0
  );

alter table public.party_rooms
  add constraint party_rooms_vote_duration_seconds_check
  check (vote_duration_seconds in (20, 30, 45));

alter table public.party_rooms
  add constraint party_rooms_max_players_check
  check (max_players between 2 and 8);

create table if not exists public.party_room_bans (
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  banned_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  primary key (room_id, user_id)
);

alter table public.party_room_bans enable row level security;
-- no policies: RPC-only access
```

- [ ] **Step 2: `party_update_lobby_settings`**

Implement plpgsql: host check, `waiting`+`open`, reject empty/unknown/null keys in JSON (mirror TS allowlist).

**Prefer static `UPDATE` — no dynamic SQL.** Parse allowlisted keys into local variables (`v_round_count`, `v_rerolls`, …) only when key present in JSON.

**Rerolls vs rounds (mandatory):**

```sql
v_effective_rounds := coalesce(v_round_count, v_room.round_count);
v_effective_rerolls := coalesce(v_rerolls_per_player, v_room.rerolls_per_player);

if v_effective_rerolls > v_effective_rounds then
  return jsonb_build_object('ok', false, 'error', 'invalid_settings');
end if;
```

Example update body:

```sql
update public.party_rooms
set
  round_count = coalesce(v_round_count, round_count),
  rerolls_per_player = coalesce(v_rerolls_per_player, rerolls_per_player),
  caption_duration_seconds = coalesce(v_caption_duration_seconds, caption_duration_seconds),
  vote_duration_seconds = coalesce(v_vote_duration_seconds, vote_duration_seconds),
  max_players = coalesce(v_max_players, max_players),
  canvas_editor_enabled = coalesce(v_canvas_editor_enabled, canvas_editor_enabled),
  round_modifiers_enabled = coalesce(v_round_modifiers_enabled, round_modifiers_enabled),
  author_guess_enabled = coalesce(v_author_guess_enabled, author_guess_enabled)
where id = p_room_id;
```

`too_many_players` when lowering `max_players` below `count(party_players)`. `party_log_event('lobby_settings_updated', ...)`.

- [ ] **Step 3: `party_kick_player`**

Implement per spec: `cannot_kick_self`, `cannot_kick_last` when `count <= 1`, delete non-host row, optional ban upsert 24h, `party_log_event('player_kicked', ...)`.

**Phase guard:** reject unless `v_room.phase = 'waiting'` and `status = 'open'` (`wrong_phase` otherwise) — kick after start must stay impossible at SQL layer.

- [ ] **Step 4: Patch `party_join_room`**

Add ban check → `banned_from_room`; use `v_room.max_players` instead of literal `8`.

- [ ] **Step 5: Patch `party_create_room`**

On insert set defaults: `round_count=5`, `rerolls=2`, `canvas=true`, `caption_duration_seconds=90`, `vote_duration_seconds=30`, `max_players=8`, `modifiers=false`, `author_guess=true`. Keep optional args for tests; when passed, override defaults.

- [ ] **Step 6: Patch `party_advance_phase` — vote timer audit**

Before editing, run locally and paste into migration comment:

```bash
rg "interval '30 second" supabase/migrations/20260614120000_party_tie_bugfixes.sql supabase/migrations/20260613120000_party_vote_tie_phase.sql -n
```

**Change only** assignments where `phase` becomes `'voting'` (typically lines like `phase = 'voting', ... phase_ends_at = now() + interval '30 seconds'`).

**Do not change:**
- Line ~47 in tie migration that only extends timer while still in caption (`phase_ends_at` without `phase = 'voting'`)
- Reveal/tie/guess buffers (`3 seconds`, `8 seconds`, `10 seconds`)

Replace vote-entry lines with:

```sql
phase_ends_at = now() + (v_room.vote_duration_seconds * interval '1 second')
```

- [ ] **Step 7: `party_user_was_room_member(p_room_id, p_user_id)`**

Returns `true` if analytics/log shows `player_joined` for that user in that room (used by GET room route for `kicked` vs `not_in_room`).

- [ ] **Step 8: Grants**

```sql
revoke all on function public.party_update_lobby_settings(uuid, jsonb) from public;
grant execute on function public.party_update_lobby_settings(uuid, jsonb) to authenticated;
revoke all on function public.party_kick_player(uuid, uuid, boolean) from public;
grant execute on function public.party_kick_player(uuid, uuid, boolean) to authenticated;
revoke all on function public.party_user_was_room_member(uuid, uuid) from public;
grant execute on function public.party_user_was_room_member(uuid, uuid) to authenticated;
```

- [ ] **Step 10: Apply migration**

```bash
npx supabase db push
# or apply via Supabase MCP apply_migration on project srimmoqxrbwxlyyfgdhs
```

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20260616120000_party_lobby_settings_kick.sql
git commit -m "feat(party): lobby settings, kick RPCs, vote duration column"
```

---

## Task 3: Database types + RPC helpers

**Files:**
- Modify: `lib/database.types.ts`
- Modify: `lib/supabase/party-rpc.ts`
- Modify: `lib/party/rpc-response.ts`
- Modify: `scripts/test-party-rpc-parse.mjs`

- [ ] **Step 1: Patch `party_rooms` Row in `lib/database.types.ts`**

Add `vote_duration_seconds: number` and `max_players: number` to `party_rooms` Insert/Update/Row.

Add Functions:

```typescript
party_update_lobby_settings: {
  Args: { p_room_id: string; p_settings: Json };
  Returns: Json;
};
party_kick_player: {
  Args: { p_room_id: string; p_target_user_id: string; p_block_rejoin?: boolean };
  Returns: Json;
};
```

- [ ] **Step 2: Add RPC wrappers in `lib/supabase/party-rpc.ts`**

```typescript
export function partyUpdateLobbySettingsRpc(
  supabase: RpcSupabase,
  roomId: string,
  settings: Record<string, unknown>
) {
  return callRpc(supabase, "party_update_lobby_settings", {
    p_room_id: roomId,
    p_settings: settings,
  });
}

export function partyKickPlayerRpc(
  supabase: RpcSupabase,
  roomId: string,
  targetUserId: string,
  blockRejoin = false
) {
  return callRpc(supabase, "party_kick_player", {
    p_room_id: roomId,
    p_target_user_id: targetUserId,
    p_block_rejoin: blockRejoin,
  });
}
```

Update `partyCreateRoomRpc` default args to match spec (`rerollsPerPlayer: 2`, `canvasEditorEnabled: true`) for test convenience only — production API will not pass them.

- [ ] **Step 3: Extend `partyRpcStatus` in `lib/party/rpc-response.ts`**

```typescript
case "invalid_settings":
case "too_many_players":
case "cannot_kick_self":
case "cannot_kick_last":
case "player_not_found":
case "banned_from_room":
  return 409;
case "kicked":
  return 403;
```

Add tests in `scripts/test-party-rpc-parse.mjs` for `partyRpcStatus("kicked") === 403` and `banned_from_room === 409`.

- [ ] **Step 4: Run tests**

```bash
npm run test:party-rpc-parse
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/database.types.ts lib/supabase/party-rpc.ts lib/party/rpc-response.ts scripts/test-party-rpc-parse.mjs
git commit -m "feat(party): RPC helpers and status codes for lobby settings"
```

---

## Task 4: API routes

**Files:**
- Modify: `app/api/party/rooms/route.ts`
- Create: `app/api/party/rooms/[id]/settings/route.ts`
- Create: `app/api/party/rooms/[id]/kick/route.ts`
- Modify: `app/api/party/rooms/[id]/route.ts`
- Modify: `app/api/party/join/route.ts` (if maps errors)

- [ ] **Step 1: Minimal create — `app/api/party/rooms/route.ts`**

Replace body parsing with:

```typescript
const { data, error } = await partyCreateRoomRpc(auth.supabase);
```

(Uses RPC defaults: 5 rounds, 2 rerolls, canvas on, etc.)

- [ ] **Step 2: Settings PATCH — `app/api/party/rooms/[id]/settings/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { validateLobbySettingsPatch } from "@/lib/party/lobby-settings";
import { buildPartySnapshot } from "@/lib/party/snapshot";
import { parsePartyRpc, partyRpcStatus, partyRpcTransportError } from "@/lib/party/rpc-response";
import { partyUpdateLobbySettingsRpc } from "@/lib/supabase/party-rpc";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_settings" }, { status: 400 });
  }
  const validated = validateLobbySettingsPatch(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 409 });
  }
  const { data, error } = await partyUpdateLobbySettingsRpc(
    auth.supabase,
    id,
    validated.patch as Record<string, unknown>
  );
  if (error) {
    return NextResponse.json(
      { error: partyRpcTransportError("create", error.message) },
      { status: 500 }
    );
  }
  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }
  const snapshot = await buildPartySnapshot(auth.supabase, id, auth.user.id);
  if (!snapshot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, snapshot });
}
```

**API note:** Pass `validateLobbySettingsPatch(body, { roundCount: snapshot.room.roundCount })` when validating PATCH if snapshot is loaded first, **or** rely on SQL for rerolls-only patches (TS context optional). SQL is source of truth.

- [ ] **Step 3: Kick POST — `app/api/party/rooms/[id]/kick/route.ts`**

Body `{ userId: string, blockRejoin?: boolean }` → `partyKickPlayerRpc`.

- [ ] **Step 4: Member vs kicked — `app/api/party/rooms/[id]/route.ts`**

Do **not** map every non-member to `kicked`.

```typescript
const snapshot = await buildPartySnapshot(auth.supabase, id, auth.user.id);

if (!snapshot) {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

const isMember = snapshot.players.some((p) => p.isYou);
if (!isMember) {
  const { data: joinedBefore } = await auth.supabase.rpc("party_user_was_room_member", {
    p_room_id: id,
    p_user_id: auth.user.id,
  });
  // Or query party_analytics_events / party_log for player_joined + this user
  const wasMember = Boolean(joinedBefore);
  if (wasMember) {
    return NextResponse.json({ error: "kicked" }, { status: 403 });
  }
  return NextResponse.json({ error: "not_in_room" }, { status: 403 });
}

return NextResponse.json({ snapshot });
```

**Implementation choice (pick one in migration):**

- Small helper RPC `party_user_was_room_member(p_room_id, p_user_id)` returns true if `party_log_event` / analytics has `player_joined` for that pair, **or**
- Inline SQL in route via service role (avoid) — prefer SECURITY DEFINER helper.

Map `not_in_room` in `partyRpcStatus` → 403. Client: `kicked` → kick copy; `not_in_room` → generic forbidden / redirect `/party`.

- [ ] **Step 5: Join API — map `banned_from_room`**

Ensure `app/api/party/join/route.ts` returns `{ error: "banned_from_room" }` with 409 when RPC says so.

- [ ] **Step 6: Commit**

```bash
git add app/api/party/rooms/route.ts app/api/party/rooms/[id]/route.ts app/api/party/rooms/[id]/settings/route.ts app/api/party/rooms/[id]/kick/route.ts app/api/party/join/route.ts
git commit -m "feat(party): API routes for lobby settings and kick"
```

---

## Task 5: Snapshot + copy

**Files:**
- Modify: `lib/party/snapshot.ts`
- Modify: `lib/party/copy.ts`
- Modify: `lib/party/types.ts` (if `PartySnapshot` room type lives there)

- [ ] **Step 1: Extend room select in `buildPartySnapshot`**

Add to `.select(...)`:

```
vote_duration_seconds, max_players, author_guess_enabled
```

(`round_modifiers_enabled` may already be present.)

Expose on `snapshot.room`:

```typescript
voteDurationSeconds: roomRow.vote_duration_seconds,
maxPlayers: roomRow.max_players,
authorGuessEnabled: roomRow.author_guess_enabled,
```

- [ ] **Step 2: Copy + errors in `lib/party/copy.ts`**

Add keys: `lobbySettingsSave`, `lobbySettingsSaved`, `lobbySettingsFailed`, `lobbyKick`, `lobbyKickConfirm`, `lobbyKickBlock`, `lobbyMaxPlayersBlocked`, caption/vote preset labels.

Extend `PARTY_ERRORS` (or equivalent):

```typescript
kicked: { code: "kicked", title: "...", body: "..." },
banned_from_room: { code: "banned_from_room", title: "...", body: "..." },
invalid_settings: { ... },
too_many_players: { ... },
cannot_kick_self: { ... },
cannot_kick_last: { ... },
```

Reuse existing kick title copy where present.

- [ ] **Step 3: `npm run typecheck`**

- [ ] **Step 4: Commit**

```bash
git add lib/party/snapshot.ts lib/party/copy.ts lib/party/types.ts
git commit -m "feat(party): snapshot fields and lobby settings copy"
```

---

## Task 6: Lobby UI + minimal create

**Files:**
- Create: `components/brutal/party/lobby-settings-form.tsx`
- Modify: `components/brutal/party/screens/HostOnboarding.tsx`
- Modify: `components/brutal/party/party-room-client.tsx`
- Modify: `components/brutal/party/party-page-client.tsx`
- Modify: `components/brutal/party/screens/JoinScreen.tsx`

- [ ] **Step 1: `party-page-client.tsx`**

Remove state: `roundCount`, `rerollsPerPlayer`, `roundModifiersEnabled`, `authorGuessEnabled`.

`handleCreate`:

```typescript
const res = await fetch("/api/party/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
```

Remove props passed to `PartyJoinScreen` for create settings.

- [ ] **Step 2: `JoinScreen.tsx`**

Remove create-setting controls from non-`designPreview` path (round pills, rerolls, toggles). Keep join code + Create CTA only.

- [ ] **Step 3: Create `lobby-settings-form.tsx`**

Props:

```typescript
type LobbySettingsFormProps = {
  readOnly: boolean;
  draft: LobbySettingsDraft;
  onChange: (draft: LobbySettingsDraft) => void;
  onSave?: () => void;
  saving?: boolean;
  saveError?: string | null;
  maxPlayersBlocked?: boolean;
};
```

Controls:
- Caption: 60 / 90 pills + number stepper 30–120 step 15
- Vote: 20 / 30 / 45 pills
- Max players: 2–8 stepper
- Rounds: 3 / 5 / 7
- Rerolls: 0…roundCount
- Toggles: canvas, modifiers, author guess
- Save button (host only) calls `onSave`

- [ ] **Step 4: `HostOnboarding.tsx`**

Replace read-only `SettingRow` aside with `LobbySettingsForm`.

Player row: show kick ⋯ menu **only when** `isHost && snapshot.room.phase === "waiting"` (not host-only; block during caption/vote/reveal even if RPC would reject).

Kick flow: confirm dialog with “Block re-join 24h” → `onKickPlayer(userId, blockRejoin)`.

- [ ] **Step 5: `party-room-client.tsx`**

- Local `settingsDraft` initialized from `snapshot.room` on enter `waiting`
- `saveSettings`: PATCH settings; on `{ ok, snapshot }` call `setSnapshot(snapshot)` (fallback `refresh()` if snapshot missing)
- `kickPlayer`: POST kick; host `refresh()`; guest gets `kicked` on next poll
- On `refresh()` error `kicked`: `setSnapshot(null)`; set error code for `PartyErrorState`

- [ ] **Step 6: `app/(site)/party/join/[code]/page.tsx`**

When join RPC returns `banned_from_room`:

```typescript
redirect(`/party?error=banned_from_room`);
```

- [ ] **Step 7: Manual smoke**

Two browsers: host saves 75s caption / 45s vote; guest sees update; kick flow.

- [ ] **Step 8: Commit**

```bash
git add components/brutal/party/lobby-settings-form.tsx components/brutal/party/screens/HostOnboarding.tsx components/brutal/party/party-room-client.tsx components/brutal/party/party-page-client.tsx components/brutal/party/screens/JoinScreen.tsx app/(site)/party/join/[code]/page.tsx
git commit -m "feat(party): lobby settings UI, kick, minimal create"
```

---

## Task 7: Docs + verification

**Files:**
- Modify: `docs/party-manual-qa.md`

- [ ] **Step 1: Add manual QA section** (include all spec rows **plus**):

- [ ] **Settings persist after rematch** — host sets caption 75s / vote 45s / max 6 → play full game → rematch → lobby still shows same values

- [ ] **Never-member GET** — user opens `/party/room/{id}` without having joined → `not_in_room`, not kick copy

- [ ] **Step 2: Run full script suite**

```bash
npm run typecheck
npm run test:party-handle
npm run test:party-lobby-settings
npm run test:party-rpc-parse
npm run test:party-guess-author
npm run test:party-modifiers
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add docs/party-manual-qa.md
git commit -m "docs(party): manual QA for lobby settings and kick"
```

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|------------------|------|
| Minimal create | Task 4, 6 |
| Lobby save (not auto) | Task 6 |
| Strict JSON patch | Task 1, 2, 4 |
| Kick rules | Task 2 |
| Ban 24h | Task 2, 4, 6 |
| max_players join | Task 2 |
| vote_duration in advance only | Task 2 step 6 |
| caption CHECK migration name | Task 2 step 1 |
| kicked vs not_in_room | Task 2 helper RPC, Task 4 |
| kicked / banned UX | Task 4, 5, 6 |
| Kick UI only in waiting | Task 6 |
| PATCH returns snapshot | Task 4 |
| Strict integer TS validation | Task 1 |
| SQL rerolls vs room round_count | Task 2 |
| create defaults | Task 2, 4 |
| rematch keeps settings/bans | Task 2 (no rematch change) |
| Tests | Task 1, 3, 7 |

---

## Deferred / follow-up

- Wave 3a spec note: `max_players` = active players only (not spectators)
- Ban cleanup job: delete expired `party_room_bans` rows (v1 ignores expired via `expires_at > now()`)
- Optional: Supabase integration test script with service role + test users (not required for v1 if manual QA passes)
