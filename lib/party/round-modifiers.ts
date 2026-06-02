export type PartyRoundModifier = "three_words" | "forty_chars" | "all_caps";

export const MODIFIER_LABELS: Record<PartyRoundModifier, string> = {
  three_words: "Max 3 words per box",
  forty_chars: "Max 40 characters",
  all_caps: "ALL CAPS ONLY",
};

function wordCount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Each caption box (newline-separated in plain text) is validated independently. */
function validateThreeWordsPerBox(plain: string): boolean {
  const lines = plain.split("\n");
  return lines.every((line) => wordCount(line) <= 3);
}

export function validateRoundModifier(modifier: PartyRoundModifier, plain: string): boolean {
  const value = plain.trim();
  if (!value) return true;

  if (modifier === "three_words") {
    return validateThreeWordsPerBox(value);
  }

  if (modifier === "forty_chars") {
    return value.length <= 40;
  }

  return value === value.toUpperCase();
}
