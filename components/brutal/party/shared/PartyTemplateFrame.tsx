"use client";

import { useState } from "react";
import { MemeFrame } from "@/components/brutal/party/shared/MemeFrame";
import { fitMemeFontSize } from "@/lib/party/meme-text-fit";
import {
  CaptionSegments,
  memeBoxContainerStyle,
} from "@/lib/party/caption-rich/render-segments";
import {
  applyCardFit,
  computeCardFit,
} from "@/lib/party/caption-rich/layout";
import {
  isCaptionDocumentV3,
  type BoxLayout,
  type CaptionBox,
  type CaptionDocument,
  type CaptionSegment,
} from "@/lib/party/caption-rich/types";
import type { TextBox } from "@/lib/party/types";

export type FrameDensity = "editor" | "card" | "export";

const memeTextStyle = (fontSize: number, align: TextBox["align"]): React.CSSProperties => ({
  fontFamily: "Impact, 'Arial Black', sans-serif",
  color: "#fff",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  lineHeight: 1.05,
  textAlign: align,
  padding: "0 8px",
  textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
  WebkitTextStroke: "1.5px #000",
  fontSize,
  width: "100%",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

function captionParts(caption?: string): string[] {
  if (!caption) return [];
  if (caption.includes("|")) {
    return caption.split("|").map((s) => s.trim());
  }
  return [caption.trim()];
}

function segmentsForTemplateIndex(doc: CaptionDocument, index: number): CaptionSegment[] {
  if (isCaptionDocumentV3(doc)) {
    const box = doc.boxes.find((b) => b.kind === "template" && b.templateIndex === index);
    return box?.segments ?? [];
  }
  return doc.boxes[index] ?? [];
}

function boxPlainText(segments: CaptionSegment[]): string {
  return segments.map((s) => s.text).join("");
}

function maxLinesForBox(box: CaptionBox, textBoxes: TextBox[]): number {
  if (box.kind === "template" && box.templateIndex != null) {
    return textBoxes[box.templateIndex]?.maxLines ?? 3;
  }
  return 3;
}

function resolveV3BoxLayouts(
  boxes: CaptionBox[],
  density: FrameDensity
): Array<{ box: CaptionBox; layout: BoxLayout }> {
  const nonEmpty = boxes.filter((b) => boxPlainText(b.segments).length > 0);
  const cardFit = density === "card" ? computeCardFit(boxes) : null;

  return nonEmpty.map((box) => ({
    box,
    layout: cardFit ? applyCardFit(box.layout, cardFit) : box.layout,
  }));
}

function positionedBoxStyle(
  layout: BoxLayout,
  align: TextBox["align"]
): React.CSSProperties {
  return {
    left: `${layout.x * 100}%`,
    top: `${layout.y * 100}%`,
    width: `${layout.w * 100}%`,
    height: `${layout.h * 100}%`,
    justifyContent:
      align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
  };
}

type PartyTemplateFrameProps = {
  density?: FrameDensity;
  caption?: string;
  captionRich?: CaptionDocument | null;
  imageUrl?: string | null;
  textBoxes?: TextBox[];
  big?: boolean;
  mini?: boolean;
  fallbackTemplate?: "drake" | "boyfriend" | "brain" | "pikachu";
  crossOrigin?: "anonymous" | "use-credentials";
};

export function PartyTemplateFrame({
  density = "editor",
  caption,
  captionRich = null,
  imageUrl,
  textBoxes = [],
  big = false,
  mini = false,
  fallbackTemplate = "drake",
  crossOrigin,
}: PartyTemplateFrameProps) {
  const fontSize = big ? 28 : mini ? 10 : 16;
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageUrl || imageFailed) {
    return (
      <MemeFrame
        caption={caption}
        big={big}
        mini={mini}
        template={fallbackTemplate}
      />
    );
  }

  const legacyParts = captionRich ? null : captionParts(caption);
  const useV3Layout = captionRich != null && isCaptionDocumentV3(captionRich);
  const v3Boxes = useV3Layout ? resolveV3BoxLayouts(captionRich.boxes, density) : [];

  return (
    <div
      className={
        "relative w-full overflow-hidden border-2 border-white " +
        (big ? "aspect-[4/5]" : "aspect-square")
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full object-cover"
        crossOrigin={crossOrigin}
        onError={() => setImageFailed(true)}
      />

      {useV3Layout
        ? v3Boxes.map(({ box, layout }) => {
            const segments = box.segments;
            const text = boxPlainText(segments);
            const align = layout.align ?? "center";
            const fittedSize = fitMemeFontSize(
              text,
              fontSize,
              maxLinesForBox(box, textBoxes)
            );

            return (
              <div
                key={box.id}
                className="absolute z-10 flex items-center justify-center"
                style={positionedBoxStyle(layout, align)}
              >
                <div style={memeBoxContainerStyle(align)}>
                  <CaptionSegments segments={segments} baseFontSize={fittedSize} />
                </div>
              </div>
            );
          })
        : textBoxes.map((box, index) => {
            const segments = captionRich ? segmentsForTemplateIndex(captionRich, index) : [];
            const text = captionRich
              ? boxPlainText(segments)
              : (legacyParts?.[index] ?? (index === 0 ? legacyParts?.[0] : "")) ?? "";
            if (!text) return null;

            const fittedSize = fitMemeFontSize(text, fontSize, box.maxLines);

            return (
              <div
                key={box.id}
                className="absolute z-10 flex items-center justify-center"
                style={positionedBoxStyle(
                  { x: box.x, y: box.y, w: box.w, h: box.h },
                  box.align
                )}
              >
                {captionRich ? (
                  <div style={memeBoxContainerStyle(box.align)}>
                    <CaptionSegments
                      segments={segments ?? []}
                      baseFontSize={fittedSize}
                    />
                  </div>
                ) : (
                  <div style={memeTextStyle(fittedSize, box.align)}>{text}</div>
                )}
              </div>
            );
          })}
    </div>
  );
}
