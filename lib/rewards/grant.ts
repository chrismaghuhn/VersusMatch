import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getTierForXp, type PassTier } from "@/lib/rewards/tiers";
import { grantRewardForVoteRpc } from "@/lib/supabase/rpc";

export type GrantRewardForVoteInput = {
  userId: string;
  voteId: string;
  isFeaturedBattle?: boolean;
};

export type GrantRewardForVoteResult = {
  success: boolean;
  alreadyGranted: boolean;
  xpAwarded: number;
  tier: PassTier;
  badgesEarned: string[];
  currentStreak?: number;
  totalXp?: number;
  error?: string;
};

export async function grantRewardForVote(
  supabase: SupabaseClient<Database>,
  input: GrantRewardForVoteInput
): Promise<GrantRewardForVoteResult> {
  const { data, error } = await grantRewardForVoteRpc(supabase, {
    p_user_id: input.userId,
    p_vote_id: input.voteId,
    p_is_featured: input.isFeaturedBattle ?? false,
  });

  if (error) {
    const { current: tier } = getTierForXp(0);
    return {
      success: false,
      alreadyGranted: false,
      xpAwarded: 0,
      tier,
      badgesEarned: [],
      error: error.message,
    };
  }

  const payload = data;
  const totalXp = payload?.total_xp ?? 0;
  const { current: tier } = getTierForXp(totalXp);

  return {
    success: payload?.success ?? false,
    alreadyGranted: payload?.already_granted ?? false,
    xpAwarded: payload?.xp_awarded ?? 0,
    tier,
    badgesEarned: payload?.badges_earned ?? [],
    currentStreak: payload?.current_streak,
    totalXp: payload?.total_xp,
    error: payload?.error,
  };
}
