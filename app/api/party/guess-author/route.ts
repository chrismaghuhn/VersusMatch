import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { parsePartyRpc, partyRpcStatus } from "@/lib/party/rpc-response";
import { buildPartySnapshot } from "@/lib/party/snapshot";
import { partySubmitAuthorGuessRpc } from "@/lib/supabase/party-rpc";

export async function POST(request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  let guessedUserId = "";
  try {
    const body = (await request.json()) as { roomId?: string; guessedUserId?: string };
    roomId = body.roomId ?? "";
    guessedUserId = body.guessedUserId ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!roomId || !guessedUserId) {
    return NextResponse.json({ error: "roomId and guessedUserId required" }, { status: 400 });
  }

  const { data, error } = await partySubmitAuthorGuessRpc(auth.supabase, roomId, guessedUserId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  const snapshot = await buildPartySnapshot(auth.supabase, roomId, auth.user.id);
  return NextResponse.json({ ok: true, snapshot });
}
