/**
 * Pure math tile positions for 3D board rendering.
 * MUST NOT import three or @react-three/* — use plain Vec3 objects only.
 */
import type { Vec3 } from "@/lib/board-brawl/types";
import type { BoardMap } from "@/lib/board-brawl/board/map-types";
import {
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  ringCoords,
} from "@/lib/board-brawl/board/default-map";

export const TILE_SPACING = 3.2;

/** Grid cell -> world position, centered on origin. */
export function gridToWorld(
  gridX: number,
  gridY: number,
  width: number,
  height: number
): Vec3 {
  return {
    x: (gridX - (width - 1) / 2) * TILE_SPACING,
    y: 0,
    z: (gridY - (height - 1) / 2) * TILE_SPACING,
  };
}

/** Resolve a cell id to its world position on the given map (wraps on length). */
export function cellToWorld(map: BoardMap, id: number): Vec3 {
  const n = map.cells.length;
  const idx = ((id % n) + n) % n;
  const cell = map.cells[idx]!;
  return gridToWorld(cell.gridX, cell.gridY, map.width, map.height);
}

/** World waypoints walking forward from -> to along the map path. */
export function pathWaypoints(map: BoardMap, from: number, to: number): Vec3[] {
  const points: Vec3[] = [];
  const n = map.cells.length;
  let pos = ((from % n) + n) % n;
  const target = ((to % n) + n) % n;
  while (pos !== target) {
    pos = (pos + 1) % n;
    points.push(cellToWorld(map, pos));
  }
  return points;
}

// --- Legacy ring helpers (default 7x7 ring). Kept for callers/tests that work
// against the classic board without a BoardMap in hand. ---

const RING = ringCoords();

export function tileIndexToWorld(index: number): Vec3 {
  const n = RING.length;
  const idx = ((index % n) + n) % n;
  const c = RING[idx]!;
  return gridToWorld(c.gridX, c.gridY, DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT);
}

export function tilePathWaypoints(from: number, to: number): Vec3[] {
  const points: Vec3[] = [];
  const n = RING.length;
  let pos = ((from % n) + n) % n;
  const target = ((to % n) + n) % n;
  while (pos !== target) {
    pos = (pos + 1) % n;
    points.push(tileIndexToWorld(pos));
  }
  return points;
}
