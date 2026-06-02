import type { AvatarId } from "@/lib/party/avatar-ids";

export const AVATAR_COLORS: Record<AvatarId, string> = {
  gremlin: "#CCFF00",
  skull: "#FFFFFF",
  cyclops: "#00E1FF",
  fox: "#FF2D87",
  demon: "#FF2D87",
  clown: "#FFB800",
  robot: "#AAAAAA",
  ghost: "#CCCCCC",
  crown: "#FFB800",
  alien: "#00E1FF",
  cat: "#FF2D87",
  frog: "#CCFF00",
  shroom: "#FF2D87",
  bandit: "#888888",
  rage: "#FF2D87",
  ghoul: "#666666",
  wizard: "#9966FF",
  pilot: "#00E1FF",
  blob: "#CCFF00",
  pixel: "#CCFF00",
  vampire: "#AA0000",
  shark: "#00E1FF",
  punk: "#FF2D87",
  snake: "#CCFF00",
};

export function avatarColor(avatarId: string): string {
  return AVATAR_COLORS[avatarId as AvatarId] ?? "#CCFF00";
}

export const TILE_COLORS = {
  plus: "#CCFF00",
  minus: "#FF2D87",
  event: "#00E1FF",
  item: "#FFB800",
  luck: "#FFB800",
  neutral: "#3a3a3a",
  shop: "#FFFFFF",
} as const;
