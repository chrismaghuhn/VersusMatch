import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { parsePartyRpc, partyRpcStatus } from "@/lib/party/rpc-response";
import { partyCreateRoomRpc } from "@/lib/supabase/party-rpc";

export async function POST(request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  let roundCount = 5;
  try {
    const body = (await request.json()) as { roundCount?: number };
    if (body.roundCount === 3 || body.roundCount === 5 || body.roundCount === 7) {
      roundCount = body.roundCount;
    }
  } catch {
    // default round count
  }

  const { data, error } = await partyCreateRoomRpc(auth.supabase, roundCount);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  return NextResponse.json({ roomId: result.room_id, code: result.code });
}
