"use client";

import { useState } from "react";
import { MemeFrame } from "@/components/brutal/party/shared/MemeFrame";
import { fitMemeFontSize } from "@/lib/party/meme-text-fit";
import {
  CaptionSegments,
  memeBoxContainerStyle,
} from "@/lib/party/caption-rich/render-segments";
import {
  isCaptionDocumentV3,
  type CaptionDocument,
  type CaptionSegment,
} from "@/lib/party/caption-rich/types";
import type { TextBox } from "@/lib/party/types";

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

type PartyTemplateFrameProps = {
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

      {textBoxes.map((box, index) => {
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
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
              justifyContent:
                box.align === "left"
                  ? "flex-start"
                  : box.align === "right"
                    ? "flex-end"
                    : "center",
            }}
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
