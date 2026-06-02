# Board Brawl — 3D Party Board Game

**Date:** 2026-06-02 (rev. 2026-06-02 — tick load model, ortho camera, layout-3d boundary, server-side createState, atomic bb_take_turn)  
**Status:** Approved — ready for implementation plan  
**Route:** `/board-brawl`  
**Builds on:** MemeFight auth/profiles, brutalist design tokens, Supabase Party patterns  
**Visual direction:** Full 3D (React Three Fiber), brutalist low-poly, fixed isometric cameras

## Goal

Ship a Mario Party–inspired **browser board game** on MemeFight: private room → 3D lobby → ring board (dice, tiles, coins, stars, items) → 3D minigames between rounds → 3D finale. **2–8 authenticated players.** Server-authoritative rules; clients render snapshot state in WebGL and send inputs only.

## Success Criteria

- 2–8 players finish a 5-round match (board + minigames) in **15–25 minutes** without manual refresh
- Invite link `/board-brawl/join/{code}` survives Magic Link login (`returnTo` preserved)
- Reconnect within 60s restores phase, position, coins, stars, items
- All gameplay transitions via `bb_*` RPCs; clients cannot forge rolls, moves, or minigame scores
- Board + 3 minigames render in WebGL with fixed isometric cameras at **≥30fps mobile / ≥60fps desktop**
- WebGL unavailable → clear error screen (no silent blank canvas)
- Adding a new minigame requires **logic file + arena component + registry entry** only (no board FSM changes)
- Unit tests green for dice, movement, tile effects, win condition, layout-3d, minigame engine

## Non-Goals (V1)

| Area | Deferred |
|------|----------|
| glTF character models / external 3D pipeline | Post-V1 |
| Physics engine (Rapier/Cannon) | Post-V1 |
| Orbit / follow camera | Post-V1 |
| Touch-only mobile controls | Post-V1 |
| Public lobbies / matchmaking | Post-V1 |
| Spectator mode | Post-V1 |
| Battle Pass / rewards integration | Post-V1 |
| Recap OG page `/board-brawl/recap/[code]` | V1.1 |
| Fork paths on board | V1.1 |
| Fourth+ playable minigames (stubs only in V1) | V1.1+ |
| i18n | English UI copy in V1 |

---

## Game Rules

### Room

- **Private room**, 6-character code (same charset as Party: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
- Routes: `/board-brawl`, `/board-brawl/join/[code]`, `/board-brawl/room/[id]`
- Feature flag: `BOARD_BRAWL_ENABLED=true` (default false locally)
- **Separate from** `/party` — no shared lobby or tables

### Players

- **Minimum 2** ready players to start, **maximum 8**
- Host creates room; host starts when `count(ready) >= 2`
- All players authenticated with `profiles` row (onboarding gate)
- Avatars: reuse Party `avatar_id` presets — **cosmetic only** (3D token color/mesh variant)

### Match settings (host, lobby only)

| Setting | Values | Default |
|---------|--------|---------|
| Board rounds | 3, 5, 7 | 5 |

Settings locked after `bb_start_game` until rematch returns to `waiting`.

### Board

- **24-tile ring**, linear path, index 0 = start, wrap after 23 → 0
- **Dice:** uniform W1–W10 per roll
- **Movement:** forward along path by roll amount
- **Star shops:** tile indices **6, 14, 22** — on land, player may buy 1 star for **20 coins** (15 if player has 0 stars)
- **Star cap:** max **3 stars per player per match**
- **Collision:** multiple tokens may occupy same tile

#### Tile distribution (24 cells)

| Type | Count | Effect |
|------|-------|--------|
| Plus | 6 | +3 coins (+4 if buyer has ≤2 stars total in match — underdog bonus on income) |
| Minus | 4 | −2 coins (floor 0) |
| Event | 4 | Random from event pool |
| Item | 3 | Grant random tier-1 item (respect max 2 inventory) |
| Luck | 2 | 50% +5 coins / 50% star-chance token (+10% next star purchase discount) |
| Neutral | 5 | No effect |
| Star shop | 3 | Fixed indices 6, 14, 22 (also typed as shop overlay on neutral/plus tile slot) |

Tile layout is **deterministic from `board_seed`** (generated at start); same seed → same type per index.

#### Event pool

| Event | Weight | Effect |
|-------|--------|--------|
| coin_shower | 30% | All players +2 coins |
| taxman | 25% | Player(s) with most stars −3 coins |
| swap | 20% | Active player swaps position with random opponent |
| bonus_roll | 15% | Active player rolls again immediately |
| nothing | 10% | Flavor only |

### Turn order

- Round 1: random order stored in `turn_order[]`
- After each minigame: sort by **stars ascending**, then **coins ascending** — weakest player goes first (comeback)
- One full turn cycle per board round (each player rolls once per board round)

#### Board turn atomicity (race-safe)

**Problem:** Splitting `bb_roll_dice` + `bb_resolve_move` into two HTTP calls opens a race window (double roll, move without roll, stale client retries, concurrent tabs).

**Decision:** Single atomic RPC **`bb_take_turn`** — roll, move, and tile effect run in **one Postgres transaction**. No separate roll/move endpoints in V1.

| Approach | Verdict |
|----------|---------|
| `bb_roll_dice` + `bb_resolve_move` + `pending_action='move'` lock | Rejected — lock helps but still two network round-trips and retry ambiguity |
| **`bb_take_turn`** (atomic) | **Selected** — eliminates roll/move race; client animates from one snapshot update |

**`pending_action` values** (post-turn UI gates, not roll/move split):

| Value | Meaning | Valid RPCs |
|-------|---------|------------|
| `take_turn` | Active player may act | `bb_take_turn`, `bb_use_item` (self boost before turn) |
| `shop` | Landed on star shop; buy or skip | `bb_buy_star`, `bb_skip_shop` |
| `item_target` | Sabotage item; pick target | `bb_use_item` (with target) |
| `null` | No player input expected | `bb_advance_phase` (host/system only) |

**`bb_take_turn` flow (single transaction):**

1. Validate `phase = board_turn`, caller = `active_player_id`, `pending_action = take_turn`
2. Resolve optional pre-turn item modifiers (e.g. golden_dice, tripwire on self — items consumed via prior `bb_use_item` or inline if queued)
3. Roll W1–W10 (modified by items)
4. Move token forward with wrap
5. Apply tile effect (plus/minus/event/item/luck/neutral)
6. Handle **`bonus_roll` event** internally (repeat steps 3–5 within same transaction, max 2 chains to prevent infinite loop)
7. If star shop tile → set `pending_action = shop`, keep same active player, **stop** (do not advance turn)
8. Else → advance `turn_index` / next `active_player_id`, set `pending_action = take_turn` for next player, or transition to minigame when round complete

**Client UX:** One HUD button **Roll** → POST `/api/board-brawl/take-turn` → Realtime snapshot carries `lastRoll`, new `position`, updated coins. Client plays dice animation (800ms) then token lerp — **display only**, never a second RPC for move.

**Auto-pass (disconnect):** Server-side `bb_take_turn` with forced roll=1, no items — same code path, not a separate cheat RPC.

**Idempotency:** Optional client `turn_nonce` uuid; server rejects duplicate nonce for same active player turn (prevents double-click duplicate POST).

| Resource | Primary use |
|----------|-------------|
| Coins | Star purchase, item shop (future tile), minigame rewards |
| Stars | **Win condition** — most stars after final board round + final minigame |

#### Minigame coin rewards (default)

| Result | Coins |
|--------|-------|
| 1st FFA | +10 |
| 2nd FFA | +7 |
| 3rd FFA | +5 |
| 4th–8th FFA | +3 |
| 2v2 team win (each member) | +8 |
| 1v3 solo win | +15 |

#### Win / tiebreak

1. Most stars  
2. Most coins  
3. Most minigame 1st-place finishes  
4. Shared win + cosmetic “Chaos Crown” flag on snapshot

### Items

Max **2 items** in inventory. Use during `board_turn` before rolling (boost on self) or with target picker (sabotage).

#### Boost

| Item | Effect | Shop cost |
|------|--------|-----------|
| golden_dice | Next roll: uniform W6–W10 | 10 |
| coin_magnet | Next plus tile: +5 instead of +3 | 8 |
| double_shop | Next star purchase: −5 coins | 12 |

#### Sabotage

| Item | Effect | Shop cost |
|------|--------|-----------|
| tripwire | Target: next roll −3 (min 1) | 10 |
| coin_snatch | Target −5, you +5 | 15 |
| star_tax | Target with ≥2 stars: −1 star (once per target per match) | Item tile only |

Items bought in shop UI (future: coin spend on item tile grants free item). V1: item tiles grant random boost/sabotage.

### Comeback mechanics

- Underdog turn order (see above)
- First star costs 15 coins when at 0 stars
- `taxman` event targets highest-star players only
- Last board round: all plus tiles +1 coin

---

## Minigames

### Framework (required)

Each minigame = **two modules**:

1. **Logic** — `lib/board-brawl/minigames/games/{id}.ts`  
   Pure TS: `createState`, `tick`, `isFinished`, `score`. Unit tested. No Three.js.

2. **Scene** — `components/brutal/board-brawl/three/minigames/{Id}Arena.tsx`  
   R3F meshes, animations, raycast/keyboard capture → POST input API.

Registry: `lib/board-brawl/minigames/registry.ts` maps `id → { logic, sceneId, formats, tickIntervalMs }`.

Team assignment: `lib/board-brawl/minigames/teams.ts` from player count + format.

#### Server-side state init (required)

`createState(ctx)` runs **only on the server** inside `bb_advance_phase` when entering `minigame` — never client-side. The RPC:

1. Picks minigame from registry (seeded)
2. Calls `createState` with player list + room seed
3. Persists result to `bb_rooms.minigame_state` jsonb

Clients read target positions, scores, and entity IDs exclusively from snapshot / Realtime — they never derive gameplay state locally. This is required for Precision Aim hit validation (server and client must share the same target coordinates from `minigame_state`).

#### Tick model (load-safe)

**Problem:** 50ms global tick × 8 clients calling tick = up to 160 req/s per room on Vercel.

**Rules:**

| Rule | Detail |
|------|--------|
| Single driver | **Host only** calls `POST /api/board-brawl/minigame/tick` (host migration applies) |
| Per-game interval | `tickIntervalMs` on each registry entry; **minimum 200ms** |
| Input batching | Players POST inputs via `bb_submit_minigame_input` (on key/click); server queues in `minigame_pending_inputs` jsonb; each tick drains queue + runs one `tick()` |
| Idempotency | Tick no-ops if `now - last_tick_at < tickIntervalMs` |
| Fallback | Optional `pg_cron` job (15s) advances stuck minigames if host disconnects (mirror Party) |

**V1 tick intervals:**

| Minigame | tickIntervalMs | Rationale |
|----------|----------------|-----------|
| button_mash | 500 | Tap counting; batch inputs every 500ms |
| relay_dash | 500 | Lane progress; boost events batched |
| precision_aim | 200 | Aim needs snappier feedback; still ≤5 req/s per room |

At most **5 tick requests/s per room** during Precision Aim (host-only), not 160.

### V1 playable (full 3D)

#### button_mash — FFA, 2–8 players, 30s

- **Rules:** Count Space key / primary button taps; max 8 taps/s per player (anti-macro)
- **3D:** Circle of tokens around `#CCFF00` anvil; tap scales token Y
- **tickIntervalMs:** 500
- **Win:** Highest taps; tie → fewer stars wins minigame

#### precision_aim — FFA, 2–8 players, 45s

- **Rules:** 10 real targets spawn sequentially; decoy clicks −1
- **3D:** Floating cube targets at positions from server `minigame_state.targets[]`
- **Input:** Client sends `{ targetId }` (preferred) or `{ worldPoint }`; server validates against **server-owned** target position + hit sphere radius — never trusts client-only raycast
- **tickIntervalMs:** 200
- **Win:** Highest score

#### relay_dash — 2v2, 4/6/8 players, 60s

- **Rules:** Two lanes; teammate handoff at checkpoint; Space = boost (1s cooldown)
- **3D:** Parallel lanes, arch checkpoints, token lerp
- **tickIntervalMs:** 500
- **Win:** First team to finish

### V1 stubs (registry + placeholder arena)

`king_panic` (1v3), `sync_stack` (coop), `memory_match` (FFA), `tile_trap` (FFA) — logic types defined; gray-box arena + “Coming soon” overlay.

### Format rotation by player count

| Players | Formats used |
|---------|--------------|
| 2–3 | FFA only |
| 4 | FFA or 2v2 (seeded 50/50) |
| 5–6 | FFA or 1v3 (leader = most stars) |
| 7–8 | FFA or 2v2 (non-players in 2v2 get +3 coins sit-out bonus) |

---

## 3D UX / Visual Spec

### Stack

- `three`, `@react-three/fiber`, `@react-three/drei`
- Canvas: `dynamic import`, `ssr: false`, only on room page
- **No shadows V1** — ambient + single directional light

### Art direction

- Brutalist MemeFight palette from [lib/party/design.ts](../../lib/party/design.ts): `#CCFF00`, `#FF2D87`, `#00E1FF`, `#FFB800`, `#0A0A0A`, `#1A1A1A`
- `MeshStandardMaterial`, roughness 1, metalness 0
- Procedural primitives V1 (boxes, capsules, instanced tiles) — no glTF

### Camera (fixed orthographic — no orbit controls)

**Decision:** `OrthographicCamera` for **all phases** — matches MemeFight brutalist flatness; no perspective depth distortion. No env flag; not A/B in production.

| Phase | Position (x,y,z) | Target | zoom |
|-------|------------------|--------|------|
| lobby | (0, 14, 18) | origin | 28 |
| board | (0, 22, 22) | board center | 32 |
| minigame | per-arena constant | arena origin | per-arena (see registry `cameraPreset.zoom`) |
| finished | (0, 8, 14) | podium | 30 |

Implement via `@react-three/drei` `OrthographicCamera` in [CameraRig.tsx](components/brutal/board-brawl/three/CameraRig.tsx).

### Layout

```
┌─────────────────────────────────────┐
│  HTML HUD: timer, coins, stars,     │
│  dice button, items, shop modal     │
├─────────────────────────────────────┤
│                                     │
│         R3F Canvas (full bleed)     │
│         phase-specific scene        │
│                                     │
└─────────────────────────────────────┘
```

- HUD is **DOM** (accessibility, Inter 900 typography)
- 3D scene is **view-only** except minigame raycasts
- Token movement: client lerps toward snapshot position (600ms); server is authoritative

### Phase screens

| Phase | 3D scene | HUD |
|-------|----------|-----|
| waiting | LobbyScene — pedestals per player | Ready, round count, start, copy link |
| board_turn / board_resolve | BoardScene — ring + tokens + dice | Roll, items, shop |
| minigame | Dynamic MinigameArena | Rules, countdown, live scores |
| minigame_results | Same arena frozen | Results overlay 5s |
| finished | FinaleScene — podium + particles | Stats, rematch |

### Performance

| Target | Value |
|--------|-------|
| Board draw calls | ≤30 (instanced tiles) |
| Desktop | ≤16ms/frame |
| Mobile | ≤33ms/frame |
| dpr | `[1, 1.5]` desktop; `[1, 1.25]` mobile |

`BOARD_BRAWL_LOW_QUALITY=true` or auto-detect: dpr=1, no finale particles, shorter lerps.

### WebGL guard

On mount: if WebGL context fails → `BoardBrawlErrorState` with code `webgl_unsupported`.

---

## Architecture

### Layering

| Layer | Path | Imports Three? |
|-------|------|----------------|
| Rules | `lib/board-brawl/**` | No |
| API | `app/api/board-brawl/**` | No |
| RPC | `supabase/migrations/*board_brawl*` | No |
| 3D view | `components/brutal/board-brawl/three/**` | Yes |
| HUD | `components/brutal/board-brawl/hud/**` | No |

#### `layout-3d.ts` boundary

File: `lib/board-brawl/board/layout-3d.ts`

- **Pure math only** — must not import `three` or `@react-three/*`
- Return type: plain `Vec3 = { x: number; y: number; z: number }` (not `THREE.Vector3`)
- Maps tile index 0–23 → world coordinates for token placement
- Unit test `scripts/test-board-brawl-layout-3d.mjs` asserts outputs are plain objects and module has no Three dependency
- R3F scenes convert `Vec3` → Three vectors at render boundary only

### State machine (`bb_rooms.phase`)

```
waiting
  → board_turn (per player)
  → board_resolve (tile effect, shop prompt)
  → … all players …
  → minigame
  → minigame_results
  → round_end
  → (repeat until current_round = round_count)
  → finished
```

`bb_rooms.status`: `open` | `in_progress` | `finished` | `abandoned`

### Realtime

- Supabase `postgres_changes` on `bb_rooms`, `bb_players` filtered by `room_id`
- Client hook: `useBoardBrawlRealtime({ roomId, onRefresh })`
- Fallback poll: GET `/api/board-brawl/rooms/[id]` every 3s if channel error

### Snapshot contract

```typescript
type BoardBrawlSnapshot = {
  room: {
    id: string;
    code: string;
    status: "open" | "in_progress" | "finished" | "abandoned";
    phase: BoardBrawlPhase;
    roundCount: number;
    currentRound: number;
    phaseEndsAt: string | null;
    boardSeed: number;
    minigameId: string | null;
    turnIndex: number;
    activePlayerId: string | null;
    lastRoll: number | null;
    pendingAction: "take_turn" | "shop" | "item_target" | null;
  };
  tiles: TileType[]; // length 24
  players: Array<{
    userId: string;
    displayName: string;
    avatarId: string;
    coins: number;
    stars: number;
    position: number;
    items: ItemId[];
    ready: boolean;
    isHost: boolean;
    isDisconnected: boolean;
  }>;
  minigame: {
    state: Json;
    scores: Record<string, number>;
    endsAt: string;
  } | null;
  self: { userId: string };
};
```

Built server-side in `lib/board-brawl/match/snapshot.ts`.

---

## Database

### Tables

**bb_rooms**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| code | text unique | 6 chars |
| host_id | uuid FK auth.users | |
| status | text | open, in_progress, finished, abandoned |
| phase | text | FSM values |
| round_count | smallint | 3, 5, 7 |
| current_round | smallint | 0 until start |
| board_seed | int | tile layout |
| turn_order | uuid[] | |
| turn_index | smallint | |
| active_player_id | uuid nullable | |
| last_roll | smallint nullable | |
| pending_action | text nullable | |
| minigame_id | text nullable | |
| minigame_state | jsonb | Server-authored gameplay state |
| minigame_pending_inputs | jsonb | Queued inputs drained per tick |
| last_tick_at | timestamptz nullable | Rate-limit bb_tick_minigame |
| phase_ends_at | timestamptz nullable | |
| created_at | timestamptz | |

**bb_players**

| Column | Type | Notes |
|--------|------|-------|
| room_id | uuid FK | |
| user_id | uuid FK | |
| coins | int default 0 | |
| stars | int default 0 | |
| position | smallint default 0 | |
| items | jsonb default [] | max 2 |
| avatar_id | text | |
| ready | boolean default false | |
| is_host | boolean | |
| last_seen_at | timestamptz | |
| disconnected_at | timestamptz nullable | |
| PK (room_id, user_id) | | |

RLS: members read room; writes via SECURITY DEFINER RPCs only (Party pattern).

### RPCs

`bb_create_room`, `bb_join_room`, `bb_leave_room`, `bb_set_ready`, `bb_start_game`, `bb_take_turn`, `bb_skip_shop`, `bb_buy_star`, `bb_use_item`, `bb_advance_phase`, `bb_submit_minigame_input`, `bb_tick_minigame`, `bb_get_snapshot`, `bb_migrate_host_if_stale`

**Removed (not in V1):** `bb_roll_dice`, `bb_resolve_move` — superseded by `bb_take_turn`.

All return JSON `{ ok: boolean, error?: string, ... }`.

Stable error codes: `unauthorized`, `not_in_room`, `not_host`, `not_active_player`, `wrong_phase`, `wrong_pending_action`, `room_full`, `bad_code`, `not_found`, `invalid_action`, `duplicate_turn`.

---

## API Routes

| Method | Path | RPC / action |
|--------|------|--------------|
| POST | `/api/board-brawl/rooms` | bb_create_room |
| POST | `/api/board-brawl/join` | bb_join_room |
| POST | `/api/board-brawl/leave` | bb_leave_room |
| POST | `/api/board-brawl/ready` | bb_set_ready |
| POST | `/api/board-brawl/start` | bb_start_game |
| POST | `/api/board-brawl/take-turn` | bb_take_turn |
| POST | `/api/board-brawl/skip-shop` | bb_skip_shop |
| POST | `/api/board-brawl/buy-star` | bb_buy_star |
| POST | `/api/board-brawl/use-item` | bb_use_item |
| POST | `/api/board-brawl/minigame/input` | bb_submit_minigame_input |
| POST | `/api/board-brawl/minigame/tick` | bb_tick_minigame |
| POST | `/api/board-brawl/heartbeat` | update last_seen_at |
| GET | `/api/board-brawl/rooms/[id]` | bb_get_snapshot |

Auth: `requireBoardBrawlApi()` — logged in + feature flag.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Disconnect | After 60s no heartbeat: mark disconnected; server runs `bb_take_turn` auto-pass (roll=1, no item) |
| Rejoin | Allowed until `finished`; GET snapshot restores full state |
| Host disconnect | `bb_migrate_host_if_stale` — oldest member promoted |
| Invalid input | RPC rejects; HUD shows normalized error from copy.ts |
| Duplicate take-turn POST | `turn_nonce` dedup or `wrong_pending_action` if not `take_turn` |
| Roll/move race | Prevented — single `bb_take_turn` transaction |
| Tie stars | Tiebreaker chain → shared win |
| Tab hidden | Timers continue |
| Minigame tick race | Host-only tick; server merges queued inputs once per tickIntervalMs |
| Host disconnect mid-minigame | `bb_migrate_host_if_stale` promotes driver; optional pg_cron fallback |

---

## Testing

### Unit (Node, no WebGL)

- `scripts/test-board-brawl-dice.mjs`
- `scripts/test-board-brawl-movement.mjs`
- `scripts/test-board-brawl-tile-effects.mjs`
- `scripts/test-board-brawl-win-condition.mjs`
- `scripts/test-board-brawl-layout-3d.mjs`
- `scripts/test-board-brawl-minigame-engine.mjs`

### Manual QA

See [docs/board-brawl-qa.md](../board-brawl-qa.md) (to be written at implementation).

---

## File Map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260602180000_board_brawl_schema.sql` | Tables, RLS, Realtime |
| `supabase/migrations/20260602181000_board_brawl_rpc.sql` | RPCs |
| `lib/board-brawl/**` | Rules, snapshot, minigame logic |
| `lib/supabase/board-brawl-rpc.ts` | Typed wrappers |
| `app/api/board-brawl/**` | HTTP layer |
| `app/(site)/board-brawl/**` | Pages |
| `components/brutal/board-brawl/**` | HUD + 3D scenes |
| `middleware.ts` | Session refresh matcher |
| `.env.local.example` | `BOARD_BRAWL_ENABLED` |

---

## Implementation Milestones

1. **M0** — Schema, RPCs, pure logic, tests, API, snapshot (no Canvas)
2. **M1** — R3F core + BoardScene static + HUD take-turn wired
3. **M2** — Token lerp, dice anim, lobby, shop
4. **M3** — Minigame framework + button_mash E2E
5. **M4** — precision_aim + relay_dash + finale + edge cases
6. **M5** — Perf pass, docs, QA sign-off

---

## Related Docs

- Implementation plan: Cursor plan `board_brawl_implementation_c30ba80d.plan.md`
- Dev guide (post-impl): [docs/board-brawl-dev.md](../board-brawl-dev.md)
- Party reference spec: [2026-06-03-meme-party-live-design.md](./2026-06-03-meme-party-live-design.md)
