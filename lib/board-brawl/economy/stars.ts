import { MAX_STARS_PER_PLAYER, STAR_COST_DEFAULT, STAR_COST_UNDERDOG } from "@/lib/board-brawl/constants";

export function starPurchaseCost(currentStars: number, hasDoubleShop = false): number {
  const base = currentStars === 0 ? STAR_COST_UNDERDOG : STAR_COST_DEFAULT;
  return hasDoubleShop ? Math.max(1, Math.floor(base * 0.5)) : base;
}

export function canBuyStar(coins: number, stars: number, hasDoubleShop = false): boolean {
  if (stars >= MAX_STARS_PER_PLAYER) return false;
  return coins >= starPurchaseCost(stars, hasDoubleShop);
}
