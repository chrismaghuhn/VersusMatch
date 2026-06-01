import type React from "react";
import type { BoxVisualStyle, CaptionSegment } from "./types.ts";

export type TextFill = "white" | "black";

export function resolveSegmentFill(
  seg: CaptionSegment,
  boxStyle?: BoxVisualStyle
): TextFill {
  return seg.style?.fill ?? boxStyle?.fill ?? "white";
}

export type StrokeRenderMode = "default" | "export";

export function strokeStylesForFill(
  fill: TextFill,
  mode: StrokeRenderMode = "default"
): React.CSSProperties {
  const color = fill === "black" ? "#000" : "#fff";
  const outline = fill === "black" ? "#fff" : "#000";

  if (mode === "export") {
    // html-to-image often drops WebkitTextStroke; rely on layered text-shadow for PNG capture.
    const shadow = [
      `2px 2px 0 ${outline}`,
      `-2px -2px 0 ${outline}`,
      `2px -2px 0 ${outline}`,
      `-2px 2px 0 ${outline}`,
      `0 2px 0 ${outline}`,
      `0 -2px 0 ${outline}`,
      `2px 0 0 ${outline}`,
      `-2px 0 0 ${outline}`,
      `3px 3px 0 ${outline}`,
      `-3px -3px 0 ${outline}`,
    ].join(", ");
    return { color, textShadow: shadow };
  }

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
