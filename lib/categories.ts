export type BattleCategory =
  | "general"
  | "memes"
  | "design"
  | "food"
  | "gaming"
  | "music";

export const BATTLE_CATEGORIES: { value: BattleCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "memes", label: "Memes" },
  { value: "design", label: "Design" },
  { value: "food", label: "Food" },
  { value: "gaming", label: "Gaming" },
  { value: "music", label: "Music" },
];

export function getCategoryLabel(category: string): string {
  return BATTLE_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}
