import type { TileType } from "@/lib/board-brawl/types";
import { BOARD_TILE_COUNT, STAR_SHOP_INDICES } from "@/lib/board-brawl/constants";

/** Deterministic tile types from board seed (Mulberry32). */
export function buildTileLayout(boardSeed: number): TileType[] {
  const rng = mulberry32(boardSeed);
  const slots: TileType[] = new Array(BOARD_TILE_COUNT).fill("neutral");

  const pool: TileType[] = [
    ...Array(6).fill("plus" as TileType),
    ...Array(4).fill("minus" as TileType),
    ...Array(4).fill("event" as TileType),
    ...Array(3).fill("item" as TileType),
    ...Array(2).fill("luck" as TileType),
  ];

  shuffleInPlace(pool, rng);

  let poolIndex = 0;
  for (let i = 0; i < BOARD_TILE_COUNT; i++) {
    if (STAR_SHOP_INDICES.includes(i as (typeof STAR_SHOP_INDICES)[number])) {
      slots[i] = "shop";
    } else if (slots[i] === "neutral" && poolIndex < pool.length) {
      slots[i] = pool[poolIndex++]!;
    }
  }

  return slots;
}

export function isShopTile(index: number): boolean {
  return STAR_SHOP_INDICES.includes(index as (typeof STAR_SHOP_INDICES)[number]);
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
