export type PartyRoundModifier = "three_words" | "forty_chars" | "all_caps";

export const MODIFIER_LABELS: Record<PartyRoundModifier, string> = {
  three_words: "Max. 3 Wörter",
  forty_chars: "Max. 40 Zeichen",
  all_caps: "NUR GROSSBUCHSTABEN",
};

export function validateRoundModifier(modifier: PartyRoundModifier, plain: string): boolean {
  const value = plain.trim();

  if (modifier === "three_words") {
    if (!value) return true;
    return value.split(/\s+/).length <= 3;
  }

  if (modifier === "forty_chars") {
    return value.length <= 40;
  }

  return value === value.toUpperCase();
}
