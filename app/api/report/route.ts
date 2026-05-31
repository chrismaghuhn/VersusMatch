import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/observability";
import { notifyNewReport } from "@/lib/report-notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    battleId?: string;
    reason?: string;
  };

  const { battleId, reason } = body;

  if (!battleId || !reason?.trim()) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(battleId)) {
    return NextResponse.json({ error: "Invalid battle ID" }, { status: 400 });
  }

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3 || trimmedReason.length > 500) {
    return NextResponse.json({ error: "Reason must be 3–500 characters" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("battle_reports").insert({
    battle_id: battleId,
    reason: trimmedReason,
  });

  if (error) {
    captureServerError("report", error, { battleId });
    return NextResponse.json({ error: "Report failed" }, { status: 500 });
  }

  try {
    const admin = createAdminClient();
    const { data: battle } = await admin
      .from("battles")
      .select("title, slug")
      .eq("id", battleId)
      .maybeSingle();

    if (battle?.slug) {
      await notifyNewReport({
        battleId,
        reason: trimmedReason,
        battleTitle: battle.title,
        battleSlug: battle.slug,
      });
    }
  } catch (notifyError) {
    captureServerError("report-notify", notifyError, { battleId });
  }

  return NextResponse.json({ success: true });
}
