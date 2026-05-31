import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getFeedWithResultsRpc } from "@/lib/supabase/rpc";

export type FeaturedBattleInfo = {
  id: string;
  slug: string;
  title: string;
};

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getFeaturedBattleForDate(
  supabase: SupabaseClient<Database>,
  date: Date
): Promise<FeaturedBattleInfo | null> {
  const featuredDate = toUtcDateString(date);

  const { data: featured, error } = await supabase
    .from("featured_battles")
    .select("battle_id, battles(slug, title, status)")
    .eq("featured_date", featuredDate)
    .maybeSingle();

  if (!error && featured?.battles) {
    const battle = featured.battles as { slug: string; title: string; status: string };
    if (battle.status === "active") {
      return {
        id: featured.battle_id,
        slug: battle.slug,
        title: battle.title,
      };
    }
  }

  const { data: feed, error: feedError } = await getFeedWithResultsRpc(supabase, {
    p_limit: 1,
    p_sort: "votes",
  });

  if (feedError || !feed?.length) return null;

  const top = feed[0];
  return {
    id: top.id,
    slug: top.slug,
    title: top.title,
  };
}
