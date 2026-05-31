import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BattleResult,
  BattleWithOptions,
  Database,
  FeedBattle,
} from "@/lib/database.types";
import type { BattleCategory } from "@/lib/categories";
import { countActiveBattlesRpc, getBattleResultsRpc } from "@/lib/supabase/rpc";
import type { BattleOption } from "@/lib/database.types";

function normalizeOptions(
  options: BattleOption | BattleOption[] | null | undefined
): BattleOption[] {
  if (!options) return [];
  return Array.isArray(options) ? options : [options];
}

export type FeedSort = "new" | "votes";
export type FeedOptions = {
  limit?: number;
  category?: BattleCategory | "all";
  sort?: FeedSort;
};

export async function getBattleBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<BattleWithOptions | null> {
  const { data, error } = await supabase
    .from("battles")
    .select("*, battle_options(*)")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const options = normalizeOptions(
    (data as { battle_options?: BattleOption | BattleOption[] }).battle_options
  ).sort((a, b) => a.position - b.position);

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    creator_id: data.creator_id,
    status: data.status,
    category: data.category,
    created_at: data.created_at,
    expires_at: data.expires_at,
    battle_options: options,
  };
}

export async function getBattleResults(
  supabase: SupabaseClient<Database>,
  battleId: string
): Promise<BattleResult[]> {
  const { data, error } = await getBattleResultsRpc(supabase, battleId);

  if (error || !data) return [];

  return [...data].sort((a, b) => a.position - b.position);
}

export async function getActiveBattlesFeed(
  supabase: SupabaseClient<Database>,
  options: FeedOptions = {}
): Promise<FeedBattle[]> {
  const { limit = 12, category = "all", sort = "new" } = options;

  let query = supabase
    .from("battles")
    .select("*, battle_options(*)")
    .eq("status", "active");

  if (category !== "all") {
    query = query.eq("category", category);
  }

  query = query.order("created_at", { ascending: false }).limit(sort === "votes" ? 50 : limit);

  const { data: battles, error } = await query;

  if (error || !battles) return [];

  const feed: FeedBattle[] = [];

  for (const row of battles) {
    const battle = row as BattleWithOptions & {
      battle_options?: BattleOption | BattleOption[];
    };
    const results = await getBattleResults(supabase, battle.id);
    const totalVotes = results.reduce((sum, result) => sum + result.vote_count, 0);
    const battleOptions = normalizeOptions(battle.battle_options).sort(
      (a, b) => a.position - b.position
    );

    feed.push({
      ...battle,
      battle_options: battleOptions,
      total_votes: totalVotes,
    });
  }

  if (sort === "votes") {
    feed.sort((a, b) => b.total_votes - a.total_votes);
  }

  return feed.slice(0, limit);
}

export async function getCreatorBattles(
  supabase: SupabaseClient<Database>,
  creatorId: string
): Promise<FeedBattle[]> {
  const { data: battles, error } = await supabase
    .from("battles")
    .select("*, battle_options(*)")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (error || !battles) return [];

  const result: FeedBattle[] = [];

  for (const row of battles) {
    const battle = row as BattleWithOptions & {
      battle_options?: BattleOption | BattleOption[];
    };
    const battleResults = await getBattleResults(supabase, battle.id);
    const totalVotes = battleResults.reduce((sum, item) => sum + item.vote_count, 0);

    result.push({
      ...battle,
      battle_options: normalizeOptions(battle.battle_options).sort(
        (a, b) => a.position - b.position
      ),
      total_votes: totalVotes,
    });
  }

  return result;
}

export async function countActiveBattlesForCreator(
  supabase: SupabaseClient<Database>,
  creatorId: string
): Promise<number> {
  const { data, error } = await countActiveBattlesRpc(supabase, creatorId);

  if (error) return 0;
  return data ?? 0;
}
