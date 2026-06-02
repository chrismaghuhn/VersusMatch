import type { MinigameLogic } from "@/lib/board-brawl/minigames/types";
import { assertTickInterval } from "@/lib/board-brawl/minigames/types";

type RelayDashState = {
  teamA: string[];
  teamB: string[];
  progress: Record<string, number>;
  finished: string[];
  startedAt: number;
  durationMs: number;
};

export const relayDashLogic: MinigameLogic<RelayDashState> = {
  id: "relay_dash",
  name: "Relay Dash",
  formats: ["2v2"],
  durationSeconds: 60,
  tickIntervalMs: assertTickInterval(500),
  cameraPreset: { position: { x: 14, y: 5, z: 0 }, target: { x: 0, y: 0, z: 0 }, zoom: 24 },
  createState(ctx) {
    const half = Math.ceil(ctx.playerIds.length / 2);
    const teamA = ctx.playerIds.slice(0, half);
    const teamB = ctx.playerIds.slice(half);
    const progress: Record<string, number> = {};
    for (const id of ctx.playerIds) progress[id] = 0;
    return {
      teamA,
      teamB,
      progress,
      finished: [],
      startedAt: Date.now(),
      durationMs: 60_000,
    };
  },
  tick(state, inputs, _dtMs) {
    const next: RelayDashState = {
      ...state,
      progress: { ...state.progress },
      finished: [...state.finished],
    };

    for (const input of inputs) {
      if (input.type !== "boost") continue;
      const current = next.progress[input.playerId] ?? 0;
      next.progress[input.playerId] = Math.min(100, current + 12);
      if (next.progress[input.playerId] >= 100 && !next.finished.includes(input.playerId)) {
        next.finished.push(input.playerId);
      }
    }

    return next;
  },
  isFinished(state) {
    if (Date.now() - state.startedAt >= state.durationMs) return true;
    const teamADone = state.teamA.every((id) => state.progress[id] >= 100);
    const teamBDone = state.teamB.every((id) => state.progress[id] >= 100);
    return teamADone || teamBDone;
  },
  score(state) {
    const teamAProgress =
      state.teamA.reduce((sum, id) => sum + (state.progress[id] ?? 0), 0) / state.teamA.length;
    const teamBProgress =
      state.teamB.reduce((sum, id) => sum + (state.progress[id] ?? 0), 0) / state.teamB.length;
    const teamAWins = teamAProgress >= teamBProgress;
    const winners = teamAWins ? state.teamA : state.teamB;
    const losers = teamAWins ? state.teamB : state.teamA;
    const rows = [
      ...winners.map((playerId, i) => ({ playerId, score: 100 - i, rank: 1 })),
      ...losers.map((playerId, i) => ({ playerId, score: 50 - i, rank: 2 })),
    ];
    return rows;
  },
};

export type { RelayDashState };
