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

export function isBattleCategory(value: string): value is BattleCategory {
  return BATTLE_CATEGORIES.some((item) => item.value === value);
}

const CATEGORY_SEO: Record<
  BattleCategory,
  { title: string; description: string; intro: string }
> = {
  general: {
    title: "General Battles",
    description: "Vote on trending general A-vs-B battles on MemeFight.",
    intro: "Open debates and everyday matchups — pick a side and vote live.",
  },
  memes: {
    title: "Meme Battles",
    description: "Vote on the funniest and most controversial meme matchups on MemeFight.",
    intro: "Trending meme fights — settle the argument with live votes.",
  },
  design: {
    title: "Design Battles",
    description: "Compare design choices in live A-vs-B polls on MemeFight.",
    intro: "Dark mode vs light mode, tabs vs spaces — design debates with real votes.",
  },
  food: {
    title: "Food Battles",
    description: "Vote on food debates — pizza vs burger, coffee vs tea, and more.",
    intro: "The internet's tastiest A-vs-B food fights, live on MemeFight.",
  },
  gaming: {
    title: "Gaming Battles",
    description: "Vote on gaming debates — PC vs console, Minecraft vs Fortnite, and more.",
    intro: "Trending gaming matchups. Pick your side and see live results.",
  },
  music: {
    title: "Music Battles",
    description: "Vote on music and artist matchups in live A-vs-B battles.",
    intro: "Settle music debates with live votes from the crowd.",
  },
};

export function getCategorySeo(category: BattleCategory) {
  return CATEGORY_SEO[category];
}
