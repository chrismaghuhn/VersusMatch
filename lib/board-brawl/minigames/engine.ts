import type { MinigameInput } from "@/lib/board-brawl/types";
import {
  createMinigameState,
  getMinigameTickInterval,
  isMinigameFinished,
  runMinigameTick,
  scoreMinigame,
} from "@/lib/board-brawl/minigames/registry";
import type { MinigameContext } from "@/lib/board-brawl/minigames/types";

export type MinigameTickResult = {
  state: Record<string, unknown>;
  finished: boolean;
  scores: ReturnType<typeof scoreMinigame>;
};

export function initMinigame(
  gameId: string,
  ctx: MinigameContext
): Record<string, unknown> | null {
  return createMinigameState(gameId, ctx);
}

export function tickMinigame(
  gameId: string,
  state: Record<string, unknown>,
  pendingInputs: MinigameInput[],
  lastTickAt: number | null,
  nowMs: number = Date.now()
): { ok: true; result: MinigameTickResult } | { ok: false; reason: "too_soon" } {
  const interval = getMinigameTickInterval(gameId);
  if (lastTickAt !== null && nowMs - lastTickAt < interval) {
    return { ok: false, reason: "too_soon" };
  }

  const dtMs = lastTickAt === null ? interval : nowMs - lastTickAt;
  const next = runMinigameTick(gameId, state, pendingInputs, dtMs);
  const finished = isMinigameFinished(gameId, next);
  const scores = finished ? scoreMinigame(gameId, next) : [];

  return {
    ok: true,
    result: { state: next, finished, scores },
  };
}

export function drainInputs(
  pending: MinigameInput[],
  processedAt: number
): { consumed: MinigameInput[]; remaining: MinigameInput[] } {
  const consumed = pending.filter((i) => i.at <= processedAt);
  const remaining = pending.filter((i) => i.at > processedAt);
  return { consumed, remaining };
}
