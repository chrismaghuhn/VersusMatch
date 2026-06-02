import type { MinigameInput } from "@/lib/board-brawl/types";
import type { MinigameLogic, MinigameScoreRow } from "@/lib/board-brawl/minigames/types";
import { buttonMashLogic } from "@/lib/board-brawl/minigames/games/button-mash";
import { precisionAimLogic } from "@/lib/board-brawl/minigames/games/precision-aim";
import { relayDashLogic } from "@/lib/board-brawl/minigames/games/relay-dash";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GAMES: MinigameLogic<any>[] = [
  buttonMashLogic,
  precisionAimLogic,
  relayDashLogic,
];

export function getMinigameById(id: string): MinigameLogic<Record<string, unknown>> | null {
  const game = GAMES.find((g) => g.id === id);
  return game ?? null;
}

export function pickMinigameId(playerCount: number, seed: number): string {
  const playable = GAMES.filter((g) => {
    if (playerCount < 2 || playerCount > 8) return false;
    if (g.id === "relay_dash" && playerCount < 4) return false;
    return true;
  });
  const index = seed % playable.length;
  return playable[index]?.id ?? buttonMashLogic.id;
}

export function listMinigames(): MinigameLogic<Record<string, unknown>>[] {
  return [...GAMES];
}

export function runMinigameTick(
  gameId: string,
  state: Record<string, unknown>,
  inputs: MinigameInput[],
  dtMs: number
): Record<string, unknown> {
  const game = getMinigameById(gameId);
  if (!game) return state;
  return game.tick(state, inputs, dtMs);
}

export function scoreMinigame(
  gameId: string,
  state: Record<string, unknown>
): MinigameScoreRow[] {
  const game = getMinigameById(gameId);
  if (!game) return [];
  return game.score(state);
}

export function createMinigameState(
  gameId: string,
  ctx: Parameters<MinigameLogic<Record<string, unknown>>["createState"]>[0]
): Record<string, unknown> | null {
  const game = getMinigameById(gameId);
  if (!game) return null;
  return game.createState(ctx);
}

export function isMinigameFinished(gameId: string, state: Record<string, unknown>): boolean {
  const game = getMinigameById(gameId);
  if (!game) return true;
  return game.isFinished(state);
}

export function getMinigameTickInterval(gameId: string): number {
  const game = getMinigameById(gameId);
  return game?.tickIntervalMs ?? 500;
}
