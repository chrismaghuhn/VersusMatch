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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isMember = snapshot.players.some((p) => p.isYou);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ snapshot });
}
