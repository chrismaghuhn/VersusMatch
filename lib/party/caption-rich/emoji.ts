export const PARTY_EMOJI_ALLOWLIST = [
  "😂",
  "🔥",
  "💀",
  "👀",
  "🤡",
  "✨",
  "💯",
  "🙏",
  "😭",
  "👍",
  "❤️",
  "🫡",
] as const;

export type PartyEmoji = (typeof PARTY_EMOJI_ALLOWLIST)[number];

const allowSet = new Set<string>(PARTY_EMOJI_ALLOWLIST);

export function isAllowedPartyEmoji(value: string): value is PartyEmoji {
  return allowSet.has(value);
}

export function countGraphemes(value: string): number {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...segmenter.segment(value)].length;
  }
  return [...value].length;
}

export function validateEmojiBoxText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return countGraphemes(trimmed) === 1 && isAllowedPartyEmoji(trimmed);
}
