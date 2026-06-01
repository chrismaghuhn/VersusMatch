import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import { isCaptionValid, normalizeCaption } from "@/lib/party/caption";
import { serializeCaptionPlain } from "@/lib/party/caption-rich/plain-text";
import type { CaptionDocument } from "@/lib/party/caption-rich/types";
import { captionHasProfanity } from "@/lib/party/profanity";
import { parsePartyRpc, partyRpcStatus } from "@/lib/party/rpc-response";
import { buildPartySnapshot } from "@/lib/party/snapshot";
import { partySubmitCaptionRpc } from "@/lib/supabase/party-rpc";

function isCaptionDocument(value: unknown): value is CaptionDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as {
    v?: unknown;
    boxes?: unknown;
    layoutRevision?: unknown;
    rawTexts?: unknown;
  };
  if (doc.v === 2) return Array.isArray(doc.boxes);
  if (doc.v === 3) {
    return (
      Array.isArray(doc.boxes) &&
      typeof doc.layoutRevision === "number" &&
      Array.isArray(doc.rawTexts)
    );
  }
  return false;
}

export async function POST(request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  let caption = "";
  let captionRich: CaptionDocument | undefined;
  try {
    const body = (await request.json()) as {
      roomId?: string;
      caption?: string;
      captionRich?: CaptionDocument;
    };
    roomId = body.roomId ?? "";
    caption = body.caption ?? "";
    if (body.captionRich != null) {
      if (!isCaptionDocument(body.captionRich)) {
        return NextResponse.json({ error: "invalid_caption" }, { status: 409 });
      }
      captionRich = body.captionRich;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const normalized = normalizeCaption(caption);

  if (captionRich) {
    const expectedPlain = serializeCaptionPlain(captionRich);
    if (normalized !== normalizeCaption(expectedPlain)) {
      return NextResponse.json({ error: "invalid_caption" }, { status: 409 });
    }
  }

  if (!isCaptionValid(normalized)) {
    return NextResponse.json({ error: "invalid_caption" }, { status: 409 });
  }

  if (captionHasProfanity(normalized)) {
    return NextResponse.json({ error: "profanity_rejected" }, { status: 409 });
  }

  const { data, error } = await partySubmitCaptionRpc(
    auth.supabase,
    roomId,
    normalized,
    captionRich ?? null
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  const snapshot = await buildPartySnapshot(auth.supabase, roomId, auth.user.id);
  return NextResponse.json({
    submission: { id: result.submission_id },
    snapshot,
  });
}
