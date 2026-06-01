import "server-only";

import { createClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const serverAuthOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
} as const;

/** Server-side read client. Prefers service role; falls back to publishable key for prerender/preview builds. */
export function createPublicClient(): SupabaseClient<Database> {
  const admin = tryCreateAdminClient();
  if (admin) {
    return admin;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient<Database>(url, publishableKey, serverAuthOptions);
}
