import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const MIN_VOTES_FOR_STAT = 50;
export const MIN_VOTES_TODAY_FOR_STAT = 10;

export type SiteStats = {
  activeBattles: number;
  totalVotes: number;
  votesLast24h: number;
};

export async function getSiteStats(): Promise<SiteStats> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [activeResult, totalResult, recentResult] = await Promise.all([
    supabase.from("battles").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("votes").select("*", { count: "exact", head: true }),
    supabase.from("votes").select("*", { count: "exact", head: true }).gte("created_at", since),
  ]);

  return {
    activeBattles: activeResult.count ?? 0,
    totalVotes: totalResult.count ?? 0,
    votesLast24h: recentResult.count ?? 0,
  };
}

export const getCachedSiteStats = unstable_cache(getSiteStats, ["site-stats"], {
  revalidate: 60,
});
