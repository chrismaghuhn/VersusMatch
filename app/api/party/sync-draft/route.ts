import { NextResponse } from "next/server";
import { requirePartyApi } from "@/lib/party/api-auth";
import type { CaptionDocumentV3 } from "@/lib/party/caption-rich/types";
import { parsePartyRpc, partyRpcStatus } from "@/lib/party/rpc-response";
import { partySyncCaptionDraftRpc } from "@/lib/supabase/party-rpc";

function isCaptionDocumentV3(value: unknown): value is CaptionDocumentV3 {
  if (!value || typeof value !== "object") return false;
  const doc = value as {
    v?: unknown;
    boxes?: unknown;
    layoutRevision?: unknown;
    rawTexts?: unknown;
  };
  return (
    doc.v === 3 &&
    Array.isArray(doc.boxes) &&
    typeof doc.layoutRevision === "number" &&
    Array.isArray(doc.rawTexts)
  );
}

export async function POST(request: Request) {
  const auth = await requirePartyApi();
  if ("error" in auth) return auth.error;

  let roomId = "";
  let draft: CaptionDocumentV3 | undefined;
  let layoutRevision = -1;
  try {
    const body = (await request.json()) as {
      roomId?: string;
      draft?: CaptionDocumentV3;
      layoutRevision?: number;
    };
    roomId = body.roomId ?? "";
    if (body.draft != null) {
      if (!isCaptionDocumentV3(body.draft)) {
        return NextResponse.json({ error: "invalid_draft" }, { status: 409 });
      }
      draft = body.draft;
    }
    if (typeof body.layoutRevision === "number" && Number.isInteger(body.layoutRevision)) {
      layoutRevision = body.layoutRevision;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  if (!draft) {
    return NextResponse.json({ error: "draft required" }, { status: 400 });
  }

  if (layoutRevision < 0) {
    return NextResponse.json({ error: "layoutRevision required" }, { status: 400 });
  }

  if (draft.layoutRevision !== layoutRevision) {
    return NextResponse.json({ error: "invalid_draft" }, { status: 409 });
  }

  const { data, error } = await partySyncCaptionDraftRpc(
    auth.supabase,
    roomId,
    draft,
    layoutRevision
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = parsePartyRpc(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: partyRpcStatus(result.error) });
  }

  return NextResponse.json({ ok: true });
}
