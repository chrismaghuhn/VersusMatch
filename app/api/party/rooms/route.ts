import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { parsePartyRpc, partyRpcStatus, partyRpcTransportError } from "@/lib/party/rpc-response";
import { partyCreateRoomRpc } from "@/lib/supabase/party-rpc";

export async function POST(_request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  const { data, error } = await partyCreateRoomRpc(auth.supabase);
  if (error) {
    console.error("party_create_room rpc failed:", error.message);
    return NextResponse.json(
      { error: partyRpcTransportError("create", error.message) },
      { status: 500 }
    );
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  return NextResponse.json({ roomId: result.room_id, code: result.code });
}
