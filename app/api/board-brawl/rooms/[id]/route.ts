import { NextResponse } from "next/server";
import { requireBoardBrawlApi } from "@/lib/board-brawl/api-auth";
import { buildSnapshot, processRoomMaintenance } from "@/lib/board-brawl/server/room-service";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireBoardBrawlApi();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const admin = createAdminClient();
  await processRoomMaintenance(admin, id);
  const snapshot = await buildSnapshot(admin, id, auth.user.id);

  if (!snapshot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
