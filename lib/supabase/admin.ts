import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const serverAuthOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
} as const;

export function createAdminClient(): SupabaseClient<Database> {
  const client = tryCreateAdminClient();
  if (!client) {
    throw new Error("Missing Supabase admin credentials");
  }
  return client;
}

/** Returns null when service role env vars are absent (e.g. some Vercel preview builds). */
export function tryCreateAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(url, serviceRoleKey, serverAuthOptions);
}
