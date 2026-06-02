# Party Wave 1 Parallel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six mini-scope Party features in parallel tracks — rematch, reveal reactions, join teaser, round modifiers, public recap, ready-pressure copy — per approved spec.

**Architecture:** Two SQL migration batches (week 1: rematch + reveal + peek; week 2: modifiers + recap). Each feature gets RPC + thin API route (where auth needed) + brutalist UI. Public pages (join teaser, recap) use security-definer RPCs callable by `anon`. Modifier validation lives in SQL (`party_validate_round_modifier`) with a TS mirror for unit tests.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres RPC + RLS + Realtime, `node:test` scripts, existing `buildPartySnapshot` / ShareCard pipeline.

**Spec:** [`docs/superpowers/specs/2026-06-02-party-wave1-parallel-design.md`](../specs/2026-06-02-party-wave1-parallel-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260609120000_party_wave1_rematch_reveal_peek.sql` | R1 rematch, R2 reveal phase, V1 peek RPC |
| `supabase/migrations/20260610120000_party_wave1_modifiers_recap.sql` | R3 schema + modifier helper + recap RPC |
| `lib/supabase/party-rpc.ts` | `partyRematchRpc`, `partyPeekRoomRpc`, `partyGetRecapRpc`, create-room arg |
| `lib/party/round-modifiers.ts` | TS mirror of modifier validation + labels |
| `lib/party/peek.ts` | Parse peek/recap RPC JSON |
| `lib/party/peek-room.ts` | `getCachedPartyPeek` — dedupe peek RPC per request |
| `lib/party/types.ts` | `PartyRoundModifier`, snapshot fields |
| `lib/party/snapshot.ts` | Map `round_modifiers_enabled`, `current_modifier` |
| `lib/party/rpc-response.ts` | New error codes (`modifier_violation`, etc.) |
| `lib/party/copy.ts` | DE copy for all Wave 1 surfaces |
| `lib/party/realtime.ts` | Subscribe reactions in `reveal` phase |
| `app/api/party/rematch/route.ts` | Host rematch endpoint |
| `app/api/party/rooms/route.ts` | Pass `roundModifiersEnabled` to create RPC |
| `app/(site)/party/join/[code]/page.tsx` | Peek-first join flow |
| `components/brutal/party/screens/PartyJoinTeaser.tsx` | Teaser + in-game waiting UI |
| `app/(site)/party/recap/[code]/page.tsx` | Public recap page |
| `components/brutal/party/party-finished-screen.tsx` | Rematch CTA + recap disclosure |
| `components/brutal/party/desktop/PartyDesktopFinished.tsx` | Same |
| `components/brutal/party/party-room-client.tsx` | Reveal reactions feed + rematch refresh |
| `components/brutal/party/party-reveal-screen.tsx` | Pass reaction props |
| `components/brutal/party/mobile/PartyMobileReveal.tsx` | Reaction bar |
| `components/brutal/party/desktop/PartyDesktopReveal.tsx` | Reaction bar |
| `components/brutal/party/party-page-client.tsx` | Chaos-Runden toggle |
| `components/brutal/party/party-caption-input.tsx` | Modifier banner + all_caps auto-upper |
| `components/brutal/party/mobile/PartyMobileCaption.tsx` | Progress copy |
| `components/brutal/party/screens/ShareCard.tsx` | Recap link + disclosure |
| `scripts/test-party-modifiers.mjs` | Modifier unit tests |
| `scripts/test-party-rpc-parse.mjs` | Peek/recap/rematch response parse tests |
| `docs/party-manual-qa.md` | Wave 1 checklist |
| `package.json` | `test:party-modifiers`, `test:party-rpc-parse` scripts |

---

## Task 1: SQL migration — rematch, reveal reactions, peek (R1 + R2 + V1)

**Files:**
- Create: `supabase/migrations/20260609120000_party_wave1_rematch_reveal_peek.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Party Wave 1: rematch, reveal reactions, peek room

-- R1: party_rematch
create or replace function public.party_rematch(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_players int;
  v_prev_rounds smallint;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_host');
  end if;

  if v_room.phase <> 'finished' or v_room.status <> 'finished' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  select count(*) into v_players from public.party_players where room_id = p_room_id;
  if v_players < 2 then
    return jsonb_build_object('ok', false, 'error', 'not_enough_players');
  end if;

  v_prev_rounds := v_room.round_count;

  delete from public.party_votes where room_id = p_room_id;
  delete from public.party_round_results where room_id = p_room_id;
  delete from public.party_submissions where room_id = p_room_id;
  delete from public.party_reactions where room_id = p_room_id;
  delete from public.party_player_rounds where room_id = p_room_id;

  update public.party_players
  set score = 0, rerolls_used = 0
  where room_id = p_room_id;

  update public.party_rooms set
    phase = 'waiting',
    status = 'open',
    current_round = 0,
    caption_count = 0,
    votes_cast_count = 0,
    phase_ends_at = null,
    phase_seed = null,
    used_template_ids = '{}'
  where id = p_room_id;

  perform public.party_log_event(
    p_room_id,
    'rematch_started'::text,
    'waiting'::text,
    0,
    jsonb_build_object('previous_round_count', v_prev_rounds)
  );

  return jsonb_build_object('ok', true, 'phase', 'waiting');
end;
$$;

revoke all on function public.party_rematch(uuid) from public;
grant execute on function public.party_rematch(uuid) to authenticated;

-- R2: party_send_reaction — allow reveal phase
create or replace function public.party_send_reaction(p_room_id uuid, p_reaction_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_reaction_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_reaction_key not in ('laugh', 'eyes', 'fire') then
    return jsonb_build_object('ok', false, 'error', 'invalid_reaction');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null or v_room.phase not in ('waiting', 'reveal') then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if not exists (select 1 from public.party_players where room_id = p_room_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  if exists (
    select 1 from public.party_players
    where room_id = p_room_id and user_id = v_uid
      and last_reaction_at is not null
      and last_reaction_at > now() - interval '2 seconds'
  ) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.party_reactions (room_id, user_id, reaction_key)
  values (p_room_id, v_uid, p_reaction_key)
  returning id into v_reaction_id;

  update public.party_players
  set last_reaction_at = now(), last_seen_at = now()
  where room_id = p_room_id and user_id = v_uid;

  return jsonb_build_object('ok', true, 'reaction_id', v_reaction_id);
end;
$$;

-- R2: RLS — reactions visible in waiting OR reveal
drop policy if exists "party_reactions_select" on public.party_reactions;
create policy "party_reactions_select" on public.party_reactions for select to authenticated
  using (
    public.party_is_member(room_id)
    and exists (
      select 1 from public.party_rooms pr
      where pr.id = party_reactions.room_id
        and pr.phase in ('waiting', 'reveal')
    )
  );

-- V1: party_peek_room (anon-safe)
create or replace function public.party_peek_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.party_rooms%rowtype;
  v_host_handle text;
  v_count int;
begin
  select * into v_room
  from public.party_rooms
  where code = upper(trim(p_code));

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.status = 'abandoned' then
    return jsonb_build_object('ok', false, 'error', 'room_closed');
  end if;

  select handle into v_host_handle
  from public.profiles
  where user_id = v_room.host_id;

  select count(*) into v_count from public.party_players where room_id = v_room.id;

  return jsonb_build_object(
    'ok', true,
    'code', v_room.code,
    'host_handle', coalesce(v_host_handle, '?'),
    'player_count', v_count,
    'max_players', 8,
    'status', v_room.status,
    'phase', case when v_room.status = 'open' and v_room.phase = 'waiting' then 'waiting' else 'in_progress' end,
    'in_game', v_room.status = 'in_progress',
    'is_finished', v_room.status = 'finished'
  );
end;
$$;

revoke all on function public.party_peek_room(text) from public;
grant execute on function public.party_peek_room(text) to anon, authenticated;
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` (or your usual migration apply flow)

Expected: migration applies without error

- [ ] **Step 3: Regenerate types**

Run: `npx supabase gen types typescript --local > lib/database.types.ts` (or project equivalent)

Expected: `party_rematch`, `party_peek_room` appear under `Functions`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260609120000_party_wave1_rematch_reveal_peek.sql lib/database.types.ts
git commit -m "feat(party): add rematch, reveal reactions, peek room RPCs (Wave 1)"
```

---

## Task 2: Client RPC wrappers + parse helpers (R1 + V1 foundation)

**Files:**
- Modify: `lib/supabase/party-rpc.ts`
- Create: `lib/party/peek.ts`
- Create: `scripts/test-party-rpc-parse.mjs`
- Modify: `package.json`
- Modify: `lib/party/rpc-response.ts`

- [ ] **Step 1: Add RPC wrappers**

```ts
// lib/supabase/party-rpc.ts — append

export function partyRematchRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_rematch", { p_room_id: roomId });
}

export function partyPeekRoomRpc(supabase: RpcSupabase, code: string) {
  return callRpc(supabase, "party_peek_room", { p_code: code });
}
```

- [ ] **Step 2: Create peek parsers**

```ts
// lib/party/peek.ts
export type PartyPeekResult =
  | {
      ok: true;
      code: string;
      hostHandle: string;
      playerCount: number;
      maxPlayers: number;
      inGame: boolean;
      isFinished: boolean;
      phase: "waiting" | "in_progress";
    }
  | { ok: false; error: string };

export function parsePartyPeek(data: unknown): PartyPeekResult {
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "invalid_response" };
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return { ok: false, error: String(row.error ?? "unknown") };
  }
  return {
    ok: true,
    code: String(row.code),
    hostHandle: String(row.host_handle),
    playerCount: Number(row.player_count),
    maxPlayers: Number(row.max_players ?? 8),
    inGame: Boolean(row.in_game),
    isFinished: Boolean(row.is_finished),
    phase: row.phase === "waiting" ? "waiting" : "in_progress",
  };
}
```

- [ ] **Step 3: Extend rpc-response**

Add to `partyRpcStatus` switch:

```ts
case "modifier_violation":
case "not_finished":
case "room_closed":
  return 409;
```

- [ ] **Step 4: Write parse tests**

```js
// scripts/test-party-rpc-parse.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePartyPeek } from "../lib/party/peek.ts";

test("parsePartyPeek success", () => {
  const r = parsePartyPeek({
    ok: true,
    code: "ABC123",
    host_handle: "chris",
    player_count: 4,
    max_players: 8,
    in_game: false,
    is_finished: false,
    phase: "waiting",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.hostHandle, "chris");
    assert.equal(r.inGame, false);
  }
});

test("parsePartyPeek in_game", () => {
  const r = parsePartyPeek({
    ok: true,
    code: "X",
    host_handle: "a",
    player_count: 3,
    in_game: true,
    is_finished: false,
    phase: "in_progress",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.inGame, true);
});
```

- [ ] **Step 5: Add npm script and run**

```json
"test:party-rpc-parse": "node --experimental-strip-types scripts/test-party-rpc-parse.mjs"
```

Run: `npm run test:party-rpc-parse`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/party-rpc.ts lib/party/peek.ts lib/party/rpc-response.ts scripts/test-party-rpc-parse.mjs package.json
git commit -m "feat(party): add rematch/peek RPC clients and parse helpers"
```

---

## Task 3: Rematch API route + Finished screen UI (R1)

**Files:**
- Create: `app/api/party/rematch/route.ts`
- Modify: `components/brutal/party/party-finished-screen.tsx`
- Modify: `components/brutal/party/desktop/PartyDesktopFinished.tsx`
- Modify: `lib/party/copy.ts`

- [ ] **Step 1: Add copy keys**

```ts
// lib/party/copy.ts
finishedRunItBack: "RUN IT BACK →",
finishedNewRoom: "NEW ROOM →",
finishedWaitingForHost: "Waiting for host to run it back…",
finishedRematchError: "Could not reset room — try again.",
finishedRematchNotHost: "Only the host can run it back.",
recapPublicDisclosure: (url: string) => `Recap ist öffentlich: ${url}`,
```

- [ ] **Step 2: Create rematch API route**

```ts
// app/api/party/rematch/route.ts
import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { parsePartyRpc, partyRpcStatus } from "@/lib/party/rpc-response";
import { buildPartySnapshot } from "@/lib/party/snapshot";
import { partyRematchRpc } from "@/lib/supabase/party-rpc";

export async function POST(request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  try {
    const body = (await request.json()) as { roomId?: string };
    roomId = body.roomId ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const { data, error } = await partyRematchRpc(auth.supabase, roomId);
  if (error) {
    console.error("party_rematch rpc failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  const snapshot = await buildPartySnapshot(auth.supabase, roomId, auth.user.id);
  return NextResponse.json({ ok: true, snapshot });
}
```

- [ ] **Step 3: Wire mobile finished screen**

In `party-finished-screen.tsx`:
- Add `"use client"` state: `rematching`, `rematchError`
- Replace sole `Link href="/party"` with:
  - Host: `button` → `POST /api/party/rematch` → on success call parent refresh or `window.location.reload()` / lift refresh callback
  - Non-host: text `PARTY_COPY.finishedWaitingForHost`
  - Secondary `Link` → `/party` with `PARTY_COPY.finishedNewRoom`
- Add recap disclosure line using `getAppUrl(\`/party/recap/${snapshot.room.code}\`)` (V2 page — can ship text now even before page exists)

Pass optional `onRematch?: () => Promise<void>` from `party-room-client` that POSTs rematch and applies returned snapshot (mirror `handleStartGame` pattern).

- [ ] **Step 4: Mirror in PartyDesktopFinished**

Same actions region: host button + non-host copy + new room link.

- [ ] **Step 5: Add handleRematch to party-room-client**

Lift `rematchError` state to `party-room-client` (or keep in finished screen — either works; below assumes room client owns the fetch):

```ts
const [rematchError, setRematchError] = useState<string | null>(null);

async function handleRematch() {
  setRematchError(null);
  setPhaseTransitioning(true);
  try {
    const res = await fetch("/api/party/rematch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      snapshot?: PartySnapshot;
    };

    if (!res.ok || data.error) {
      setRematchError(
        data.error === "not_host"
          ? PARTY_COPY.finishedRematchNotHost
          : PARTY_COPY.finishedRematchError
      );
      return;
    }

    if (data.snapshot) {
      setSnapshot(data.snapshot);
      setLobbyReactions([]);
    }
  } catch {
    setRematchError(PARTY_COPY.finishedRematchError);
  } finally {
    setPhaseTransitioning(false);
  }
}
```

Pass to `PartyFinishedScreen` / `PartyDesktopFinished`:

```tsx
<PartyFinishedScreen
  snapshot={snapshot}
  isHost={isHost}
  rematching={phaseTransitioning}
  rematchError={rematchError}
  onRematch={isHost ? handleRematch : undefined}
/>
```

Finished UI must render `rematchError` inline under the host button (clear on retry).

- [ ] **Step 6: Manual smoke**

Run dev server, finish a 2-player game, host clicks RUN IT BACK → lobby, scores 0, same code.

- [ ] **Step 7: Commit**

```bash
git add app/api/party/rematch/route.ts components/brutal/party/party-finished-screen.tsx components/brutal/party/desktop/PartyDesktopFinished.tsx components/brutal/party/party-room-client.tsx lib/party/copy.ts
git commit -m "feat(party): host rematch CTA and API route (Wave 1 R1)"
```

---

## Task 4: Reveal reactions UI (R2)

**Files:**
- Modify: `lib/party/realtime.ts`
- Modify: `components/brutal/party/party-room-client.tsx`
- Modify: `components/brutal/party/party-reveal-screen.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileReveal.tsx`
- Modify: `components/brutal/party/desktop/PartyDesktopReveal.tsx`

- [ ] **Step 1: Extend Realtime subscription**

In `lib/party/realtime.ts`, change:

```ts
if (phase === "waiting") {
```

to:

```ts
if (phase === "waiting" || phase === "reveal") {
```

(same INSERT handler on `party_reactions`)

- [ ] **Step 2: Extend party-room-client reaction feed**

- Rename `lobbyReactions` usage to shared `phaseReactions` or keep name but hydrate when `phase === 'reveal'` too (mirror waiting block at lines ~123 and ~258)
- On phase enter `reveal`, seed feed from `snapshot.recentReactions`
- Pass to reveal screen:

```tsx
if (snapshot.room.phase === "reveal") {
  return (
    <PartyRevealScreen
      snapshot={snapshot}
      recentReactions={lobbyReactions}
      onSendReaction={handleSendReaction}
    />
  );
}
```

- [ ] **Step 3: Add LobbyReactionBar to reveal layouts**

In `PartyMobileReveal.tsx` and `PartyDesktopReveal.tsx`, bottom or footer region:

```tsx
import { LobbyReactionBar, type LobbyReactionFeedItem } from "@/components/brutal/party/lobby-reaction-bar";

type Props = {
  snapshot: PartySnapshot;
  recentReactions?: LobbyReactionFeedItem[];
  onSendReaction?: (key: PartyReactionKey) => void;
};

// inside layout:
{onSendReaction ? (
  <LobbyReactionBar recent={recentReactions ?? []} onSend={onSendReaction} />
) : null}
```

- [ ] **Step 4: Verify voting phase has no bar**

Manual: reactions work on reveal; POST during voting returns 409.

- [ ] **Step 5: Commit**

```bash
git add lib/party/realtime.ts components/brutal/party/party-room-client.tsx components/brutal/party/party-reveal-screen.tsx components/brutal/party/mobile/PartyMobileReveal.tsx components/brutal/party/desktop/PartyDesktopReveal.tsx
git commit -m "feat(party): reveal-phase emoji reactions (Wave 1 R2)"
```

---

## Task 5: Join teaser page (V1)

**Files:**
- Create: `components/brutal/party/screens/PartyJoinTeaser.tsx`
- Create: `lib/party/peek-room.ts`
- Modify: `app/(site)/party/join/[code]/page.tsx`
- Modify: `lib/party/copy.ts`

- [ ] **Step 1: Add teaser copy**

```ts
joinTeaserHosting: (handle: string) => `@${handle} hostet eine Party`,
joinTeaserPlayers: (n: number, max: number) => `${n}/${max} Spieler`,
joinTeaserTagline: "Live meme captions · 2–8 Spieler",
joinTeaserCta: "JOIN THE CHAOS →",
joinTeaserInGameTitle: (handle: string) => `@${handle} — Party läuft gerade`,
joinTeaserInGameBody: (n: number) =>
  `${n}/8 Spieler · Du kannst beitreten, sobald die Lobby wieder offen ist.`,
joinTeaserInGameCta: "SPIEL LÄUFT — WARTEN",
joinTeaserFinished: "Diese Party ist vorbei.",
joinTeaserFinishedRecap: "Recap ansehen →",
joinTeaserNotFound: "Code nicht gefunden.",
joinTeaserClosed: "Raum geschlossen.",
```

- [ ] **Step 2: Cached peek helper (single DB roundtrip per request)**

`generateMetadata` and the page body both need peek data. Wrap the RPC in `React.cache()` so both share one Promise:

```ts
// lib/party/peek-room.ts
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { partyPeekRoomRpc } from "@/lib/supabase/party-rpc";
import { parsePartyPeek, type PartyPeekResult } from "@/lib/party/peek";

export const getCachedPartyPeek = cache(async (code: string): Promise<PartyPeekResult> => {
  const normalized = code.trim().toUpperCase();
  const supabase = await createClient();
  const { data, error } = await partyPeekRoomRpc(supabase, normalized);
  if (error) {
    return { ok: false, error: "peek_failed" };
  }
  return parsePartyPeek(data);
});
```

- [ ] **Step 3: Create PartyJoinTeaser component**

Server component props: `peek: PartyPeekResult`, `code: string`, `isLoggedIn: boolean`

Render three variants:
- `!peek.ok` → not found / closed message
- `peek.isFinished` → finished copy + link `/party/recap/CODE`
- `peek.inGame` → waiting UI, **no** join/login CTA that implies immediate join; optional small login link
- else → open lobby teaser + CTA (`/auth/login?returnTo=...` or auto-join handled by page)

- [ ] **Step 4: Refactor join page**

Use `getCachedPartyPeek` everywhere — never call `partyPeekRoomRpc` directly from the page:

```tsx
// app/(site)/party/join/[code]/page.tsx
import { getCachedPartyPeek } from "@/lib/party/peek-room";

export default async function PartyJoinCodePage({ params }: PageProps) {
  if (process.env.PARTY_ENABLED !== "true") redirect("/party");

  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const peek = await getCachedPartyPeek(normalized);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (peek.ok && (peek.inGame || peek.isFinished)) {
    return <PartyJoinTeaser peek={peek} code={normalized} isLoggedIn={Boolean(user)} />;
  }

  if (!user) {
    return <PartyJoinTeaser peek={peek} code={normalized} isLoggedIn={false} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect(`/onboarding?returnTo=${encodeURIComponent(`/party/join/${normalized}`)}`);
  }

  if (!peek.ok || peek.inGame) {
    return <PartyJoinTeaser peek={peek} code={normalized} isLoggedIn={true} />;
  }

  const { data, error } = await partyJoinRoomRpc(supabase, normalized);
  if (error) redirect(`/party?error=join_failed`);
  const result = parsePartyRpc(data);
  if (!result.ok || !result.room_id) redirect(`/party?error=${result.error ?? "bad_code"}`);
  redirect(`/party/room/${result.room_id}`);
}
```

- [ ] **Step 5: Dynamic metadata — reuse cache**

```tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const peek = await getCachedPartyPeek(code); // same cached Promise as page body
  if (!peek.ok) return { title: "Join Party · MemeFight" };
  return {
    title: `Join @${peek.hostHandle}'s Party · MemeFight`,
    description: `${peek.playerCount}/${peek.maxPlayers} players · Live meme caption game`,
  };
}
```

- [ ] **Step 6: Manual smoke**

Logged-out `/party/join/CODE` shows teaser; in-progress room shows waiting UI without join; after rematch CTA works again.

- [ ] **Step 7: Commit**

```bash
git add app/(site)/party/join/[code]/page.tsx lib/party/peek-room.ts components/brutal/party/screens/PartyJoinTeaser.tsx lib/party/copy.ts
git commit -m "feat(party): join teaser with honest in-game waiting state (Wave 1 V1)"
```

---

## Task 6: SQL migration — modifiers + recap (R3 + V2)

**Files:**
- Create: `supabase/migrations/20260610120000_party_wave1_modifiers_recap.sql`

**Source of truth for RPC bodies:** Copy full `CREATE OR REPLACE FUNCTION` bodies from `supabase/migrations/20260608120000_party_canvas_editor.sql` (lines 146–757 for create/start/advance/submit). For `party_rematch`, copy from Task 1 migration `20260609120000_party_wave1_rematch_reveal_peek.sql`. Apply the deltas in Step 2 — the committed migration must contain **complete** function definitions, zero stub comments.

- [ ] **Step 1: Write schema + new helper functions + recap RPC**

Paste this block verbatim at the top of the migration file:

```sql
-- Party Wave 1: round modifiers + public recap

alter table public.party_rooms
  add column if not exists round_modifiers_enabled boolean not null default false,
  add column if not exists current_modifier text
    check (current_modifier is null or current_modifier in ('three_words', 'forty_chars', 'all_caps'));

create or replace function public.party_validate_round_modifier(p_modifier text, p_plain text)
returns text
language plpgsql
immutable
as $$
declare
  v_plain text := trim(coalesce(p_plain, ''));
  v_words int;
begin
  if p_modifier is null then
    return null;
  end if;

  if p_modifier = 'three_words' then
    select count(*) into v_words
    from regexp_split_to_table(v_plain, '\s+') w
    where w <> '';
    if v_words > 3 then
      return 'modifier_violation';
    end if;
    return null;
  end if;

  if p_modifier = 'forty_chars' then
    if char_length(v_plain) > 40 then
      return 'modifier_violation';
    end if;
    return null;
  end if;

  if p_modifier = 'all_caps' then
    if v_plain <> upper(v_plain) then
      return 'modifier_violation';
    end if;
    return null;
  end if;

  return null;
end;
$$;

create or replace function public.party_pick_round_modifier()
returns text
language sql
volatile
as $$
  select (array['three_words', 'forty_chars', 'all_caps'])[1 + floor(random() * 3)::int];
$$;

create or replace function public.party_get_recap(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.party_rooms%rowtype;
  v_winners jsonb;
  v_round_winner jsonb;
begin
  select * into v_room from public.party_rooms where code = upper(trim(p_code));

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.status <> 'finished' or v_room.phase <> 'finished' then
    return jsonb_build_object('ok', false, 'error', 'not_finished');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', pr.handle,
    'score', pp.score,
    'avatarUrl', pr.avatar_url
  ) order by pp.score desc), '[]'::jsonb)
  into v_winners
  from public.party_players pp
  join public.profiles pr on pr.user_id = pp.user_id
  where pp.room_id = v_room.id
    and pp.score = (select max(score) from public.party_players where room_id = v_room.id)
    and pp.score > 0;

  select jsonb_build_object(
    'handle', pr.handle,
    'caption', ps.caption,
    'captionRich', ps.caption_rich,
    'voteCount', prr.vote_count,
    'templateId', ps.template_id
  )
  into v_round_winner
  from public.party_round_results prr
  join public.party_submissions ps on ps.id = prr.submission_id
  join public.profiles pr on pr.user_id = ps.user_id
  where prr.room_id = v_room.id
  order by prr.vote_count desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'roomCode', v_room.code,
    'roundCount', v_room.round_count,
    'gameWinners', v_winners,
    'roundWinner', v_round_winner
  );
end;
$$;

revoke all on function public.party_get_recap(text) from public;
grant execute on function public.party_get_recap(text) to anon, authenticated;
```

- [ ] **Step 2: Patch existing RPCs — exact deltas**

Append **full** `CREATE OR REPLACE` functions below Step 1 content. For each function: open source file → copy entire body → apply **only** these edits → paste into migration.

**Shared snippet** — insert in `party_submit_caption` after every `party_caption_has_profanity` check on `v_plain`, before `v_caption := v_plain` / `insert into party_submissions` (three code paths: canvas v3, rich v2, plain):

```sql
  v_validation_error := public.party_validate_round_modifier(v_room.current_modifier, v_plain);
  if v_validation_error is not null then
    return jsonb_build_object(
      'ok', false,
      'error', v_validation_error,
      'modifier', v_room.current_modifier
    );
  end if;
```

Add to `declare` block if not present: `v_validation_error text;` (reuse existing var in canvas path).

---

**2a. `party_create_room`** — source: `20260608120000_party_canvas_editor.sql:146–225`

1. Drop old overloads and add 4th parameter:

```sql
drop function if exists public.party_create_room(smallint, smallint, boolean);

create or replace function public.party_create_room(
  p_round_count smallint default 5,
  p_rerolls_per_player smallint default 0,
  p_canvas_editor_enabled boolean default false,
  p_round_modifiers_enabled boolean default false
)
```

2. In `insert into public.party_rooms (...) values (...)`, add column + value:

```sql
        round_modifiers_enabled,
-- values:
        coalesce(p_round_modifiers_enabled, false),
```

3. In `party_log_event` meta jsonb, add:

```sql
      'round_modifiers_enabled', coalesce(p_round_modifiers_enabled, false)
```

4. Update grants at file bottom:

```sql
revoke all on function public.party_create_room(smallint, smallint, boolean, boolean) from public;
grant execute on function public.party_create_room(smallint, smallint, boolean, boolean) to authenticated;
```

---

**2b. `party_start_game`** — source: `20260608120000_party_canvas_editor.sql:227–287`

In the `update public.party_rooms set` block that enters round 1 caption phase, add:

```sql
    current_modifier = case
      when round_modifiers_enabled then public.party_pick_round_modifier()
      else null
    end,
```

(before or after `phase_ends_at` line — same `UPDATE`)

---

**2c. `party_advance_phase`** — source: `20260608120000_party_canvas_editor.sql:289–418`

In the `reveal → next caption` branch (`v_next_round := v_room.current_round + 1`), extend the `update public.party_rooms set` with the same `current_modifier = case ... end` expression as 2b.

---

**2d. `party_submit_caption`** — source: `20260608120000_party_canvas_editor.sql:562–757`

Insert the **shared snippet** in all three profanity-checked paths (lines ~647, ~696, ~730 in source).

---

**2e. `party_rematch`** — source: Task 1 migration (supersedes Task 1 version)

In the `update public.party_rooms set` block, add:

```sql
    current_modifier = null,
```

Full function must still include `delete from public.party_player_rounds` and all Task 1 cleanup.

---

- [ ] **Step 3: Verify migration is complete**

Before commit, grep the migration file:

```bash
rg "Patch party_|TODO|TBD|stub" supabase/migrations/20260610120000_party_wave1_modifiers_recap.sql
```

Expected: **no matches**

- [ ] **Step 4: Apply + regen types**

Run migration apply + `database.types.ts` regen

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260610120000_party_wave1_modifiers_recap.sql lib/database.types.ts
git commit -m "feat(party): round modifiers schema/RPCs and public recap RPC (Wave 1 R3+V2)"
```

---

## Task 7: Round modifiers — TS layer + UI (R3)

**Files:**
- Create: `lib/party/round-modifiers.ts`
- Create: `scripts/test-party-modifiers.mjs`
- Modify: `lib/party/types.ts`, `lib/party/snapshot.ts`
- Modify: `lib/supabase/party-rpc.ts`, `app/api/party/rooms/route.ts`
- Modify: `components/brutal/party/party-page-client.tsx`
- Modify: `components/brutal/party/party-caption-input.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileCaption.tsx`
- Modify: `lib/party/copy.ts`

- [ ] **Step 1: TS modifier helper (mirrors SQL)**

```ts
// lib/party/round-modifiers.ts
export type PartyRoundModifier = "three_words" | "forty_chars" | "all_caps";

export function validateRoundModifier(modifier: PartyRoundModifier | null, plain: string): boolean {
  const v = plain.trim();
  if (!modifier) return true;
  if (modifier === "three_words") {
    return v.split(/\s+/).filter(Boolean).length <= 3;
  }
  if (modifier === "forty_chars") return v.length <= 40;
  if (modifier === "all_caps") return v === v.toUpperCase();
  return true;
}

export const MODIFIER_LABELS: Record<PartyRoundModifier, string> = {
  three_words: "Max. 3 Wörter",
  forty_chars: "Max. 40 Zeichen",
  all_caps: "NUR GROSSBUCHSTABEN",
};
```

- [ ] **Step 2: Unit tests**

```js
import { validateRoundModifier } from "../lib/party/round-modifiers.ts";

test("all_caps rejects lowercase plain text", () => {
  assert.equal(validateRoundModifier("all_caps", "hello"), false);
});

test("all_caps accepts literal uppercase", () => {
  assert.equal(validateRoundModifier("all_caps", "HELLO"), true);
});

test("three_words rejects fourth word", () => {
  assert.equal(validateRoundModifier("three_words", "one two three four"), false);
});
```

Run: `npm run test:party-modifiers`

- [ ] **Step 3: Extend types + snapshot**

```ts
// lib/party/types.ts — inside room:
roundModifiersEnabled: boolean;
currentModifier: PartyRoundModifier | null;
```

Map from DB in `snapshot.ts` (`round_modifiers_enabled`, `current_modifier`).

- [ ] **Step 4: Create room toggle**

- `partyCreateRoomRpc(..., roundModifiersEnabled: boolean)`
- `app/api/party/rooms/route.ts` parse `roundModifiersEnabled` from body
- `party-page-client.tsx` checkbox **Chaos-Runden** default off → POST field

- [ ] **Step 5: Caption UI banner**

When `snapshot.room.currentModifier`, show banner with `MODIFIER_LABELS[modifier]` above meme in caption screens.

- [ ] **Step 6: all_caps client auto-uppercase (canvas)**

In caption editor onChange/blur when modifier is `all_caps`, uppercase segment `.text` in document state (not just CSS caps). Server still validates `v_plain`.

- [ ] **Step 7: Submit error mapping**

When API returns `modifier_violation`, show `PARTY_COPY.modifierViolation(modifier)` inline.

- [ ] **Step 8: Commit**

```bash
git add lib/party/round-modifiers.ts lib/party/types.ts lib/party/snapshot.ts lib/supabase/party-rpc.ts app/api/party/rooms/route.ts components/brutal/party/party-page-client.tsx components/brutal/party/party-caption-input.tsx lib/party/copy.ts scripts/test-party-modifiers.mjs package.json
git commit -m "feat(party): chaos round modifiers UI and validation (Wave 1 R3)"
```

---

## Task 8: Public recap page + ShareCard (V2)

**Files:**
- Modify: `lib/supabase/party-rpc.ts`, `lib/party/peek.ts`
- Create: `app/(site)/party/recap/[code]/page.tsx`
- Modify: `components/brutal/party/screens/ShareCard.tsx`
- Modify: finished screens (copy recap button if not done in Task 3)

- [ ] **Step 1: Recap RPC wrapper + parser**

```ts
export function partyGetRecapRpc(supabase: RpcSupabase, code: string) {
  return callRpc(supabase, "party_get_recap", { p_code: code });
}

export function parsePartyRecap(data: unknown): { ok: true; data: ShareCardData } | { ok: false; error: string } {
  // map snake_case RPC → ShareCardData (reuse buildShareCardData field names)
}
```

Prefer building a `shareCardDataFromRecapRpc(row)` in `lib/party/share-card-data.ts` that maps RPC JSON to existing `ShareCardData` (load template image via `party_templates` join or embed template paths in RPC follow-up if needed).

- [ ] **Step 2: Recap page**

```tsx
// app/(site)/party/recap/[code]/page.tsx
export default async function PartyRecapPage({ params }) {
  const code = (await params).code.trim().toUpperCase();
  const supabase = await createClient();
  const { data } = await partyGetRecapRpc(supabase, code);
  const recap = parsePartyRecap(data);
  if (!recap.ok) return <Shell>…not finished / not found…</Shell>;
  return (
    <Shell>
      <ShareCard data={recap.data} embedded showPngDownload={false} />
      <Link href="/party">PLAY MEMEFIGHT PARTY →</Link>
      <Link href={`/party/join/${code}`}>Join this crew →</Link>
    </Shell>
  );
}
```

Add `generateMetadata` from winner handle.

- [ ] **Step 3: ShareCard — copy recap link**

Add button next to copy link:

```tsx
const recapUrl = getAppUrl(`/party/recap/${data.roomCode}`);
// copy handler + optional analytics POST or client event
```

Show `PARTY_COPY.recapPublicDisclosure(recapUrl)` below buttons.

- [ ] **Step 4: Manual smoke**

Finish game → recap URL loads without login → disclosure visible on finished screen.

- [ ] **Step 5: Commit**

```bash
git add app/(site)/party/recap lib/party/peek.ts lib/party/share-card-data.ts lib/supabase/party-rpc.ts components/brutal/party/screens/ShareCard.tsx
git commit -m "feat(party): public recap page and share link (Wave 1 V2)"
```

---

## Task 9: Ready pressure copy (R4)

**Files:**
- Modify: `lib/party/copy.ts`
- Modify: `components/brutal/party/party-caption-input.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileCaption.tsx`
- Modify: `components/brutal/party/party-voting-screen.tsx` (and desktop voting if separate)

- [ ] **Step 1: Copy pool**

```ts
captionProgress: (done: number, total: number) => `${done}/${total} captioned`,
captionProgressFlavor: [
  (remaining: number) => `${remaining} goblins still typing…`,
  (remaining: number) => `${remaining} Memes in the making…`,
],
voteProgress: (done: number, total: number) => `${done}/${total} voted`,
```

- [ ] **Step 2: Caption header component**

Small inline component or fragment near phase timer:

```tsx
const remaining = snapshot.players.length - snapshot.captionCount;
<p>{PARTY_COPY.captionProgress(snapshot.captionCount, snapshot.players.length)}</p>
{remaining > 0 && !locked ? (
  <p className="text-white/40 text-xs">{pickFlavor(remaining)}</p>
) : null}
```

Pick flavor once on phase entry (`useRef` + `useEffect` on `currentRound`).

- [ ] **Step 3: Voting progress line**

Same pattern with `votesCastCount`.

- [ ] **Step 4: Commit**

```bash
git add lib/party/copy.ts components/brutal/party/party-caption-input.tsx components/brutal/party/mobile/PartyMobileCaption.tsx components/brutal/party/party-voting-screen.tsx
git commit -m "feat(party): ready pressure progress copy (Wave 1 R4)"
```

---

## Task 10: QA doc + verification bundle

**Files:**
- Modify: `docs/party-manual-qa.md`

- [ ] **Step 1: Add Wave 1 Parallel section**

Copy checklist from spec (17 rows).

- [ ] **Step 2: Run automated tests**

```bash
npm run test:party-rpc-parse
npm run test:party-modifiers
npm run test:caption-fields
npm run test:caption-rich
npm run test:caption-layout
npm run test:party-handle
npx tsc --noEmit
```

Expected: all PASS, no type errors

- [ ] **Step 3: Commit**

```bash
git add docs/party-manual-qa.md
git commit -m "docs(party): Wave 1 parallel manual QA checklist"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| R1 rematch + party_player_rounds delete | Task 1, 3 |
| R2 reveal reactions RPC + RLS + UI | Task 1, 4 |
| V1 peek + in_game honest UI, no join RPC | Task 1, 2, 5 |
| R3 modifiers schema + v_plain validation + canvas caps | Task 6, 7 |
| V2 recap RPC + page + disclosure | Task 6, 8, 3 |
| R4 progress copy | Task 9 |
| V1 peek dedupe via React.cache | Task 5 |
| Rematch error handling (not_host, finally) | Task 3 |
| Error codes | Task 2, 6, 7 |
| Manual QA rows | Task 10 |
| Analytics `rematch_started`, `recap_link_copied` | Task 1 (SQL), Task 8 (client) |
| Non-goals (no mid-game join RPC) | Task 5 explicit |

No TBD or stub comments in Task 6 — Step 3 grep verifies; RPC patches use source file + line references with shared insert snippet.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-02-party-wave1-parallel.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — implement tasks in this session with checkpoints (`executing-plans`)

Which approach do you want?
