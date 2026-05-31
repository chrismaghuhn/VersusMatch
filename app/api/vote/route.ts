import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { castVoteRpc } from "@/lib/supabase/rpc";

const voteWindow = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_VOTES_PER_WINDOW = 20;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = voteWindow.get(key);

  if (!entry || now > entry.resetAt) {
    voteWindow.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_VOTES_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
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

  const supabase = await createClient();
  const { data, error } = await castVoteRpc(supabase, {
    p_battle_id: battleId,
    p_option_id: optionId,
    p_voter_token: voterToken,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
