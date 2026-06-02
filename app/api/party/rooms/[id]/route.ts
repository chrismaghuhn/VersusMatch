import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { buildPartySnapshot } from "@/lib/party/snapshot";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const snapshot = await buildPartySnapshot(auth.supabase, id, auth.user.id);

  if (!snapshot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isMember = snapshot.players.some((p) => p.isYou);
  if (!isMember) {
    const { data: joinedBefore } = await auth.supabase.rpc("party_user_was_room_member", {
      p_room_id: id,
      p_user_id: auth.user.id,
    });
    const wasMember = Boolean(joinedBefore);
    if (wasMember) {
      return NextResponse.json({ error: "kicked" }, { status: 403 });
    }
    return NextResponse.json({ error: "not_in_room" }, { status: 403 });
  }

  return NextResponse.json({ snapshot });
}
