import type { MinigameContext, MinigameLogic } from "@/lib/board-brawl/minigames/types";
import { assertTickInterval } from "@/lib/board-brawl/minigames/types";

const MAX_TAPS_PER_TICK = 4;

type ButtonMashState = {
  taps: Record<string, number>;
  startedAt: number;
  durationMs: number;
  playerStars: Record<string, number>;
};

export const buttonMashLogic: MinigameLogic<ButtonMashState> = {
  id: "button_mash",
  name: "Button Mash",
  formats: ["ffa"],
  durationSeconds: 30,
  tickIntervalMs: assertTickInterval(500),
  cameraPreset: { position: { x: 0, y: 6, z: 12 }, target: { x: 0, y: 0, z: 0 }, zoom: 28 },
  createState(ctx) {
    const taps: Record<string, number> = {};
    const playerStars: Record<string, number> = { ...ctx.playerStars };
    for (const id of ctx.playerIds) {
      taps[id] = 0;
      if (playerStars[id] === undefined) playerStars[id] = 0;
    }
    return { taps, startedAt: Date.now(), durationMs: 30_000, playerStars };
  },
  tick(state, inputs, _dtMs) {
    const next = { ...state, taps: { ...state.taps } };
    let added = 0;
    for (const input of inputs) {
      if (input.type !== "tap") continue;
      if (added >= MAX_TAPS_PER_TICK) break;
      next.taps[input.playerId] = (next.taps[input.playerId] ?? 0) + 1;
      added++;
    }
    return next;
  },
  isFinished(state) {
    return Date.now() - state.startedAt >= state.durationMs;
  },
  score(state) {
    const rows = Object.entries(state.taps).map(([playerId, score]) => ({
      playerId,
      score,
      stars: state.playerStars[playerId] ?? 0,
    }));
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.stars - b.stars;
    });
    return rows.map((r, i) => ({ playerId: r.playerId, score: r.score, rank: i + 1 }));
  },
};

export type { ButtonMashState, MinigameContext };
