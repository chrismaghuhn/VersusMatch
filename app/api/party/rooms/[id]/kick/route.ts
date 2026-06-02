import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { parsePartyRpc, partyRpcStatus } from "@/lib/party/rpc-response";
import { buildPartySnapshot } from "@/lib/party/snapshot";
import { partyKickPlayerRpc } from "@/lib/supabase/party-rpc";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  let userId = "";
  let blockRejoin = false;
  try {
    const body = (await request.json()) as { userId?: string; blockRejoin?: boolean };
    userId = body.userId ?? "";
    blockRejoin = body.blockRejoin ?? false;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data, error } = await partyKickPlayerRpc(auth.supabase, id, userId, blockRejoin);
  if (error) {
    console.error("party_kick_player rpc failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  const snapshot = await buildPartySnapshot(auth.supabase, id, auth.user.id);
  if (!snapshot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, snapshot });
}
