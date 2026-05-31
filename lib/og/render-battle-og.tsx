import { ImageResponse } from "next/og";
import type { BattleResult, BattleWithOptions } from "@/lib/database.types";
import { formatPercent, getPublicImageUrl } from "@/lib/utils";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const GREEN = "#CCFF00";
const PINK = "#FF2D87";

type BattleOgInput = {
  battle: BattleWithOptions;
  results: BattleResult[];
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function renderBattleOgImage({ battle, results }: BattleOgInput) {
  const options = [...battle.battle_options].sort((a, b) => a.position - b.position);
  const optionA = options[0];
  const optionB = options[1];
  const totalVotes = results.reduce((sum, row) => sum + row.vote_count, 0);
  const resultA = results.find((row) => row.option_id === optionA?.id);
  const resultB = results.find((row) => row.option_id === optionB?.id);
  const aPct = formatPercent(resultA?.vote_count ?? 0, totalVotes);
  const bPct = formatPercent(resultB?.vote_count ?? 0, totalVotes);
  const imageA = getPublicImageUrl(optionA?.image_path);
  const imageB = getPublicImageUrl(optionB?.image_path);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: PINK,
              color: "white",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.18em",
              padding: "6px 12px",
            }}
          >
            LIVE BATTLE
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 16, display: "flex" }}>
            {`${totalVotes.toLocaleString("en-US")} votes`}
          </div>
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginBottom: 36,
            maxWidth: 1100,
          }}
        >
          {truncate(battle.title, 80)}
        </div>

        <div style={{ display: "flex", flex: 1, gap: 24 }}>
          <OgSide
            label={optionA?.label ?? "Option A"}
            pct={aPct}
            color={GREEN}
            imageUrl={imageA}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              fontSize: 28,
              fontWeight: 900,
              color: "white",
            }}
          >
            VS
          </div>
          <OgSide
            label={optionB?.label ?? "Option B"}
            pct={bPct}
            color={PINK}
            imageUrl={imageB}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 24,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          <span>MEMEFIGHT</span>
          <span style={{ color: GREEN }}>.lol</span>
        </div>
      </div>
    ),
    OG_SIZE
  );
}

function OgSide({
  label,
  pct,
  color,
  imageUrl,
}: {
  label: string;
  pct: number;
  color: string;
  imageUrl: string | null;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgba(255,255,255,0.15)",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          minHeight: 220,
          background: "#141414",
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={480}
            height={270}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        ) : (
          <div style={{ fontSize: 28, fontWeight: 900, padding: 24, textAlign: "center" }}>
            {truncate(label, 24)}
          </div>
        )}
      </div>
      <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, display: "flex" }}>{truncate(label, 20)}</div>
        <div style={{ fontSize: 40, fontWeight: 900, color, display: "flex" }}>
          {`${pct}%`}
        </div>
      </div>
    </div>
  );
}

export function renderDefaultOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#000",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: 64,
        }}
      >
        <div
          style={{
            background: PINK,
            color: "white",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.18em",
            padding: "6px 12px",
            marginBottom: 32,
          }}
        >
          MEMEFIGHT
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 0.95,
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Pick a side.</span>
          <span style={{ color: GREEN }}>Start a fight.</span>
        </div>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.55)" }}>
          Shareable A-vs-B battles on memefight.lol
        </div>
      </div>
    ),
    OG_SIZE
  );
}
