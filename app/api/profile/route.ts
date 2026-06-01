import { NextResponse } from "next/server";
import { encodePartyAvatar } from "@/lib/party/avatar";
import { normalizeHandle, validateHandle } from "@/lib/party/handle";
import { isAvatarId } from "@/lib/party/avatar-ids";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Please log in again.",
  invalid_handle: "Invalid handle (3–20 characters: a-z, 0-9, _).",
  handle_taken: "Handle is already taken — pick another one.",
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ profile: null });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, handle, avatar_url, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: profile ?? null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { handle?: string; avatarId?: string; avatarColor?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const handle = normalizeHandle(body.handle ?? "");
  const validation = validateHandle(handle);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const avatarId = body.avatarId;
  if (!avatarId || !isAvatarId(avatarId)) {
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  }

  const avatarColor = (body.avatarColor ?? "#CCFF00").trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(avatarColor)) {
    return NextResponse.json({ error: "Invalid avatar color" }, { status: 400 });
  }

  const avatar_url = encodePartyAvatar(avatarId, avatarColor);

  const { data, error } = await supabase.rpc("upsert_profile", {
    p_handle: handle,
    p_avatar_url: avatar_url,
  } as never);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    const code = result?.error ?? "save_failed";
    const message = ERROR_MESSAGES[code] ?? code;
    const status = code === "unauthorized" ? 401 : code === "handle_taken" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("user_id, handle, avatar_url, created_at")
    .eq("user_id", user.id)
    .single();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
