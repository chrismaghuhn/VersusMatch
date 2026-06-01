import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { parsePartyRpc, partyRpcStatus } from "@/lib/party/rpc-response";
import { buildPartySnapshot } from "@/lib/party/snapshot";
import { PARTY_REACTION_KEYS, type PartyReactionKey } from "@/lib/party/types";
import { partySendReactionRpc } from "@/lib/supabase/party-rpc";

export async function POST(request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  let reactionKey: PartyReactionKey | null = null;
  try {
    const body = (await request.json()) as { roomId?: string; reactionKey?: string };
    roomId = body.roomId ?? "";
    if (body.reactionKey && PARTY_REACTION_KEYS.includes(body.reactionKey as PartyReactionKey)) {
      reactionKey = body.reactionKey as PartyReactionKey;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!roomId || !reactionKey) {
    return NextResponse.json({ error: "roomId and reactionKey required" }, { status: 400 });
  }

  const { data, error } = await partySendReactionRpc(auth.supabase, roomId, reactionKey);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  const snapshot = await buildPartySnapshot(auth.supabase, roomId, auth.user.id);
  return NextResponse.json({ reaction: { id: result.reaction_id }, snapshot });
}
