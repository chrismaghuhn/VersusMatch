import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getTierForXp, type PassTier } from "@/lib/rewards/tiers";
import { claimPendingRewardByIpRpc } from "@/lib/supabase/rpc";

export type ClaimPendingRewardByIpInput = {
  userId: string;
  ipHash: string;
};

export type ClaimPendingRewardByIpResult = {
  granted: boolean;
  success: boolean;
  alreadyGranted: boolean;
  xpAwarded: number;
  tier: PassTier;
  badgesEarned: string[];
  currentStreak?: number;
  totalXp?: number;
  error?: string;
};

export async function claimPendingRewardByIp(
  supabase: SupabaseClient<Database>,
  input: ClaimPendingRewardByIpInput
): Promise<ClaimPendingRewardByIpResult> {
  const { data, error } = await claimPendingRewardByIpRpc(supabase, {
    p_user_id: input.userId,
    p_ip_hash: input.ipHash,
  });

  if (error) {
    const { current: tier } = getTierForXp(0);
    return {
      granted: false,
      success: false,
      alreadyGranted: false,
      xpAwarded: 0,
      tier,
      badgesEarned: [],
      error: error.message,
    };
  }

  const payload = data;
  const granted = payload?.granted ?? false;
  const totalXp = payload?.total_xp ?? 0;
  const { current: tier } = getTierForXp(totalXp);

  return {
    granted,
    success: payload?.success ?? granted,
    alreadyGranted: payload?.already_granted ?? false,
    xpAwarded: payload?.xp_awarded ?? 0,
    tier,
    badgesEarned: payload?.badges_earned ?? [],
    currentStreak: payload?.current_streak,
    totalXp: payload?.total_xp,
    error: payload?.error,
  };
}
