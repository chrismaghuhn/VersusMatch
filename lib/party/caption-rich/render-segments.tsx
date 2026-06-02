"use client";

import type { BoxVisualStyle, CaptionSegment } from "@/lib/party/caption-rich/types";
import type { TextBox } from "@/lib/party/types";
import {
  PILL_BOX_STYLE,
  resolveSegmentFill,
  strokeStylesForFill,
  type StrokeRenderMode,
} from "./fill";

export const MEME_STROKE_STYLES = strokeStylesForFill("white");

export function memeBoxContainerStyle(align: TextBox["align"]): React.CSSProperties {
  return {
    fontFamily: "Impact, 'Arial Black', sans-serif",
    letterSpacing: "0.06em",
    lineHeight: 1.1,
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
  boxStyle,
  strokeMode = "default",
}: {
  segments: CaptionSegment[];
  baseFontSize: number;
  defaultCaps?: boolean;
  boxStyle?: BoxVisualStyle;
  strokeMode?: StrokeRenderMode;
}) {
  const inner = (
    <>
      {segments.map((seg, i) => {
        const fill = resolveSegmentFill(seg, boxStyle);
        const slant = seg.style?.slant;
        const caps = seg.style?.caps ?? defaultCaps;
        const scale = seg.style?.scale ?? 1;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              verticalAlign: "baseline",
              transform: slant ? `skewX(${slant}deg)` : undefined,
              marginInline: skewMarginInline(slant),
              fontSize: baseFontSize * scale,
              textTransform: caps ? "uppercase" : "none",
              fontStyle: seg.style?.italic ? "italic" : "normal",
              whiteSpace: "pre-wrap",
              fontFamily: "Impact, 'Arial Black', sans-serif",
              ...strokeStylesForFill(fill, strokeMode),
            }}
          >
            {seg.text}
          </span>
        );
      })}
    </>
  );

  if (boxStyle?.pill) {
    return <span style={PILL_BOX_STYLE}>{inner}</span>;
  }
  return inner;
}
