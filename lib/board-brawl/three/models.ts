import { useGLTF } from "@react-three/drei";
import type { TileType } from "@/lib/board-brawl/types";

/**
 * Board Brawl 3D model registry. All paths point at Draco-compressed glb files
 * produced by scripts/convert-board-brawl-assets.mjs into public/board-brawl/models.
 * Models are flat (no embedded texture) and tinted at runtime via applyNeonTint.
 */
const BASE = "/board-brawl/models";

/** Local Draco decoder (copied from three into public/draco). */
export const DRACO_PATH = "/draco/";

export const MODEL_PATHS = {
  ground01: `${BASE}/ground01.glb`,
  ground01Cracked: `${BASE}/ground01Cracked.glb`,
  ground02: `${BASE}/ground02.glb`,
  arch: `${BASE}/arch.glb`,
  chestA: `${BASE}/chestA.glb`,
  torch: `${BASE}/torch.glb`,
  gem: `${BASE}/gem.glb`,
  crown: `${BASE}/crown.glb`,
  coin: `${BASE}/coin.glb`,
  dice: `${BASE}/dice.glb`,
  diceCup: `${BASE}/diceCup.glb`,
  char01: `${BASE}/char01.glb`,
  char02: `${BASE}/char02.glb`,
  char03: `${BASE}/char03.glb`,
  char04: `${BASE}/char04.glb`,
  pillar01: `${BASE}/pillar01.glb`,
  wallStone01: `${BASE}/wallStone01.glb`,
  shield: `${BASE}/shield.glb`,
  skull: `${BASE}/skull.glb`,
  flagA: `${BASE}/flagA.glb`,
} as const;

export type ModelKey = keyof typeof MODEL_PATHS;

/** Brutalist palette reused for neon tinting. */
export const NEON = {
  lime: "#CCFF00",
  pink: "#FF2D87",
  cyan: "#00E1FF",
  amber: "#FFB800",
  violet: "#9966FF",
  gold: "#FFC233",
  grey: "#6a6a6a",
} as const;

type TileVisual = { model: ModelKey; tint: string; intensity: number };

/** Tile type -> floor model + neon tint. */
export const TILE_VISUALS: Record<TileType, TileVisual> = {
  plus: { model: "ground01", tint: NEON.lime, intensity: 0.5 },
  minus: { model: "ground01Cracked", tint: NEON.pink, intensity: 0.5 },
  shop: { model: "ground02", tint: NEON.lime, intensity: 0.35 },
  item: { model: "ground02", tint: NEON.amber, intensity: 0.45 },
  event: { model: "ground02", tint: NEON.cyan, intensity: 0.45 },
  luck: { model: "ground02", tint: NEON.violet, intensity: 0.5 },
  neutral: { model: "ground02", tint: NEON.grey, intensity: 0.15 },
};

/** Prop placed on top of certain tiles. */
export const TILE_PROPS: Partial<Record<TileType, TileVisual>> = {
  shop: { model: "arch", tint: NEON.lime, intensity: 0.6 },
  item: { model: "chestA", tint: NEON.amber, intensity: 0.55 },
  event: { model: "torch", tint: NEON.cyan, intensity: 0.7 },
  luck: { model: "gem", tint: NEON.violet, intensity: 0.8 },
};

export const PLAYER_MODELS: ModelKey[] = ["char01", "char02", "char03", "char04"];

/** Stable per-player model from the avatar id / order. */
export function playerModelFor(seedIndex: number): ModelKey {
  const m = ((seedIndex % PLAYER_MODELS.length) + PLAYER_MODELS.length) % PLAYER_MODELS.length;
  return PLAYER_MODELS[m]!;
}

export function preloadBoardBrawlModels(): void {
  for (const path of Object.values(MODEL_PATHS)) {
    useGLTF.preload(path, DRACO_PATH);
  }
}
