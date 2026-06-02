import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { parsePartyRpc, partyRpcStatus, partyRpcTransportError } from "@/lib/party/rpc-response";
import { partyCreateRoomRpc } from "@/lib/supabase/party-rpc";

export async function POST(request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  let roundCount = 5;
  let rerollsPerPlayer = 0;
  let roundModifiersEnabled = false;
  let authorGuessEnabled = true;
  try {
    const body = (await request.json()) as {
      roundCount?: number;
      rerollsPerPlayer?: number;
      roundModifiersEnabled?: boolean;
      authorGuessEnabled?: boolean;
    };
    if (body.roundCount === 3 || body.roundCount === 5 || body.roundCount === 7) {
      roundCount = body.roundCount;
    }
    if (
      typeof body.rerollsPerPlayer === "number" &&
      Number.isInteger(body.rerollsPerPlayer) &&
      body.rerollsPerPlayer >= 0
    ) {
      rerollsPerPlayer = Math.min(body.rerollsPerPlayer, roundCount);
    }
    if (typeof body.roundModifiersEnabled === "boolean") {
      roundModifiersEnabled = body.roundModifiersEnabled;
    }
    if (typeof body.authorGuessEnabled === "boolean") {
      authorGuessEnabled = body.authorGuessEnabled;
    }
  } catch {
    // default round count
  }

  const { data, error } = await partyCreateRoomRpc(
    auth.supabase,
    roundCount,
    rerollsPerPlayer,
    true,
    roundModifiersEnabled,
    authorGuessEnabled
  );
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
