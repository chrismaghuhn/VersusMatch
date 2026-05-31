import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Season } from "@/lib/database.types";

export async function getActiveSeason(
  supabase: SupabaseClient<Database>
): Promise<Season | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
