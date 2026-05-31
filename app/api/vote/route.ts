import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { castVoteRpc } from "@/lib/supabase/rpc";
import { isVoteRateLimited } from "@/lib/rate-limit";
import { isTurnstileRequired, verifyTurnstileToken } from "@/lib/turnstile";
import { hashVoteIp } from "@/lib/vote-ip-hash";
import { captureServerError } from "@/lib/observability";
import { isEmbedVoteRequest, isVoteRequestAllowed } from "@/lib/vote-request-guards";

export async function POST(request: Request) {
  try {
    if (!isVoteRequestAllowed(request)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 403 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    let body: {
      battleId?: string;
      optionId?: string;
      voterToken?: string;
      turnstileToken?: string;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { battleId, optionId, voterToken, turnstileToken } = body;

    if (!battleId || !optionId || !voterToken) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (await isVoteRateLimited(ip, battleId)) {
      return NextResponse.json({ error: "Too many votes. Please wait a moment." }, { status: 429 });
    }

    if (isTurnstileRequired() && !isEmbedVoteRequest(request)) {
      const valid = await verifyTurnstileToken(turnstileToken ?? "", ip);
      if (!valid) {
        return NextResponse.json({ error: "Invalid captcha" }, { status: 403 });
      }
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(battleId) || !uuidRegex.test(optionId) || !uuidRegex.test(voterToken)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const ipHash = hashVoteIp(ip);

    const supabase = createAdminClient();
    const { data, error } = await castVoteRpc(supabase, {
      p_battle_id: battleId,
      p_option_id: optionId,
      p_voter_token: voterToken,
      p_ip_hash: ipHash,
    });

    if (error) {
      captureServerError("vote", error, { battleId });
      return NextResponse.json({ error: "Vote failed" }, { status: 500 });
    }

    const result = data as {
      success?: boolean;
      error?: string;
      already_voted?: boolean;
    };

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error ?? "Vote failed",
          alreadyVoted: result.already_voted ?? result.error === "already_voted",
        },
        { status: result.already_voted ? 409 : 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureServerError("vote-unhandled", error);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
