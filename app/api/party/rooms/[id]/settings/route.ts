import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { validateLobbySettingsPatch } from "@/lib/party/lobby-settings";
import { parsePartyRpc, partyRpcStatus } from "@/lib/party/rpc-response";
import { buildPartySnapshot } from "@/lib/party/snapshot";
import { partyUpdateLobbySettingsRpc } from "@/lib/supabase/party-rpc";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_settings" }, { status: 400 });
  }
  const validated = validateLobbySettingsPatch(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 409 });
  }
  const { data, error } = await partyUpdateLobbySettingsRpc(
    auth.supabase,
    id,
    validated.patch as Record<string, unknown>
  );
  if (error) {
    console.error("party_update_lobby_settings rpc failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }
  const snapshot = await buildPartySnapshot(auth.supabase, id, auth.user.id);
  if (!snapshot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, snapshot });
}
