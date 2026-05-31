import { NextResponse } from "next/server";
import { getBattleResults } from "@/lib/battles";
import { captureServerError } from "@/lib/observability";
import { isVoteRateLimited } from "@/lib/rate-limit";
import { getPostVoteDrama } from "@/lib/rewards/drama";
import { grantRewardForVote } from "@/lib/rewards/grant";
import { getUserSidePct } from "@/lib/rewards/user-side-pct";
import { createAdminClient } from "@/lib/supabase/admin";
import { castVoteRpc } from "@/lib/supabase/rpc";
import { createClient } from "@/lib/supabase/server";
import { isTurnstileRequired, verifyTurnstileToken } from "@/lib/turnstile";
import { hashVoteIp } from "@/lib/vote-ip-hash";
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
    const isEmbed = isEmbedVoteRequest(request);

    const supabase = createAdminClient();
    const results = await getBattleResults(supabase, battleId);
    const userSidePct = getUserSidePct(results, optionId);

    const { data, error } = await castVoteRpc(supabase, {
      p_battle_id: battleId,
      p_option_id: optionId,
      p_voter_token: voterToken,
      p_ip_hash: ipHash,
      p_user_side_pct: userSidePct,
    });

    if (error) {
      captureServerError("vote", error, { battleId });
      return NextResponse.json({ error: "Vote failed" }, { status: 500 });
    }

    const result = data as {
      success?: boolean;
      error?: string;
      already_voted?: boolean;
      vote_id?: string;
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

    const drama = getPostVoteDrama(userSidePct);
    const response: {
      success: true;
      voteId?: string;
      userSidePct: number;
      drama: ReturnType<typeof getPostVoteDrama>;
      rewards?: {
        xpAwarded: number;
        tier: number;
        badgesEarned: string[];
      };
    } = {
      success: true,
      voteId: result.vote_id,
      userSidePct,
      drama,
    };

    if (!isEmbed && result.vote_id) {
      const authClient = await createClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();

      if (user) {
        const todayUtc = new Date().toISOString().slice(0, 10);
        const { data: featured } = await supabase
          .from("featured_battles")
          .select("battle_id")
          .eq("featured_date", todayUtc)
          .eq("battle_id", battleId)
          .maybeSingle();

        const grantResult = await grantRewardForVote(supabase, {
          userId: user.id,
          voteId: result.vote_id,
          isFeaturedBattle: !!featured,
        });

        if (grantResult.success && !grantResult.alreadyGranted) {
          response.rewards = {
            xpAwarded: grantResult.xpAwarded,
            tier: grantResult.tier.tier,
            badgesEarned: grantResult.badgesEarned,
          };
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    captureServerError("vote-unhandled", error);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
