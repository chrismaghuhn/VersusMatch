import { NextResponse } from "next/server";
import { requireBoardBrawlApi } from "@/lib/board-brawl/api-auth";
import { bbRpcStatus } from "@/lib/board-brawl/rpc-response";
import { setReady } from "@/lib/board-brawl/server/room-service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireBoardBrawlApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  let ready = true;
  let avatarId: string | undefined;
  try {
    const body = (await request.json()) as { roomId?: string; ready?: boolean; avatarId?: string };
    roomId = body.roomId ?? "";
    if (typeof body.ready === "boolean") ready = body.ready;
    avatarId = body.avatarId;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await setReady(admin, roomId, auth.user.id, ready, avatarId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: bbRpcStatus(result.error) });
  }

  return NextResponse.json({ ok: true });
}
