export const PARTY_DESIGN = {
  layout: "arena" as const,
  texture: "glow" as const,
  density: "regular" as const,
  accent: "#CCFF00",
  accentPink: "#FF2D87",
  maxWidth: 1320,
  fontScale: 1,
  showTimer: true,
} as const;

export type PartyDensity = "compact" | "regular";
export type PartyTexture = "flat" | "glow" | "grid";

export function partyGlowLayerStyle(accent: string = PARTY_DESIGN.accent): {
  background: string;
} {
  return {
    background: `radial-gradient(circle at 18% 12%, ${accent}14, transparent 42%), radial-gradient(circle at 84% 88%, ${PARTY_DESIGN.accentPink}14, transparent 45%)`,
  };
}

export function partyVoteGridColumns(density: PartyDensity = PARTY_DESIGN.density): string {
  return density === "compact"
    ? "repeat(auto-fill, minmax(180px, 1fr))"
    : "repeat(auto-fill, minmax(230px, 1fr))";
}
