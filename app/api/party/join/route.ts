import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { parsePartyRpc, partyRpcStatus, partyRpcTransportError } from "@/lib/party/rpc-response";
import { partyJoinRoomRpc } from "@/lib/supabase/party-rpc";

export async function POST(request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  let code = "";
  try {
    const body = (await request.json()) as { code?: string };
    code = (body.code ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const { data, error } = await partyJoinRoomRpc(auth.supabase, code);
  if (error) {
    console.error("party_join_room rpc failed:", error.message);
    return NextResponse.json(
      { error: partyRpcTransportError("join", error.message) },
      { status: 500 }
    );
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  return NextResponse.json({ roomId: result.room_id });
}
