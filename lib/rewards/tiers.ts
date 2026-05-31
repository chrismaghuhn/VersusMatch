import { PASS_TIERS } from "./constants";

export type PassTier = (typeof PASS_TIERS)[number];

export function getTierForXp(xp: number) {
  let current: PassTier = PASS_TIERS[0];
  for (const row of PASS_TIERS) {
    if (xp >= row.xp) current = row;
  }
  const next = PASS_TIERS.find((row) => row.xp > xp) ?? null;
  return { current, next, xp };
}

const shareCardStyle2Tier =
  PASS_TIERS.find((row) => row.reward === "share_card:style2")?.tier ?? 3;

export function hasShareCardStyle2(tier: number): boolean {
  return tier >= shareCardStyle2Tier;
}
