import { NextResponse } from "next/server";
import { claimPendingRewardByIp } from "@/lib/rewards/claim-pending";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashVoteIp } from "@/lib/vote-ip-hash";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const ipHash = hashVoteIp(ip);
  if (!ipHash) {
    return NextResponse.json({ granted: false });
  }

  const admin = createAdminClient();
  const result = await claimPendingRewardByIp(admin, {
    userId: user.id,
    ipHash,
  });

  if (!result.granted) {
    return NextResponse.json({ granted: false });
  }

  return NextResponse.json({
    granted: true,
    xpAwarded: result.xpAwarded,
    tier: result.tier.tier,
    badgesEarned: result.badgesEarned,
  });
}
