import { NextResponse } from "next/server";
import { requireBoardBrawlApi } from "@/lib/board-brawl/api-auth";
import { bbRpcStatus } from "@/lib/board-brawl/rpc-response";
import { useItem as applyBoardBrawlItem } from "@/lib/board-brawl/server/room-service";
import type { ItemId } from "@/lib/board-brawl/types";
import { createAdminClient } from "@/lib/supabase/admin";

const ITEM_IDS: ItemId[] = [
  "golden_dice",
  "coin_magnet",
  "double_shop",
  "tripwire",
  "coin_snatch",
  "star_tax",
];

export async function POST(request: Request) {
  const auth = await requireBoardBrawlApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  let itemId: ItemId | null = null;
  let targetUserId: string | undefined;
  try {
    const body = (await request.json()) as {
      roomId?: string;
      itemId?: string;
      targetUserId?: string;
    };
    roomId = body.roomId ?? "";
    if (body.itemId && ITEM_IDS.includes(body.itemId as ItemId)) {
      itemId = body.itemId as ItemId;
    }
    targetUserId = body.targetUserId;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!roomId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!itemId && targetUserId) {
    const { data: room } = await admin
      .from("bb_rooms")
      .select("pending_action, turn_nonce")
      .eq("id", roomId)
      .maybeSingle();
    if (room?.pending_action === "item_target" && room.turn_nonce) {
      itemId = room.turn_nonce as ItemId;
    }
  }

  if (!itemId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await applyBoardBrawlItem(admin, roomId, auth.user.id, itemId, targetUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: bbRpcStatus(result.error) });
  }
  return NextResponse.json({ ok: true });
}
