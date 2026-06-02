import { NextResponse } from "next/server";
import { requireBoardBrawlApi } from "@/lib/board-brawl/api-auth";
import { bbRpcStatus } from "@/lib/board-brawl/rpc-response";
import { joinRoom } from "@/lib/board-brawl/server/room-service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireBoardBrawlApi();
  if ("error" in auth) return auth.error;

  let code = "";
  try {
    const body = (await request.json()) as { code?: string };
    code = (body.code ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await joinRoom(admin, auth.user.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: bbRpcStatus(result.error) });
  }

  return NextResponse.json({ roomId: result.roomId });
}
