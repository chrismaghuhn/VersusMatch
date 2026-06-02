import { ImageResponse } from "next/og";
import { parsePartyRecap, parsePartyRecapTemplateId } from "@/lib/party/share-card-data";
import { getPartyTemplateUrl } from "@/lib/party/template-url";
import { renderDefaultOgImage } from "@/lib/og/render-battle-og";
import { createClient } from "@/lib/supabase/server";
import { partyGetRecapRpc } from "@/lib/supabase/party-rpc";

export const runtime = "nodejs";
export const revalidate = 60;
export const alt = "MemeFight Party recap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type RouteProps = {
  params: Promise<{ code: string }>;
};

type RecapOgPayload = {
  roomCode: string;
  roundCount: number;
  winnerHandle: string | null;
  winnerScore: number | null;
  winnerCaption: string | null;
  winnerVotes: number | null;
  winnerImageUrl: string | null;
  gameWinners: Array<{ handle: string; score: number }>;
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

async function loadRecapForOg(code: string): Promise<RecapOgPayload | null> {
  const supabase = await createClient();
  const { data, error } = await partyGetRecapRpc(supabase, code);
  if (error) return null;

  const parsed = parsePartyRecap(data);
  if (!parsed.ok) return null;

  let winnerImageUrl: string | null = null;
  const templateId = parsePartyRecapTemplateId(data);
  if (templateId) {
    const { data: templateRow } = await supabase
      .from("party_templates")
      .select("id, image_path, text_boxes")
      .eq("id", templateId)
      .maybeSingle();
    if (templateRow && typeof templateRow.image_path === "string") {
      winnerImageUrl = getPartyTemplateUrl(templateRow.image_path);
    }
  }

  return {
    roomCode: parsed.data.roomCode,
    roundCount: parsed.data.roundCount,
    winnerHandle: parsed.data.roundWinner?.handle ?? null,
    winnerScore: parsed.data.gameWinners[0]?.score ?? null,
    winnerCaption: parsed.data.roundWinner?.caption ?? null,
    winnerVotes: parsed.data.roundWinner?.voteCount ?? null,
    winnerImageUrl,
    gameWinners: parsed.data.gameWinners.map((winner) => ({
      handle: winner.handle,
      score: winner.score,
    })),
  };
}

export default async function PartyRecapOgImage({ params }: RouteProps) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();
  const recap = await loadRecapForOg(normalizedCode);
  if (!recap) {
    return renderDefaultOgImage();
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          padding: 44,
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              background: "#FF2D87",
              color: "#fff",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: "0.16em",
              padding: "8px 14px",
            }}
          >
            PARTY RECAP
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: 700 }}>
            {`ROOM ${recap.roomCode} · ${recap.roundCount} ROUNDS`}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, gap: 24 }}>
          <div
            style={{
              width: 560,
              border: "2px solid rgba(255,255,255,0.15)",
              background: "#121212",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {recap.winnerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recap.winnerImageUrl}
                alt=""
                width={560}
                height={420}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ display: "flex", textAlign: "center", fontSize: 36, fontWeight: 900, padding: 24 }}>
                MEME WINNER
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>
                ROUND WINNER
              </div>
              <div style={{ display: "flex", fontSize: 56, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95 }}>
                {`@${truncate(recap.winnerHandle ?? "unknown", 16)}`}
              </div>
              {recap.winnerVotes != null ? (
                <div style={{ display: "flex", fontSize: 24, color: "#CCFF00", fontWeight: 900 }}>
                  {`${recap.winnerVotes} votes`}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.16)",
                padding: 16,
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1.12,
              }}
            >
              {`"${truncate(recap.winnerCaption ?? "No caption data available.", 90)}"`}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", fontSize: 16, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>
                GAME WINNER{recap.gameWinners.length > 1 ? "S" : ""}
              </div>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
                {recap.gameWinners.length > 0
                  ? recap.gameWinners
                      .slice(0, 2)
                      .map((winner) => `@${truncate(winner.handle, 14)} (${winner.score})`)
                      .join(" · ")
                  : "@unknown"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>
          <span>MEMEFIGHT</span>
          <span style={{ color: "#CCFF00" }}>.lol</span>
        </div>
      </div>
    ),
    size
  );
}
