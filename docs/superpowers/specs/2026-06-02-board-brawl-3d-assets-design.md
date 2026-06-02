# Board Brawl — 3D Asset Upgrade + Data-Driven Board (Teil A)

## Overview

Board Brawl currently renders a fixed 24-tile elliptical ring of grey boxes with capsule player tokens (`components/brutal/board-brawl/three/BoardScene.tsx`). This spec upgrades the visuals to real low-poly 3D models (Devil's Work.shop RPG pack + diceCup) tinted into the existing neon-brutalist palette, and **refactors the board to be data-driven on a 2D grid** so that custom maps (Teil B: in-app grid editor + sharing) can be built on the same foundation.

This is **Teil A** of a two-part effort:

- **Teil A (this spec):** 3D asset pipeline, neon-tinted model rendering, and a grid-based, editor-ready board data model with a `bb_maps` table. The existing seeded ring becomes the generated "default map".
- **Teil B (separate spec, later):** Grid map editor UI, save/share maps, select & play custom maps in the lobby.

## Goals

- Replace primitive geometry with `.glb` models for tiles, star, coin, dice, players, and environment.
- Apply neon emissive tinting so the dungeon assets match the brutalist look.
- Make the board data-driven on a 2D grid (positions + ordered path + tile types), backward compatible with current matches.
- Add a `bb_maps` table and optional `bb_rooms.map_id` so rooms can reference a stored map (default map when null).
- Maintain graceful fallback to current primitives when a model is missing.

## Non-Goals (deferred)

- The map editor UI, map sharing, and map selection (Teil B).
- Board forks / branching paths (Spec V1.1).
- Skeletal character animation (idle/walk cycles) — static posed models in V1.
- Replacing the 2D pixel-art sprite set (separate concern).

## Art Direction: Neon-Dungeon Fusion

Low-poly dungeon models keep their geometry and base texture but receive an emissive tint in the brutalist palette via a shared helper:

```
applyNeonTint(object3D, hexColor, intensity)
  - traverse meshes
  - for each MeshStandardMaterial: set emissive = color, emissiveIntensity = intensity
  - slightly desaturate base map tint (multiply color toward grey) so neon reads cleanly
```

Palette reuse from `lib/board-brawl/avatar-colors.ts` (`TILE_COLORS`, `AVATAR_COLORS`). HUD/UI is unchanged.

## Asset Pipeline (Approach A: offline → glb)

### Source assets

- `assets/LowPoly_Pixel_RPG_Assets_devilsworkshop_v02/3D/FBX/*.fbx` (+ PNG/TGA textures)
- `assets/diceCup_standardv1.1/diceCup_standard/*` (FBX/OBJ/DAE + PBR: color, metallicSmoothness, normal)

### Conversion (one-time, documented)

- Convert required FBX/OBJ → `.glb` with Draco compression.
- **Tooling prerequisite (neither Blender nor FBX2glTF is currently installed):** use the standalone **FBX2glTF** binary (downloaded into a git-ignored `tools/` dir) or **Blender CLI** (`blender --background --python`). The chosen path is documented in `scripts/convert-board-brawl-assets.mjs`, which wraps the conversion and writes outputs deterministically.
- Output: `public/board-brawl/models/*.glb`. Draco decoder: `public/draco/`.
- Only the models in the mapping table below are converted in Teil A; the rest stay as source for later.

### Runtime loading

- New module `lib/board-brawl/three/models.ts`:
  - `MODEL_PATHS` (game-element → `.glb` path)
  - `TINT_MAP` (game-element → hex + intensity)
  - `preloadBoardBrawlModels()` calling `useGLTF.preload` for the hot set
- Load via `useGLTF` inside `<Suspense>`.
- **Instancing vs cloning (explicitly separated, no overlap):**
  - **Tiles → `InstancedMesh` per `TileType`.** All cells of one type share one geometry + one tinted material; each cell is a transform matrix from `cellToWorld`. 7 tile types → at most 7 tile draw calls regardless of cell count. The tile `.glb`'s mesh geometry/material is extracted once and fed into the `InstancedMesh`; the loaded `scene` graph itself is NOT cloned per tile.
  - **Props → `scene.clone()` (drei `<Clone>`).** Distinct, low-count objects that differ per placement (shop `arch` + `crown`, `chest`, `torch`, environment `pillar`/`wallStone`, player character models) are cloned per instance. These are intentionally individual draw calls; counts are small (≤ a few dozen).
- **Graceful fallback:** a `<TileInstances>` / `<PropModel>` wrapper renders the existing box/capsule primitive if the `.glb` is absent or fails — enables incremental shipping.

### Draco decoder version coupling

Draco decoder files must match the Three.js runtime version, or `.glb` loading fails **silently** for all models. To avoid this:

- **Preferred:** use drei's `DRACOLoader` via `useGLTF(path, true)` (drei's gltf draco option), which pulls a decoder matched to the bundled three version (CDN-hosted by default) — no manually-pinned decoder to drift.
- If a self-hosted decoder under `public/draco/` is used instead (offline determinism), its version MUST be documented in `docs/board-brawl-dev.md` and bumped together with any `three` upgrade. A note in that doc ties the two versions explicitly.

## Data-Driven Board Model

### Types (`lib/board-brawl/board/map-types.ts`)

```
type BoardCell = {
  id: number;        // path order index (0..n-1), used by movement
  gridX: number;     // editor grid column
  gridY: number;     // editor grid row
  type: TileType;    // plus | minus | event | item | luck | neutral | shop
};

type BoardMap = {
  version: 1;
  name: string;
  width: number;     // grid columns
  height: number;    // grid rows
  startId: number;   // starting cell id (default 0)
  cells: BoardCell[];// ordered by id; movement walks id -> id+1 (mod n)
};
```

Path semantics in V1 remain a single loop: `moveForward(position, steps) = (position + steps) % cells.length`. Cells carry explicit grid coordinates so both 3D placement and the future editor read from the same source.

### World placement (`lib/board-brawl/board/layout-3d.ts`)

- Replace ellipse math with `gridToWorld(gridX, gridY, map)`:
  - `x = (gridX - (width-1)/2) * TILE_SPACING`
  - `z = (gridY - (height-1)/2) * TILE_SPACING`
- `cellToWorld(map, id)` and `pathWaypoints(map, from, to)` derived from cells.
- `layout-3d.ts` keeps its "no three import" contract (pure Vec3).

### Default map generation (`lib/board-brawl/board/default-map.ts`)

- `generateDefaultMap(seed): BoardMap` reproduces today's gameplay: 24 cells laid out as a rectangular ring on the grid, tile types from the existing `buildTileLayout(seed)` pool logic, shop tiles at the ring positions equivalent to indices 6/14/22.
- Guarantees backward compatibility: existing rooms (no `map_id`) generate this map from `board_seed`.

### Persistence

- New table `bb_maps`:
  - `id uuid pk`, `owner_id uuid -> auth.users`, `name text`, `definition jsonb` (a `BoardMap`), `is_public boolean default false`, `created_at timestamptz`.
  - RLS: owner can CRUD own rows; public rows readable by authenticated users. (Editor write paths land in Teil B; table + read policy ship in Teil A so rooms can reference maps.)
  - **Defense-in-depth validation of `definition`:** a `CHECK` constraint enforces the minimal shape at write time — `definition->>'version' = '1'`, `jsonb_typeof(definition->'cells') = 'array'`, `jsonb_array_length(definition->'cells') >= 1`, and `(definition->>'startId')::int >= 0`. This blocks the most common malformed rows before they reach the game.
- `bb_rooms.map_id uuid null references bb_maps(id)`: when null, server uses `generateDefaultMap(board_seed)`. Server loads the map once into the snapshot.
- **Server-side validation + safe fallback (never hard-crash a live session):** `buildSnapshot` resolves the map through `parseBoardMap(definition)` which validates structure (version, non-empty `cells`, monotonic `id` 0..n-1, non-negative `gridX/gridY` within `width`/`height`, valid `TileType`, `startId` in range). On any validation failure the server logs and **falls back to `generateDefaultMap(board_seed)`** rather than throwing — a corrupt stored map degrades to the default board instead of breaking the match. The resolved (validated) `BoardMap` is what the client renders.

## Rendering Architecture

| Game element | Model (`.glb`) | Tint |
|---|---|---|
| Tile `plus` | `ground01` | Lime `#CCFF00` |
| Tile `minus` | `ground01Cracked` | Pink `#FF2D87` |
| Tile `shop` | `arch` + floating `crown` | Lime |
| Tile `item` | `chestA` | Amber `#FFB800` |
| Tile `event` | `ground02` + `torch` | Cyan `#00E1FF` |
| Tile `luck` | `gem` on pedestal | Violet `#9966FF` |
| Tile `neutral` | `ground02` | dim grey |
| Star (buyStar target) | `crown` / `gem` floating + glow | Lime |
| Coin reward FX | `coin` / `coinProcJam` | Gold |
| Dice roll | `diceCup` + `dice` (throw animation replaces number overlay) | PBR + lime rim |
| Player tokens | `char01–04` / `player1–4` (avatarId → model) | Avatar color |
| Environment | `pillar` + `torch` + `wallStone` ring; optional `water01` center | brutalist accents |

### Components

- `BoardScene.tsx` rebuilt to iterate `map.cells`, render an instanced tile per type via `InstancedMesh` (24 cells → few draw calls), place props (shop arch, chest, torch) as cloned models, and render player tokens from character models.
- `DiceRollOverlay` replaced/augmented by a 3D `DiceThrow` using `diceCup` + `dice` driven by `lastRoll` (client-only animation; result still authoritative from server).
- Minigame arenas and finale reskin in a later phase (props swap only).

### Performance

- `InstancedMesh` for repeated tile geometry; matrices from `cellToWorld`.
- `useGLTF.preload` hot set on room mount.
- `BOARD_BRAWL_LOW_QUALITY` (existing `NEXT_PUBLIC_*`): simplified materials, skip environment deco, lower dpr (already wired in `SceneCanvas`).

## Testing

- Unit (Node, existing harness):
  - `default-map.ts` — **exact parity with current gameplay, not just aggregate counts.** The test asserts per-index equality against today's `buildTileLayout`: for a set of fixed seeds (e.g. 1, 42, 1337), `generateDefaultMap(seed).cells[i].type === buildTileLayout(seed)[i]` for **every** index `i` in `0..23`. Plus explicit fixed-index checks: `cells[6].type === 'shop'`, `cells[14].type === 'shop'`, `cells[22].type === 'shop'`. This guarantees in-flight matches (which regenerate from `board_seed`) are not corrupted by a single differing tile.
  - `parseBoardMap`: rejects malformed maps (bad `version`, missing/empty `cells`, non-monotonic `id`, negative or out-of-bounds `gridX/gridY`, invalid `TileType`, out-of-range `startId`) and accepts a valid `generateDefaultMap` output round-trip.
  - `layout-3d.ts`: `gridToWorld` centers the grid; `pathWaypoints` walks forward and wraps; still no `three` import (existing guard test).
  - `movement.ts`: unchanged loop semantics over `cells.length`.
- E2E (`scripts/test-board-brawl-e2e.mjs`): a room with `map_id = null` still plays start→turns→minigame using the generated default map (no gameplay regression).
- Visual/manual: models load and tint; fallback primitives render when a `.glb` is removed; perf acceptable with `LOW_QUALITY` off and on.

## Risks & Mitigations

- **Conversion tooling not installed.** Mitigation: documented `convert-board-brawl-assets.mjs` with FBX2glTF binary (preferred) or Blender CLI; `.glb` outputs committed so contributors don't need the tool to run the game.
- **Asset licensing.** Devil's Work.shop and diceCup ship `License.txt`/itch terms — keep license files alongside committed `.glb` and credit in `docs/board-brawl-dev.md`.
- **Visual clash / readability.** Tint + slight desaturation helper tuned per element; HUD untouched as the readable layer.
- **Scope creep into editor.** Editor strictly deferred to Teil B; Teil A only ships the data model + `bb_maps` read path.

## Migrations

- `bb_maps` table + RLS (owner CRUD, public read) + `CHECK` constraint on `definition` (version=1, `cells` array non-empty, `startId >= 0`).
- `bb_rooms.map_id` nullable FK.
- `bb_players` unaffected.

## Files (created / changed)

- New: `lib/board-brawl/board/map-types.ts`, `default-map.ts`, `parse-map.ts` (`parseBoardMap`); `lib/board-brawl/three/models.ts`; `scripts/convert-board-brawl-assets.mjs`; `public/board-brawl/models/*.glb`; (optional self-hosted) `public/draco/*`; migration `*_board_brawl_maps.sql`.
- Changed: `layout-3d.ts`, `BoardScene.tsx`, `SceneCanvas.tsx`, `room-service.ts` (snapshot map resolution via `parseBoardMap` + default fallback), `types.ts` (snapshot carries `BoardMap`), `database.types.ts`, `docs/board-brawl-dev.md` (Draco decoder version note coupled to `three`).

## Related

- Gameplay/edge-case spec: `2026-06-02-board-brawl-3d-design.md`
- Follow-up: Board Brawl Teil B — Grid Map Editor + Sharing (separate spec)
