# Board Brawl — Developer Guide

Board Brawl is a private multiplayer board game (Mario Party–style) built with Next.js, Supabase, and React Three Fiber.

## Architecture (TS-first)

Gameplay mutations run in TypeScript via the Supabase **service role** in `lib/board-brawl/server/room-service.ts`, not via `bb_*` gameplay RPCs. API routes under `app/api/board-brawl/` authenticate the user, then call `room-service` functions.

Pure game logic (dice, movement, tiles, minigames) lives under `lib/board-brawl/` and is shared by unit tests and the server.

```
Client (GameLayout / SceneCanvas)
  → POST /api/board-brawl/*
  → room-service.ts (admin client)
  → bb_rooms / bb_players
```

Realtime: Supabase `postgres_changes` on `bb_rooms` and `bb_players`, with a **3s fallback poll** if the channel errors (`lib/board-brawl/realtime.ts`).

## Environment

| Variable | Purpose |
|----------|---------|
| `BOARD_BRAWL_ENABLED=true` | Enables routes and `/board-brawl` pages |
| `NEXT_PUBLIC_BOARD_BRAWL_LOW_QUALITY=true` | Lowers R3F `dpr` and disables antialiasing |

Also requires normal Supabase env vars and service role for API routes.

Copy from `.env.local.example` and set `BOARD_BRAWL_ENABLED=true` for local testing.

## Database

- Schema: `supabase/migrations/20260616120000_board_brawl_schema.sql`
- Host migration: `supabase/migrations/20260617120000_board_brawl_host_stale.sql` (`bb_migrate_host_if_stale`)
- Realtime replica: `supabase/migrations/20260618120000_board_brawl_realtime_replica.sql`
- Maps: `supabase/migrations/20260619120000_board_brawl_maps.sql` (`bb_maps` + `bb_rooms.map_id`)

Apply migrations with the Supabase CLI or dashboard before running E2E.

## 3D assets & data-driven board (Teil A)

The board is **data-driven**: geometry comes from a `BoardMap` (see `lib/board-brawl/board/map-types.ts`), resolved per room by `resolveMap()` in `room-service.ts` and shipped in the snapshot as `snapshot.map`. When `bb_rooms.map_id` is null the board is the deterministic default ring from `board_seed`.

- `generateDefaultMap(seed)` (`lib/board-brawl/board/default-map.ts`) lays a 7x7 perimeter ring (exactly `BOARD_TILE_COUNT` = 24 cells) whose tile types are **byte-for-byte identical** to the legacy `buildTileLayout(seed)`. This guarantees existing rooms are unchanged.
- `parseBoardMap()` (`lib/board-brawl/board/parse-map.ts`) validates untrusted `bb_maps.definition` and returns `null` on any structural problem; `resolveMap()` falls back to the default map so a malformed map never crashes a session. The DB also has a minimal `CHECK` constraint (`bb_maps_definition_shape`) as a first guard.
- `lib/board-brawl/board/layout-3d.ts` is **pure math** (no `three` import): `gridToWorld`, `cellToWorld(map, id)`, `pathWaypoints(map, from, to)`, plus legacy ring helpers.

### Art direction — Neon-Dungeon-Fusion

Low-poly RPG models are rendered flat (no baked textures) and tinted at runtime with the brutalist neon palette via `applyNeonTint()` (`lib/board-brawl/three/neon-tint.ts`): base color desaturated toward charcoal, hue pushed into emissive. Tile/prop/player mappings live in `lib/board-brawl/three/models.ts` (`TILE_VISUALS`, `TILE_PROPS`, `PLAYER_MODELS`).

Rendering (`components/brutal/board-brawl/three/`):
- `models3d.tsx` — `TintedModel` (cloned + tinted glb), `FloorTiles` (one `InstancedMesh` per tile type), and `ModelErrorBoundary`.
- `BoardScene.tsx` / `FinaleScene.tsx` / minigame arenas wrap glb rendering in `ModelErrorBoundary` + `Suspense` with the original **primitive geometry as fallback**, so a missing/failed glb degrades gracefully.

### Asset pipeline (FBX -> glb)

Source FBX live under `assets/` (not shipped). Convert with:

```
node scripts/convert-board-brawl-assets.mjs
```

- Requires the **FBX2glTF v0.9.7** standalone binary at `tools/FBX2glTF.exe` (Windows) — download from <https://github.com/facebookincubator/FBX2glTF/releases>. `tools/` is git-ignored.
- Output: `public/board-brawl/models/*.glb` (binary glTF, **Draco**-compressed). These are small (<7 KB each) and committed.
- Draco decoder is served locally from `public/draco/` (copied from `three/examples/jsm/libs/draco/gltf`, three **0.184**); `useGLTF(path, DRACO_PATH)` uses it instead of the gstatic CDN.
- Asset licenses are copied next to the models: `public/board-brawl/models/LICENSE-devilsworkshop-rpg.txt` and `LICENSE-dicecup.txt`.

> Textures are intentionally not baked (the source FBX carry UVs but no embedded texture references). The neon-tint look does not need them; texture-baking is a possible future enhancement.

## Local testing

1. Apply migrations to your Supabase project.
2. Set `BOARD_BRAWL_ENABLED=true` in `.env.local`.
3. `npm run dev` — open `/board-brawl`, create a room, share join link (`/board-brawl/join/CODE` → `?join=CODE` on lobby).
4. Automated checks:
   - `npm run test:board-brawl`
   - `npm run test:board-brawl-e2e` (needs live Supabase + service role)
   - `npm run typecheck`

## Maintenance (disconnect / host)

On heartbeat, `takeTurn`, and minigame tick, `processRoomMaintenance`:

- Marks players disconnected after **60s** without heartbeat
- Calls `bb_migrate_host_if_stale` when host is stale
- Auto-passes disconnected active player (`forcedRoll: 1`)
- Advances `minigame_results` after **5s**

## Key files

| Area | Path |
|------|------|
| Server | `lib/board-brawl/server/room-service.ts` |
| Stale helpers | `lib/board-brawl/server/room-stale.ts` |
| Room UI | `components/brutal/board-brawl/board-brawl-room-client.tsx` |
| HUD | `components/brutal/board-brawl/hud/` |
| 3D | `components/brutal/board-brawl/three/` |
| Board map model | `lib/board-brawl/board/{map-types,default-map,parse-map,layout-3d}.ts` |
| 3D models/tint | `lib/board-brawl/three/{models,neon-tint}.ts` |
| Asset pipeline | `scripts/convert-board-brawl-assets.mjs` |
| Spec | `docs/superpowers/specs/2026-06-02-board-brawl-3d-assets-design.md` |
