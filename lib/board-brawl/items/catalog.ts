import type { ItemId } from "@/lib/board-brawl/types";

export const ITEM_IDS: ItemId[] = [
  "golden_dice",
  "coin_magnet",
  "double_shop",
  "tripwire",
  "coin_snatch",
  "star_tax",
];

const GRANT_POOL: ItemId[] = [
  "golden_dice",
  "coin_magnet",
  "tripwire",
  "coin_snatch",
];

export function randomItemGrant(rng: () => number = Math.random): ItemId | null {
  return GRANT_POOL[Math.floor(rng() * GRANT_POOL.length)] ?? null;
}

export function isBoostItem(id: ItemId): boolean {
  return id === "golden_dice" || id === "coin_magnet" || id === "double_shop";
}

export function isSabotageItem(id: ItemId): boolean {
  return id === "tripwire" || id === "coin_snatch" || id === "star_tax";
}
