import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { partyPeekRoomRpc } from "@/lib/supabase/party-rpc";
import { parsePartyPeek, type PartyPeekResult } from "@/lib/party/peek";

export const getCachedPartyPeek = cache(async (code: string): Promise<PartyPeekResult> => {
  const normalized = code.trim().toUpperCase();
  const supabase = await createClient();
  const { data, error } = await partyPeekRoomRpc(supabase, normalized);
  if (error) {
    return { ok: false, error: "peek_failed" };
  }
  return parsePartyPeek(data);
});
