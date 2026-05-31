import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchFotdClaimedToday(
  supabase: SupabaseClient<Database>,
  userId: string,
  utcDate: string
): Promise<boolean> {
  const { data: featured, error: featuredError } = await supabase
    .from("featured_battles")
    .select("battle_id")
    .eq("featured_date", utcDate)
    .maybeSingle();

  if (featuredError || !featured?.battle_id) {
    return false;
  }

  const dayStart = `${utcDate}T00:00:00.000Z`;
  const dayEnd = `${utcDate}T23:59:59.999Z`;

  const { data: grants, error: grantsError } = await supabase
    .from("reward_grants")
    .select("vote_id")
    .eq("user_id", userId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  if (grantsError || !grants?.length) {
    return false;
  }

  const voteIds = grants.map((row) => row.vote_id);
  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("id")
    .in("id", voteIds)
    .eq("battle_id", featured.battle_id)
    .limit(1);

  if (votesError) {
    return false;
  }

  return (votes?.length ?? 0) > 0;
}

export function getCachedFotdClaimedToday(
  supabase: SupabaseClient<Database>,
  userId: string,
  date: Date = new Date()
): Promise<boolean> {
  const utcDate = toUtcDateString(date);

  return unstable_cache(
    () => fetchFotdClaimedToday(supabase, userId, utcDate),
    ["fotd-claimed", userId, utcDate],
    { revalidate: 60 }
  )();
}
