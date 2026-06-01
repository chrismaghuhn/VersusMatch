"use client";

import { Minus, Plus, Type } from "lucide-react";
import type { ToolbarAction } from "@/lib/party/caption-rich/segment-toolbar";
import { PARTY_COPY } from "@/lib/party/copy";

type CaptionToolbarProps = {
  disabled?: boolean;
  mobile?: boolean;
  onAction: (action: ToolbarAction) => void;
};

const btnBase =
  "flex shrink-0 items-center justify-center border border-white/15 bg-[#141414] text-white/80 transition hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:cursor-not-allowed disabled:opacity-40";

export function CaptionToolbar({ disabled = false, mobile = false, onAction }: CaptionToolbarProps) {
  const sizeClass = mobile ? "min-h-11 min-w-11 px-3" : "min-h-9 min-w-9 px-2.5";
  const fontSize = mobile ? 11 : 10;

  return (
    <div
      className={`flex gap-1.5 ${mobile ? "overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}`}
      role="toolbar"
      aria-label="Caption styling"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("slant")}
        className={`${btnBase} ${sizeClass}`}
        style={{ fontWeight: 800, fontSize, letterSpacing: "0.06em" }}
        title={PARTY_COPY.captionToolbarSlant}
      >
        SCH
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("scaleDown")}
        className={`${btnBase} ${sizeClass}`}
        title="Smaller"
        aria-label="Smaller text"
      >
        <Minus className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} />
        <span className="sr-only">A-</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("scaleUp")}
        className={`${btnBase} ${sizeClass}`}
        title="Larger"
        aria-label="Larger text"
      >
        <Plus className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} />
        <span className="sr-only">A+</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("caps")}
        className={`${btnBase} ${sizeClass} gap-1`}
        style={{ fontWeight: 800, fontSize, letterSpacing: "0.06em" }}
        title="Toggle caps"
      >
        <Type className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} />
        CAPS
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("fillWhite")}
        className={`${btnBase} ${sizeClass}`}
        style={{ fontWeight: 800, fontSize, color: "#fff" }}
        title={PARTY_COPY.canvasTextWhite}
      >
        W
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("fillBlack")}
        className={`${btnBase} ${sizeClass}`}
        style={{ fontWeight: 800, fontSize, color: "#000", background: "#fff" }}
        title={PARTY_COPY.canvasTextBlack}
      >
        B
      </button>
    </div>
  );
}
