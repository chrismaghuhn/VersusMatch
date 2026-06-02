export function clampCoins(value: number): number {
  return Math.max(0, value);
}

export const MINIGAME_COIN_REWARDS: Record<string, number> = {
  first: 10,
  second: 7,
  third: 5,
  other: 3,
  team_win: 8,
  solo_1v3: 15,
};

export function rewardCoinsForPlacement(place: number): number {
  if (place === 1) return MINIGAME_COIN_REWARDS.first!;
  if (place === 2) return MINIGAME_COIN_REWARDS.second!;
  if (place === 3) return MINIGAME_COIN_REWARDS.third!;
  return MINIGAME_COIN_REWARDS.other!;
}
