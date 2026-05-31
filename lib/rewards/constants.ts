export const XP_VOTE = 10;
export const XP_FOTD = 25;
export const XP_STREAK_BONUS = 15;
export const XP_UNDERDOG = 5;
export const UNDERDOG_PCT_THRESHOLD = 40;
export const CLOSE_PCT_MIN = 45;
export const CLOSE_PCT_MAX = 55;

export const PASS_TIERS = [
  { tier: 1, xp: 50, reward: "title:rookie" },
  { tier: 2, xp: 200, reward: "badge:bronze" },
  { tier: 3, xp: 450, reward: "share_card:style2" },
  { tier: 4, xp: 800, reward: "title:debater" },
  { tier: 5, xp: 1500, reward: "title:fight_legend+badge:legend" },
] as const;
