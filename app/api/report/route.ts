import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    battleId?: string;
    reason?: string;
  };

  const { battleId, reason } = body;

  if (!battleId || !reason?.trim()) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(battleId)) {
    return NextResponse.json({ error: "Ungültige Battle-ID" }, { status: 400 });
  }

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3 || trimmedReason.length > 500) {
    return NextResponse.json({ error: "Grund muss 3–500 Zeichen haben" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("battle_reports").insert({
    battle_id: battleId,
    reason: trimmedReason,
  });

  if (error) {
    captureServerError("report", error, { battleId });
    return NextResponse.json({ error: "Meldung fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
