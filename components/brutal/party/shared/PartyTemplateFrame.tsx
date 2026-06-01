"use client";

import { useState } from "react";
import { MemeFrame } from "@/components/brutal/party/shared/MemeFrame";
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
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
});

function captionParts(caption?: string): string[] {
  if (!caption) return [];
  if (caption.includes("|")) {
    return caption.split("|").map((s) => s.trim());
  }
  return [caption.trim()];
}

type PartyTemplateFrameProps = {
  caption?: string;
  imageUrl?: string | null;
  textBoxes?: TextBox[];
  big?: boolean;
  mini?: boolean;
  fallbackTemplate?: "drake" | "boyfriend" | "brain" | "pikachu";
  crossOrigin?: "anonymous" | "use-credentials";
};

export function PartyTemplateFrame({
  caption,
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

  const parts = captionParts(caption);

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
        const text = parts[index] ?? (index === 0 ? parts[0] : "");
        if (!text) return null;

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
            <div style={memeTextStyle(fontSize, box.align)}>{text}</div>
          </div>
        );
      })}
    </div>
  );
}
