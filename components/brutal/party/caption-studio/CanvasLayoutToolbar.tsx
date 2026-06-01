"use client";

import { Eye, EyeOff, Redo2, Trash2, Undo2 } from "lucide-react";
import { PARTY_COPY } from "@/lib/party/copy";

type CanvasLayoutToolbarProps = {
  disabled?: boolean;
  mobile?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canAddCustomBox: boolean;
  canDeleteActiveCustomBox: boolean;
  activeBoxFill?: "white" | "black";
  activeBoxPill?: boolean;
  activeBoxAlign?: "left" | "center" | "right";
  styleControlsEnabled: boolean;
  layoutControlsEnabled: boolean;
  peekMode: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddCustomBox: () => void;
  onDeleteActiveCustomBox: () => void;
  onResetLayout: () => void;
  onSetBoxFill: (fill: "white" | "black") => void;
  onTogglePill: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onSnapHorizontal: () => void;
  onSnapVertical: () => void;
  onTogglePeek: () => void;
};

const btnClass =
  "min-h-[44px] border border-white/20 px-3 py-2 text-white/80 transition hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:cursor-not-allowed disabled:opacity-40";

export function CanvasLayoutToolbar({
  disabled = false,
  mobile = false,
  canUndo,
  canRedo,
  canAddCustomBox,
  canDeleteActiveCustomBox,
  activeBoxFill = "white",
  activeBoxPill = false,
  activeBoxAlign = "center",
  styleControlsEnabled,
  layoutControlsEnabled,
  peekMode,
  onUndo,
  onRedo,
  onAddCustomBox,
  onDeleteActiveCustomBox,
  onResetLayout,
  onSetBoxFill,
  onTogglePill,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onSnapHorizontal,
  onSnapVertical,
  onTogglePeek,
}: CanvasLayoutToolbarProps) {
  const labelStyle = { fontWeight: 800, fontSize: 11, letterSpacing: "0.12em" } as const;
  const styleDisabled = disabled || !styleControlsEnabled;
  const layoutDisabled = disabled || !layoutControlsEnabled;
  const wrapClass = mobile ? "mx-1 mb-2 flex flex-wrap gap-2" : "mb-2 flex flex-wrap gap-2";

  const alignActive = (align: "left" | "center" | "right") =>
    activeBoxAlign === align ? "border-[#CCFF00] text-[#CCFF00]" : "";

  return (
    <div className={wrapClass}>
      <button
        type="button"
        disabled={disabled || !canUndo}
        onClick={onUndo}
        className={`flex items-center gap-1.5 ${btnClass}`}
        style={labelStyle}
      >
        <Undo2 className="h-3.5 w-3.5" />
        {PARTY_COPY.canvasUndo}
      </button>
      <button
        type="button"
        disabled={disabled || !canRedo}
        onClick={onRedo}
        className={`flex items-center gap-1.5 ${btnClass}`}
        style={labelStyle}
      >
        <Redo2 className="h-3.5 w-3.5" />
        {PARTY_COPY.canvasRedo}
      </button>
      <button
        type="button"
        disabled={disabled || !canAddCustomBox}
        onClick={onAddCustomBox}
        className={btnClass}
        style={labelStyle}
      >
        {PARTY_COPY.canvasAddText}
      </button>
      {canDeleteActiveCustomBox ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onDeleteActiveCustomBox}
          className={`flex items-center gap-1.5 border border-white/20 px-3 py-2 text-white/80 transition hover:border-[#FF2D87] hover:text-[#FF2D87] disabled:cursor-not-allowed disabled:opacity-40 min-h-[44px]`}
          style={labelStyle}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {PARTY_COPY.canvasDeleteCustom}
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={onResetLayout}
        className="min-h-[44px] border border-white/20 px-3 py-2 text-white/60 transition hover:border-[#00E1FF] hover:text-[#00E1FF] disabled:cursor-not-allowed disabled:opacity-40"
        style={labelStyle}
      >
        {PARTY_COPY.canvasResetLayout}
      </button>
      <button
        type="button"
        disabled={layoutDisabled}
        onClick={onAlignLeft}
        title={PARTY_COPY.canvasAlignLeft}
        className={`${btnClass} ${alignActive("left")}`}
        style={labelStyle}
      >
        L
      </button>
      <button
        type="button"
        disabled={layoutDisabled}
        onClick={onAlignCenter}
        title={PARTY_COPY.canvasAlignCenter}
        className={`${btnClass} ${alignActive("center")}`}
        style={labelStyle}
      >
        C
      </button>
      <button
        type="button"
        disabled={layoutDisabled}
        onClick={onAlignRight}
        title={PARTY_COPY.canvasAlignRight}
        className={`${btnClass} ${alignActive("right")}`}
        style={labelStyle}
      >
        R
      </button>
      <button
        type="button"
        disabled={layoutDisabled}
        onClick={onSnapHorizontal}
        title={PARTY_COPY.canvasSnapH}
        className={btnClass}
        style={labelStyle}
      >
        ↔
      </button>
      <button
        type="button"
        disabled={layoutDisabled}
        onClick={onSnapVertical}
        title={PARTY_COPY.canvasSnapV}
        className={btnClass}
        style={labelStyle}
      >
        ↕
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onTogglePeek}
        title={PARTY_COPY.canvasPeek}
        className={`flex items-center gap-1.5 ${btnClass} ${peekMode ? "border-[#CCFF00] text-[#CCFF00]" : ""}`}
        style={labelStyle}
      >
        {peekMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {PARTY_COPY.canvasPeek}
      </button>
      <button
        type="button"
        disabled={styleDisabled}
        onClick={() => onSetBoxFill("white")}
        title={PARTY_COPY.canvasTextWhite}
        className={`${btnClass} ${activeBoxFill === "white" ? "border-[#CCFF00] text-[#CCFF00]" : ""}`}
        style={{ ...labelStyle, color: "#fff" }}
      >
        W
      </button>
      <button
        type="button"
        disabled={styleDisabled}
        onClick={() => onSetBoxFill("black")}
        title={PARTY_COPY.canvasTextBlack}
        className={`${btnClass} ${activeBoxFill === "black" ? "border-[#CCFF00] text-[#CCFF00]" : ""}`}
        style={{ ...labelStyle, color: "#000", background: activeBoxFill === "black" ? "#fff" : undefined }}
      >
        B
      </button>
      <button
        type="button"
        disabled={styleDisabled}
        onClick={onTogglePill}
        title={PARTY_COPY.canvasPill}
        className={`${btnClass} ${activeBoxPill ? "border-[#CCFF00] text-[#CCFF00]" : ""}`}
        style={labelStyle}
      >
        {PARTY_COPY.canvasPill}
      </button>
    </div>
  );
}
