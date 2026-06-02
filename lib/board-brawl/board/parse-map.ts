import type { BoardCell, BoardMap } from "@/lib/board-brawl/board/map-types";
import type { TileType } from "@/lib/board-brawl/types";

const TILE_TYPES: readonly TileType[] = [
  "plus",
  "minus",
  "event",
  "item",
  "luck",
  "neutral",
  "shop",
];

function isTileType(v: unknown): v is TileType {
  return typeof v === "string" && (TILE_TYPES as readonly string[]).includes(v);
}

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

/**
 * Validate an untrusted board definition (e.g. from bb_maps.definition).
 * Returns a typed BoardMap or null. Callers fall back to the default map on
 * null rather than crashing a live session.
 */
export function parseBoardMap(input: unknown): BoardMap | null {
  if (!input || typeof input !== "object") return null;
  const m = input as Record<string, unknown>;

  if (m.version !== 1) return null;
  if (typeof m.name !== "string") return null;
  if (!isInt(m.width) || !isInt(m.height) || m.width <= 0 || m.height <= 0) return null;
  if (!Array.isArray(m.cells) || m.cells.length < 1) return null;
  if (!isInt(m.startId) || m.startId < 0 || m.startId >= m.cells.length) return null;

  const cells: BoardCell[] = [];
  for (let i = 0; i < m.cells.length; i++) {
    const c = m.cells[i] as Record<string, unknown> | null;
    if (!c || typeof c !== "object") return null;
    if (c.id !== i) return null; // ids must be monotonic 0..n-1 (path order)
    if (!isInt(c.gridX) || !isInt(c.gridY)) return null;
    if (c.gridX < 0 || c.gridY < 0) return null;
    if (c.gridX >= m.width || c.gridY >= m.height) return null;
    if (!isTileType(c.type)) return null;
    cells.push({ id: i, gridX: c.gridX, gridY: c.gridY, type: c.type });
  }

  return {
    version: 1,
    name: m.name,
    width: m.width,
    height: m.height,
    startId: m.startId,
    cells,
  };
}
