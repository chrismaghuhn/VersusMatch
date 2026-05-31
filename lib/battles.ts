import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BattleResult,
  BattleWithOptions,
  Database,
  FeedBattle,
} from "@/lib/database.types";
import { countActiveBattlesRpc, getBattleResultsRpc } from "@/lib/supabase/rpc";
import type { BattleOption } from "@/lib/database.types";

function normalizeOptions(
  options: BattleOption | BattleOption[] | null | undefined
): BattleOption[] {
  if (!options) return [];
  return Array.isArray(options) ? options : [options];
}

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
  limit = 12
): Promise<FeedBattle[]> {
  const { data: battles, error } = await supabase
    .from("battles")
    .select("*, battle_options(*)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !battles) return [];

  const feed: FeedBattle[] = [];

  for (const row of battles) {
    const battle = row as BattleWithOptions & {
      battle_options?: BattleOption | BattleOption[];
    };
    const results = await getBattleResults(supabase, battle.id);
    const totalVotes = results.reduce((sum, result) => sum + result.vote_count, 0);
    const options = normalizeOptions(battle.battle_options).sort((a, b) => a.position - b.position);

    feed.push({
      ...battle,
      battle_options: options,
      total_votes: totalVotes,
    });
  }

  return feed;
}

export async function countActiveBattlesForCreator(
  supabase: SupabaseClient<Database>,
  creatorId: string
): Promise<number> {
  const { data, error } = await countActiveBattlesRpc(supabase, creatorId);

  if (error) return 0;
  return data ?? 0;
}
