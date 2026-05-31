export type RewardsMe = {
  xp: number;
  tier: number;
  nextTierXp: number | null;
  streak: number;
  longestStreak: number;
  seasonVoteCount: number;
  underdogCount: number;
  fotdClaimedToday: boolean;
  badges: string[];
  season: { name: string; endsAt: string } | null;
};
