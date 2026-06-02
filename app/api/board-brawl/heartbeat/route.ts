import { NextResponse } from "next/server";
import { requireBoardBrawlApi } from "@/lib/board-brawl/api-auth";
import { heartbeat } from "@/lib/board-brawl/server/room-service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireBoardBrawlApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  try {
    const body = (await request.json()) as { roomId?: string };
    roomId = body.roomId ?? "";
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  await heartbeat(admin, roomId, auth.user.id);
  return NextResponse.json({ ok: true });
}
