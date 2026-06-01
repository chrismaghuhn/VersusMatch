import type React from "react";
import type { BoxVisualStyle, CaptionSegment } from "./types.ts";

export type TextFill = "white" | "black";

export function resolveSegmentFill(
  seg: CaptionSegment,
  boxStyle?: BoxVisualStyle
): TextFill {
  return seg.style?.fill ?? boxStyle?.fill ?? "white";
}

export function strokeStylesForFill(fill: TextFill): React.CSSProperties {
  const color = fill === "black" ? "#000" : "#fff";
  const outline = fill === "black" ? "#fff" : "#000";
  return {
    color,
    textShadow: `2px 2px 0 ${outline}, -2px -2px 0 ${outline}, 2px -2px 0 ${outline}, -2px 2px 0 ${outline}`,
    WebkitTextStroke: `1.5px ${outline}`,
  };
}

export const PILL_BOX_STYLE: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.55)",
  borderRadius: 4,
  padding: "4px 8px",
  display: "inline-block",
};
