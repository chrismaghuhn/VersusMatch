"use client";

import { RefreshCw, Send } from "lucide-react";
import { useEffect } from "react";
import { CanvasLayoutToolbar } from "@/components/brutal/party/caption-studio/CanvasLayoutToolbar";
import { CaptionField } from "@/components/brutal/party/caption-studio/CaptionField";
import { MemeCanvasOverlay } from "@/components/brutal/party/caption-studio/MemeCanvasOverlay";
import { useMemeCanvasEditor } from "@/components/brutal/party/caption-studio/use-meme-canvas-editor";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import type { TextBox } from "@/lib/party/types";
import { PARTY_COPY } from "@/lib/party/copy";
import { captionBoxFieldLabel, captionFieldLabels, defaultCaptionTextBoxes } from "@/lib/party/caption-fields";
import type { CaptionSubmitPayload } from "@/lib/party/caption-submit";
import type { CaptionDocumentV3 } from "@/lib/party/caption-rich/types";

type PartyCaptionInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (payload: CaptionSubmitPayload) => void;
  onUnlock?: () => void;
  onReroll?: () => void;
  locked?: boolean;
  unlockDisabled?: boolean;
  unlocking?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  rerolling?: boolean;
  rerollsRemaining?: number;
  showRerollDraftHint?: boolean;
  rerollError?: string | null;
  template?: { imageUrl: string; textBoxes: TextBox[] } | null;
  previewTemplate?: "drake" | "boyfriend" | "brain" | "pikachu";
  canvasEnabled?: boolean;
  layoutRevision?: number;
  captionDraft?: CaptionDocumentV3 | null;
  roomId?: string;
  mobile?: boolean;
  onRegisterCanvasReset?: (
    reset: (revision: number, draft: CaptionDocumentV3 | null) => void
  ) => void;
  onRegisterHasCustomBoxes?: (hasCustomBoxes: boolean) => void;
  onLayoutFrozenChange?: (frozen: boolean) => void;
};

export function PartyCaptionInput({
  value,
  onChange,
  onSubmit,
  onUnlock,
  onReroll,
  locked = false,
  unlockDisabled = false,
  unlocking = false,
  disabled = false,
  submitting = false,
  rerolling = false,
  rerollsRemaining = 0,
  showRerollDraftHint = false,
  rerollError = null,
  template = null,
  previewTemplate = "drake",
  canvasEnabled = false,
  layoutRevision = 0,
  captionDraft = null,
  roomId = "",
  mobile = false,
  onRegisterCanvasReset,
  onRegisterHasCustomBoxes,
  onLayoutFrozenChange,
}: PartyCaptionInputProps) {
  const inputDisabled = (locked ? true : disabled) || submitting || unlocking || rerolling;
  const labelBoxes = template?.textBoxes ?? defaultCaptionTextBoxes(2);
  const canvasTextBoxes = template?.textBoxes ?? [];
  const boxCount = Math.max(1, Math.min(4, labelBoxes.length));
  const labels = captionFieldLabels(labelBoxes, boxCount);

  const editor = useMemeCanvasEditor({
    value,
    onChange,
    textBoxes: canvasTextBoxes,
    canvasEnabled,
    layoutRevision,
    captionDraft,
    roomId,
  });

  const { fieldTexts, previewDoc, remaining, submitPayload, updateField, applyToolbar } = editor;

  const canvasEditor =
    canvasEnabled && "activeBoxId" in editor
      ? editor
      : null;

  useEffect(() => {
    if (!canvasEditor?.resetCanvasFromRevision || !onRegisterCanvasReset) return;
    onRegisterCanvasReset(canvasEditor.resetCanvasFromRevision);
  }, [canvasEditor, onRegisterCanvasReset]);

  useEffect(() => {
    if (!onRegisterHasCustomBoxes) return;
    onRegisterHasCustomBoxes(canvasEditor?.hasCustomBoxes ?? false);
  }, [canvasEditor?.hasCustomBoxes, onRegisterHasCustomBoxes]);

  useEffect(() => {
    onLayoutFrozenChange?.(canvasEditor?.layoutFrozen ?? false);
  }, [canvasEditor?.layoutFrozen, onLayoutFrozenChange]);

  const canReroll = Boolean(onReroll) && !locked && rerollsRemaining > 0;
  const editorBoxes = canvasEditor?.boxes ?? null;
  const fieldCount = editorBoxes?.length ?? boxCount;
  const lastFieldIndex = fieldCount - 1;
  const showCanvasOverlay = Boolean(canvasEditor) && !inputDisabled;
  useEffect(() => {
    if (!canvasEditor || mobile || inputDisabled) return;
    const { undo, redo, canUndo, canRedo } = canvasEditor;

    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        if (!canRedo) return;
        event.preventDefault();
        redo();
        return;
      }
      if (key === "z" && !event.shiftKey) {
        if (!canUndo) return;
        event.preventDefault();
        undo();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canvasEditor, mobile, inputDisabled]);

  function handleSubmit() {
    if (inputDisabled || !submitPayload) return;
    onSubmit(submitPayload);
  }

  const activeBox =
    canvasEditor?.activeBoxId != null
      ? canvasEditor.boxes.find((b) => b.id === canvasEditor.activeBoxId)
      : undefined;

  const canvasToolbar = canvasEditor ? (
    <CanvasLayoutToolbar
      disabled={inputDisabled}
      mobile={mobile}
      canUndo={canvasEditor.canUndo}
      canRedo={canvasEditor.canRedo}
      canAddCustomBox={canvasEditor.canAddCustomBox}
      canDeleteActiveCustomBox={canvasEditor.canDeleteActiveCustomBox}
      activeBoxFill={activeBox?.style?.fill ?? "white"}
      activeBoxPill={activeBox?.style?.pill ?? false}
      activeBoxAlign={activeBox?.layout.align ?? "center"}
      styleControlsEnabled={Boolean(canvasEditor.activeBoxId)}
      layoutControlsEnabled={Boolean(canvasEditor.activeBoxId)}
      peekMode={canvasEditor.peekMode}
      onUndo={canvasEditor.undo}
      onRedo={canvasEditor.redo}
      onAddCustomBox={canvasEditor.addCustomBox}
      onDeleteActiveCustomBox={canvasEditor.deleteActiveCustomBox}
      onResetLayout={canvasEditor.resetLayout}
      onSetBoxFill={(fill) => {
        const id = canvasEditor.activeBoxId;
        if (id) canvasEditor.updateBoxStyle(id, { fill });
      }}
      onTogglePill={() => {
        const id = canvasEditor.activeBoxId;
        if (id) canvasEditor.toggleBoxPill(id);
      }}
      onAlignLeft={() => canvasEditor.setActiveBoxAlign("left")}
      onAlignCenter={() => canvasEditor.setActiveBoxAlign("center")}
      onAlignRight={() => canvasEditor.setActiveBoxAlign("right")}
      onSnapHorizontal={canvasEditor.snapActiveBoxHorizontal}
      onSnapVertical={canvasEditor.snapActiveBoxVertical}
      onTogglePeek={canvasEditor.togglePeekMode}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      {canvasToolbar}
      <div className="relative">
        <PartyTemplateFrame
          density={canvasEnabled ? "editor" : undefined}
          captionRich={previewDoc}
          imageUrl={template?.imageUrl}
          textBoxes={template?.textBoxes}
          fallbackTemplate={previewTemplate}
        />
        {showCanvasOverlay && canvasEditor ? (
          <MemeCanvasOverlay
            boxes={canvasEditor.boxes}
            activeBoxId={canvasEditor.activeBoxId}
            peekMode={canvasEditor.peekMode}
            mobile={mobile}
            onSelectBox={canvasEditor.selectBox}
            onMoveBox={canvasEditor.updateBoxLayout}
            onResizeBox={canvasEditor.updateBoxLayout}
            onInteractionStart={canvasEditor.onInteractionStart}
            onInteractionEnd={canvasEditor.onInteractionEnd}
          />
        ) : null}
      </div>

      {showRerollDraftHint ? (
        <p
          className="rounded border border-[#00E1FF]/30 bg-[#00E1FF]/10 px-3 py-2 text-[#00E1FF]"
          style={{ fontSize: 12, fontWeight: 700 }}
        >
          {PARTY_COPY.rerollDraftHint}
        </p>
      ) : null}

      <div className="space-y-3">
        {editorBoxes
          ? editorBoxes.map((box, index) => {
              const inputId = `party-caption-${index}`;
              return (
                <CaptionField
                  key={box.id}
                  id={inputId}
                  label={captionBoxFieldLabel(box, labelBoxes)}
                  value={fieldTexts[index] ?? ""}
                  disabled={inputDisabled}
                  isLastField={index === lastFieldIndex}
                  onChange={(next) => updateField(index, next)}
                  onSubmit={handleSubmit}
                  onToolbarAction={(action, selection) => applyToolbar(index, action, selection)}
                  onFocus={() => {
                    canvasEditor?.onCaptionFieldFocus();
                    canvasEditor?.selectBox(box.id);
                  }}
                  onBlur={() => canvasEditor?.commitTextHistory()}
                />
              );
            })
          : labels.map((label, index) => {
              const inputId = `party-caption-${index}`;
              const boxId = labelBoxes[index]?.id;
              return (
                <CaptionField
                  key={inputId}
                  id={inputId}
                  label={label}
                  value={fieldTexts[index] ?? ""}
                  disabled={inputDisabled}
                  isLastField={index === lastFieldIndex}
                  onChange={(next) => updateField(index, next)}
                  onSubmit={handleSubmit}
                  onToolbarAction={(action, selection) => applyToolbar(index, action, selection)}
                  onFocus={
                    canvasEditor && boxId
                      ? () => {
                          canvasEditor.onCaptionFieldFocus();
                          canvasEditor.selectBox(boxId);
                        }
                      : undefined
                  }
                  onBlur={canvasEditor ? () => canvasEditor.commitTextHistory() : undefined}
                />
              );
            })}
        <div className="flex justify-between text-white/40" style={{ fontSize: 11 }}>
          <span>{PARTY_COPY.captionExample}</span>
          <span className={remaining < 20 ? "text-[#FF2D87]" : undefined}>{remaining}</span>
        </div>
      </div>

      {!locked ? (
        <div className="flex flex-col gap-2">
          {canReroll ? (
            <button
              type="button"
              disabled={inputDisabled}
              onClick={onReroll}
              className="flex w-full items-center justify-center gap-2 border border-white/20 py-3 text-white/70 transition hover:border-[#00E1FF] hover:text-[#00E1FF] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.18em" }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${rerolling ? "animate-spin" : ""}`} />
              {rerolling ? PARTY_COPY.rerollButtonBusy : PARTY_COPY.rerollButton}
              <span className="text-white/40">· {PARTY_COPY.rerollsRemaining(rerollsRemaining)}</span>
            </button>
          ) : null}
          {rerollError ? (
            <p
              className="text-center text-[#FF2D87]"
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}
              role="alert"
            >
              {rerollError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={inputDisabled || !submitPayload}
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-2 bg-[#FF2D87] py-3.5 text-white transition hover:bg-[#CCFF00] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? PARTY_COPY.lockInSending : PARTY_COPY.lockIn}
          </button>
        </div>
      ) : onUnlock ? (
        <button
          type="button"
          disabled={unlockDisabled || unlocking}
          onClick={onUnlock}
          className="flex w-full items-center justify-center border border-white/20 py-3.5 text-white/70 transition hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.18em" }}
        >
          {unlocking ? PARTY_COPY.unlockCaptionBusy : PARTY_COPY.unlockCaption}
        </button>
      ) : null}
    </div>
  );
}
