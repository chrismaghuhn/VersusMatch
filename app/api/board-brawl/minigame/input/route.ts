import { NextResponse } from "next/server";
import { requireBoardBrawlApi } from "@/lib/board-brawl/api-auth";
import { bbRpcStatus } from "@/lib/board-brawl/rpc-response";
import { submitMinigameInput } from "@/lib/board-brawl/server/room-service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireBoardBrawlApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  let type = "";
  let payload: Record<string, unknown> = {};
  try {
    const body = (await request.json()) as {
      roomId?: string;
      type?: string;
      payload?: Record<string, unknown>;
    };
    roomId = body.roomId ?? "";
    type = body.type ?? "";
    payload = body.payload ?? {};
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await submitMinigameInput(admin, roomId, auth.user.id, { type, payload });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: bbRpcStatus(result.error) });
  }

  return NextResponse.json({ ok: true });
}
