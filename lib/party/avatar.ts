import { isAvatarId, type AvatarId } from "@/lib/party/avatar-ids";

const PREFIX = "party:";
const DEFAULT: { id: AvatarId; color: string } = { id: "fox", color: "#CCFF00" };

export function encodePartyAvatar(id: AvatarId, color: string): string {
  return `${PREFIX}${id}:${color}`;
}

export function decodePartyAvatar(
  avatarUrl: string | null | undefined
): { id: AvatarId; color: string } {
  if (!avatarUrl?.startsWith(PREFIX)) {
    return DEFAULT;
  }
  const rest = avatarUrl.slice(PREFIX.length);
  const colon = rest.lastIndexOf(":");
  if (colon <= 0) {
    return DEFAULT;
  }
  const id = rest.slice(0, colon) as AvatarId;
  const color = rest.slice(colon + 1);
  if (!isAvatarId(id) || !color) {
    return DEFAULT;
  }
  return { id, color };
}
