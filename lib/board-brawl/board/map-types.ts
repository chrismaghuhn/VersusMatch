import type { TileType } from "@/lib/board-brawl/types";

/** A single board cell, ordered by path index `id` (movement walks id -> id+1). */
export type BoardCell = {
  id: number;
  gridX: number;
  gridY: number;
  type: TileType;
};

/** Editor-ready, data-driven board definition. Stored as bb_maps.definition. */
export type BoardMap = {
  version: 1;
  name: string;
  width: number;
  height: number;
  startId: number;
  cells: BoardCell[];
};
