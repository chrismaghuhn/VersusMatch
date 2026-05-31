import { NextResponse } from "next/server";
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

  if (season) {
    const { data: progress } = await supabase
      .from("user_progress")
      .select("xp, current_streak")
      .eq("user_id", user.id)
      .eq("season_id", season.id)
      .maybeSingle();

    if (progress) {
      xp = progress.xp;
      streak = progress.current_streak;
    }
  }

  const { data: badges } = await supabase
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", user.id);

  const { current, next } = getTierForXp(xp);

  return NextResponse.json({
    xp,
    tier: current.tier,
    nextTierXp: next?.xp ?? null,
    streak,
    badges: (badges ?? []).map((row) => row.badge_key),
    season: season ? { name: season.name, endsAt: season.ends_at } : null,
  });
}
