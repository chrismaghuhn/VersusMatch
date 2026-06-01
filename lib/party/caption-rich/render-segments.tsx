"use client";

import type { CaptionSegment } from "@/lib/party/caption-rich/types";
import type { TextBox } from "@/lib/party/types";

export const MEME_STROKE_STYLES: React.CSSProperties = {
  color: "#fff",
  fontFamily: "Impact, 'Arial Black', sans-serif",
  textShadow:
    "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
  WebkitTextStroke: "1.5px #000",
};

export function memeBoxContainerStyle(align: TextBox["align"]): React.CSSProperties {
  return {
    fontFamily: "Impact, 'Arial Black', sans-serif",
    letterSpacing: "0.02em",
    lineHeight: 1.05,
    textAlign: align,
    padding: "0 8px",
    width: "100%",
    wordBreak: "break-word",
  };
}

function skewMarginInline(slant: number | undefined): string | undefined {
  if (!slant) return undefined;
  return `${Math.abs(slant) * 0.007}em`;
}

export function CaptionSegments({
  segments,
  baseFontSize,
  defaultCaps = true,
}: {
  segments: CaptionSegment[];
  baseFontSize: number;
  defaultCaps?: boolean;
}) {
  return (
    <>
      {segments.map((seg, i) => {
        const slant = seg.style?.slant;
        const caps = seg.style?.caps ?? defaultCaps;
        const scale = seg.style?.scale ?? 1;

        return (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              transform: slant ? `skewX(${slant}deg)` : undefined,
              marginInline: skewMarginInline(slant),
              fontSize: baseFontSize * scale,
              textTransform: caps ? "uppercase" : "none",
              fontStyle: seg.style?.italic ? "italic" : "normal",
              whiteSpace: "pre-wrap",
              ...MEME_STROKE_STYLES,
            }}
          >
            {seg.text}
          </span>
        );
      })}
    </>
  );
}
