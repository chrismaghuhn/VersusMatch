import type { BoardBrawlPlayerState } from "@/lib/board-brawl/types";

/** Underdog sort: fewest stars, then fewest coins. */
export function sortTurnOrderUnderdog(players: BoardBrawlPlayerState[]): string[] {
  return [...players]
    .sort((a, b) => {
      if (a.stars !== b.stars) return a.stars - b.stars;
      return a.coins - b.coins;
    })
    .map((p) => p.userId);
}

export function shuffleTurnOrder(playerIds: string[], rng: () => number = Math.random): string[] {
  const order = [...playerIds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export function nextTurnIndex(turnIndex: number, turnOrderLength: number): number {
  return (turnIndex + 1) % turnOrderLength;
}
