import { BOARD_TILE_COUNT } from "@/lib/board-brawl/constants";

/** Walk forward along a looping path of `count` cells. */
export function moveForward(
  position: number,
  steps: number,
  count: number = BOARD_TILE_COUNT
): number {
  return (position + steps) % count;
}
