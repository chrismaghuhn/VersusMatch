import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type AdminClient = SupabaseClient<Database>;

export const BB_STALE_MS = 60_000;
export const BB_MINIGAME_RESULTS_MS = 5_000;

export async function migrateHostIfStale(admin: AdminClient, roomId: string): Promise<void> {
  await admin.rpc("bb_migrate_host_if_stale", { p_room_id: roomId });
}

export async function markDisconnectedPlayers(admin: AdminClient, roomId: string): Promise<void> {
  const cutoff = new Date(Date.now() - BB_STALE_MS).toISOString();
  await admin
    .from("bb_players")
    .update({ disconnected_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .is("disconnected_at", null)
    .lt("last_seen_at", cutoff);
}

export async function isPlayerDisconnected(
  admin: AdminClient,
  roomId: string,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from("bb_players")
    .select("disconnected_at")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.disconnected_at != null;
}
