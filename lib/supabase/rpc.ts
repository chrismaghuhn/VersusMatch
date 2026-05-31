import type { SupabaseClient } from "@supabase/supabase-js";
import type { BattleResult, Database } from "@/lib/database.types";

type CastVoteArgs = Database["public"]["Functions"]["cast_vote"]["Args"];
type CastVoteResult = Database["public"]["Functions"]["cast_vote"]["Returns"];

type RpcSupabase = Pick<SupabaseClient<Database>, "rpc">;

export async function castVoteRpc(supabase: RpcSupabase, args: CastVoteArgs) {
  return (supabase.rpc as SupabaseClient<Database>["rpc"])("cast_vote", args as never);
}

export async function getBattleResultsRpc(
  supabase: RpcSupabase,
  battleId: string
): Promise<{ data: BattleResult[] | null; error: Error | null }> {
  const { data, error } = await (supabase.rpc as SupabaseClient<Database>["rpc"])(
    "get_battle_results",
    { p_battle_id: battleId } as never
  );

  return {
    data: (data as BattleResult[] | null) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export async function countActiveBattlesRpc(supabase: RpcSupabase, creatorId: string) {
  return (supabase.rpc as SupabaseClient<Database>["rpc"])("count_active_battles", {
    p_creator_id: creatorId,
  } as never);
}

export type { CastVoteArgs, CastVoteResult };
