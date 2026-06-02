import { NextResponse } from "next/server";
import { requireBoardBrawlApi } from "@/lib/board-brawl/api-auth";
import { bbRpcStatus } from "@/lib/board-brawl/rpc-response";
import { createRoom } from "@/lib/board-brawl/server/room-service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireBoardBrawlApi();
  if ("error" in auth) return auth.error;

  let roundCount: 3 | 5 | 7 = 5;
  try {
    const body = (await request.json()) as { roundCount?: number };
    if (body.roundCount === 3 || body.roundCount === 5 || body.roundCount === 7) {
      roundCount = body.roundCount;
    }
  } catch {
    // default
  }

  const admin = createAdminClient();
  const result = await createRoom(admin, auth.user.id, roundCount);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: bbRpcStatus(result.error) });
  }

  return NextResponse.json({ roomId: result.roomId, code: result.code });
}
