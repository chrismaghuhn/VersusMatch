import { NextResponse } from "next/server";
import { getCachedFotdClaimedToday } from "@/lib/rewards/fotd-claimed";
import { getActiveSeason } from "@/lib/rewards/season";
import { getTierForXp } from "@/lib/rewards/tiers";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = await getActiveSeason(supabase);

  let xp = 0;
  let streak = 0;
  let longestStreak = 0;
  let seasonVoteCount = 0;
  let underdogCount = 0;

  if (season) {
    const { data: progress } = await supabase
      .from("user_progress")
      .select("xp, current_streak, longest_streak, season_vote_count, underdog_count")
      .eq("user_id", user.id)
      .eq("season_id", season.id)
      .maybeSingle();

    if (progress) {
      xp = progress.xp;
      streak = progress.current_streak;
      longestStreak = progress.longest_streak;
      seasonVoteCount = progress.season_vote_count;
      underdogCount = progress.underdog_count;
    }
  }

  const { data: badges } = await supabase
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", user.id);

  const { current, next } = getTierForXp(xp);
  const fotdClaimedToday = await getCachedFotdClaimedToday(supabase, user.id);

  return NextResponse.json({
    xp,
    tier: current.tier,
    nextTierXp: next?.xp ?? null,
    streak,
    longestStreak,
    seasonVoteCount,
    underdogCount,
    fotdClaimedToday,
    badges: (badges ?? []).map((row) => row.badge_key),
    season: season ? { name: season.name, endsAt: season.ends_at } : null,
  });
}
