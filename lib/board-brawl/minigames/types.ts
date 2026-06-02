import type { MinigameInput, Vec3 } from "@/lib/board-brawl/types";
import { MIN_TICK_INTERVAL_MS } from "@/lib/board-brawl/constants";

export type MinigameFormat = "ffa" | "1v3" | "2v2" | "coop";

export type MinigameContext = {
  playerIds: string[];
  leaderId: string | null;
  roomSeed: number;
  round: number;
  playerStars?: Record<string, number>;
};

export type MinigameScoreRow = {
  playerId: string;
  score: number;
  rank: number;
};

export type CameraPreset = {
  position: Vec3;
  target: Vec3;
  zoom: number;
};

export type MinigameLogic<TState extends Record<string, unknown>> = {
  id: string;
  name: string;
  formats: MinigameFormat[];
  durationSeconds: number;
  tickIntervalMs: number;
  createState: (ctx: MinigameContext) => TState;
  tick: (state: TState, inputs: MinigameInput[], dtMs: number) => TState;
  isFinished: (state: TState) => boolean;
  score: (state: TState) => MinigameScoreRow[];
  cameraPreset: CameraPreset;
};

export function assertTickInterval(ms: number): number {
  return Math.max(MIN_TICK_INTERVAL_MS, ms);
}
