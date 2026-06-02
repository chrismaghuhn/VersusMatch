import type { BoardCell, BoardMap } from "@/lib/board-brawl/board/map-types";
import { buildTileLayout } from "@/lib/board-brawl/board/tiles";
import { BOARD_TILE_COUNT } from "@/lib/board-brawl/constants";

/** Square grid whose perimeter holds exactly BOARD_TILE_COUNT cells (7x7 = 24). */
export const DEFAULT_GRID_WIDTH = 7;
export const DEFAULT_GRID_HEIGHT = 7;

/**
 * Perimeter walk (clockwise from top-left) of a width x height grid, in path
 * order. Length = 2*width + 2*height - 4.
 */
export function ringCoords(
  width = DEFAULT_GRID_WIDTH,
  height = DEFAULT_GRID_HEIGHT
): Array<{ gridX: number; gridY: number }> {
  const coords: Array<{ gridX: number; gridY: number }> = [];
  for (let x = 0; x < width; x++) coords.push({ gridX: x, gridY: 0 });
  for (let y = 1; y < height; y++) coords.push({ gridX: width - 1, gridY: y });
  for (let x = width - 2; x >= 0; x--) coords.push({ gridX: x, gridY: height - 1 });
  for (let y = height - 2; y >= 1; y--) coords.push({ gridX: 0, gridY: y });
  return coords;
}

/**
 * Build the default board as data. Tile types are taken verbatim from
 * buildTileLayout(seed) so existing matches (which regenerate from board_seed)
 * are byte-for-byte identical to the legacy ring.
 */
export function generateDefaultMap(seed: number): BoardMap {
  const types = buildTileLayout(seed);
  const coords = ringCoords();
  const cells: BoardCell[] = coords.map((c, id) => ({
    id,
    gridX: c.gridX,
    gridY: c.gridY,
    type: types[id]!,
  }));

  return {
    version: 1,
    name: "Classic Ring",
    width: DEFAULT_GRID_WIDTH,
    height: DEFAULT_GRID_HEIGHT,
    startId: 0,
    cells,
  };
}

/** Sanity guard: the default ring must match the gameplay tile count. */
export function defaultRingLength(): number {
  return 2 * DEFAULT_GRID_WIDTH + 2 * DEFAULT_GRID_HEIGHT - 4;
}

export { BOARD_TILE_COUNT };
