import type { BoardBrawlPlayerState } from "@/lib/board-brawl/types";

export type WinResult = {
  winnerIds: string[];
  sharedWin: boolean;
  chaosCrown: boolean;
};

export function resolveWinners(players: BoardBrawlPlayerState[]): WinResult {
  if (players.length === 0) {
    return { winnerIds: [], sharedWin: false, chaosCrown: false };
  }

  const maxStars = Math.max(...players.map((p) => p.stars));
  let candidates = players.filter((p) => p.stars === maxStars);

  if (candidates.length === 1) {
    return { winnerIds: [candidates[0]!.userId], sharedWin: false, chaosCrown: false };
  }

  const maxCoins = Math.max(...candidates.map((p) => p.coins));
  candidates = candidates.filter((p) => p.coins === maxCoins);

  if (candidates.length === 1) {
    return { winnerIds: [candidates[0]!.userId], sharedWin: false, chaosCrown: false };
  }

  const maxFirst = Math.max(...candidates.map((p) => p.minigameFirstPlaces));
  candidates = candidates.filter((p) => p.minigameFirstPlaces === maxFirst);

  if (candidates.length === 1) {
    return { winnerIds: [candidates[0]!.userId], sharedWin: false, chaosCrown: false };
  }

  return {
    winnerIds: candidates.map((c) => c.userId),
    sharedWin: true,
    chaosCrown: true,
  };
}
