import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { castVoteRpc } from "@/lib/supabase/rpc";
import { isVoteRateLimited } from "@/lib/rate-limit";
import { isVoteRequestAllowed } from "@/lib/vote-request-guards";

export async function POST(request: Request) {
  if (!isVoteRequestAllowed(request)) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (await isVoteRateLimited(ip)) {
    return NextResponse.json({ error: "Zu viele Votes. Bitte kurz warten." }, { status: 429 });
  }

  const body = (await request.json()) as {
    battleId?: string;
    optionId?: string;
    voterToken?: string;
  };

  const { battleId, optionId, voterToken } = body;

  if (!battleId || !optionId || !voterToken) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(battleId) || !uuidRegex.test(optionId) || !uuidRegex.test(voterToken)) {
    return NextResponse.json({ error: "Ungültige IDs" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await castVoteRpc(supabase, {
    p_battle_id: battleId,
    p_option_id: optionId,
    p_voter_token: voterToken,
  });

  if (error) {
    console.error("[vote]", error);
    return NextResponse.json({ error: "Vote fehlgeschlagen" }, { status: 500 });
  }

  const result = data as {
    success?: boolean;
    error?: string;
    already_voted?: boolean;
  };

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "Vote fehlgeschlagen",
        alreadyVoted: result.already_voted ?? result.error === "already_voted",
      },
      { status: result.already_voted ? 409 : 400 }
    );
  }

  return NextResponse.json({ success: true });
}
