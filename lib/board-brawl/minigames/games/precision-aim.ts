import type { MinigameLogic } from "@/lib/board-brawl/minigames/types";
import { assertTickInterval } from "@/lib/board-brawl/minigames/types";

type Target = { id: string; x: number; y: number; z: number; decoy: boolean; hit: boolean };

type PrecisionAimState = {
  targets: Target[];
  scores: Record<string, number>;
  startedAt: number;
  durationMs: number;
  spawnIndex: number;
};

const HIT_RADIUS = 1.5;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function spawnTarget(rng: () => number, index: number, decoy: boolean): Target {
  return {
    id: `t-${index}`,
    x: (rng() - 0.5) * 8,
    y: rng() * 4 + 1,
    z: (rng() - 0.5) * 8,
    decoy,
    hit: false,
  };
}

export function validatePrecisionHit(
  state: PrecisionAimState,
  targetId: string,
  worldPoint?: { x: number; y: number; z: number }
): { valid: boolean; target: Target | null } {
  const target = state.targets.find((t) => t.id === targetId && !t.hit);
  if (!target) return { valid: false, target: null };

  if (worldPoint) {
    const dx = worldPoint.x - target.x;
    const dy = worldPoint.y - target.y;
    const dz = worldPoint.z - target.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > HIT_RADIUS) return { valid: false, target };
  }

  return { valid: true, target };
}

export const precisionAimLogic: MinigameLogic<PrecisionAimState> = {
  id: "precision_aim",
  name: "Precision Aim",
  formats: ["ffa"],
  durationSeconds: 45,
  tickIntervalMs: assertTickInterval(200),
  cameraPreset: { position: { x: 0, y: 10, z: 10 }, target: { x: 0, y: 2, z: 0 }, zoom: 26 },
  createState(ctx) {
    const rng = mulberry32(ctx.roomSeed + ctx.round);
    const targets: Target[] = [];
    for (let i = 0; i < 10; i++) {
      targets.push(spawnTarget(rng, i, rng() < 0.25));
    }
    const scores: Record<string, number> = {};
    for (const id of ctx.playerIds) scores[id] = 0;
    return {
      targets,
      scores,
      startedAt: Date.now(),
      durationMs: 45_000,
      spawnIndex: 10,
    };
  },
  tick(state, inputs, _dtMs) {
    const next: PrecisionAimState = {
      ...state,
      targets: state.targets.map((t) => ({ ...t })),
      scores: { ...state.scores },
    };

    for (const input of inputs) {
      if (input.type !== "aim") continue;
      const targetId = String(input.payload.targetId ?? "");
      const worldPoint = input.payload.worldPoint as { x: number; y: number; z: number } | undefined;
      const { valid, target } = validatePrecisionHit(next, targetId, worldPoint);
      if (!valid || !target) continue;
      target.hit = true;
      if (target.decoy) {
        next.scores[input.playerId] = (next.scores[input.playerId] ?? 0) - 1;
      } else {
        next.scores[input.playerId] = (next.scores[input.playerId] ?? 0) + 1;
      }
    }

    return next;
  },
  isFinished(state) {
    return Date.now() - state.startedAt >= state.durationMs;
  },
  score(state) {
    const rows = Object.entries(state.scores).map(([playerId, score]) => ({ playerId, score }));
    rows.sort((a, b) => b.score - a.score);
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  },
};

export type { PrecisionAimState };
