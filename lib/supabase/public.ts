import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Server-side read client (service role). Never use in the browser. */
export function createPublicClient(): SupabaseClient<Database> {
  return createAdminClient();
}
