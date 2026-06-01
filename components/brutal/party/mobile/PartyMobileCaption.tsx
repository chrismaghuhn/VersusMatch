"use client";

import { RefreshCw, Send, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { CaptionField } from "@/components/brutal/party/caption-studio/CaptionField";
import { MemeCanvasOverlay } from "@/components/brutal/party/caption-studio/MemeCanvasOverlay";
import { useMemeCanvasEditor } from "@/components/brutal/party/caption-studio/use-meme-canvas-editor";
import { PartyMobileShell } from "@/components/brutal/party/mobile/PartyMobileShell";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { PARTY_COPY } from "@/lib/party/copy";
import { captionBoxFieldLabel, captionFieldLabels, defaultCaptionTextBoxes } from "@/lib/party/caption-fields";
import type { CaptionSubmitPayload } from "@/lib/party/caption-submit";
import type { CaptionDocumentV3 } from "@/lib/party/caption-rich/types";
import type { TextBox } from "@/lib/party/types";

type PartyMobileCaptionProps = {
  round: number;
  roundCount: number;
  phaseEndsAt: string | null;
  allReady: boolean;
  captionCount: number;
  playerCount: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (payload: CaptionSubmitPayload) => void;
  onUnlock?: () => void;
  onReroll?: () => void;
  locked?: boolean;
  unlockDisabled?: boolean;
  unlocking?: boolean;
  submitting?: boolean;
  rerolling?: boolean;
  rerollsRemaining?: number;
  showRerollDraftHint?: boolean;
  statusMessage?: string | null;
  template?: { imageUrl: string; textBoxes: TextBox[] } | null;
  embedded?: boolean;
  canvasEnabled?: boolean;
  layoutRevision?: number;
  captionDraft?: CaptionDocumentV3 | null;
  roomId?: string;
  onRegisterCanvasReset?: (
    reset: (revision: number, draft: CaptionDocumentV3 | null) => void
  ) => void;
  onRegisterHasCustomBoxes?: (hasCustomBoxes: boolean) => void;
};

export function PartyMobileCaption({
  round,
  roundCount,
  phaseEndsAt,
  allReady,
  captionCount,
  playerCount,
  value,
  onChange,
  onSubmit,
  onUnlock,
  onReroll,
  locked = false,
  unlocking = false,
  unlockDisabled = false,
  submitting = false,
  rerolling = false,
  rerollsRemaining = 0,
  showRerollDraftHint = false,
  statusMessage,
  template = null,
  embedded = false,
  canvasEnabled = false,
  layoutRevision = 0,
  captionDraft = null,
  roomId = "",
  onRegisterCanvasReset,
  onRegisterHasCustomBoxes,
}: PartyMobileCaptionProps) {
  const inputDisabled = locked || submitting || unlocking || rerolling;
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

  const layoutFrozen = canvasEditor?.layoutFrozen ?? false;

  const canReroll = Boolean(onReroll) && !locked && rerollsRemaining > 0;
  const editorBoxes = canvasEditor?.boxes ?? null;
  const fieldCount = editorBoxes?.length ?? boxCount;
  const lastFieldIndex = fieldCount - 1;
  const showOverlay =
    Boolean(canvasEditor) && !inputDisabled && Boolean(canvasEditor?.activeBoxId);

  function handleSubmit() {
    if (inputDisabled || !submitPayload) return;
    onSubmit(submitPayload);
  }

  const canvasToolbar =
    canvasEditor && !inputDisabled ? (
      <div className="mx-1 mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canvasEditor.canAddCustomBox}
          onClick={canvasEditor.addCustomBox}
          className="min-h-[44px] border border-white/20 px-3 py-2 text-white/80 transition hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.12em" }}
        >
          {PARTY_COPY.canvasAddText}
        </button>
        {canvasEditor.canDeleteActiveCustomBox ? (
          <button
            type="button"
            onClick={canvasEditor.deleteActiveCustomBox}
            className="flex min-h-[44px] items-center gap-1.5 border border-white/20 px-3 py-2 text-white/80 transition hover:border-[#FF2D87] hover:text-[#FF2D87]"
            style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.12em" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {PARTY_COPY.canvasDeleteCustom}
          </button>
        ) : null}
        <button
          type="button"
          onClick={canvasEditor.resetLayout}
          className="min-h-[44px] border border-white/20 px-3 py-2 text-white/60 transition hover:border-[#00E1FF] hover:text-[#00E1FF]"
          style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.12em" }}
        >
          {PARTY_COPY.canvasResetLayout}
        </button>
      </div>
    ) : null;

  const footer = !locked ? (
    <div className="flex flex-col gap-2">
      {canReroll ? (
        <button
          type="button"
          disabled={inputDisabled}
          onClick={onReroll}
          className="flex w-full items-center justify-center gap-2 border border-white/20 py-3 text-white/70 transition hover:border-[#00E1FF] hover:text-[#00E1FF] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.15em" }}
        >
          <RefreshCw className={`h-3 w-3 ${rerolling ? "animate-spin" : ""}`} />
          {rerolling ? PARTY_COPY.rerollButtonBusy : PARTY_COPY.rerollButton}
          <span className="text-white/40">· {PARTY_COPY.rerollsRemaining(rerollsRemaining)}</span>
        </button>
      ) : null}
      <button
        type="button"
        disabled={inputDisabled || !submitPayload}
        onClick={handleSubmit}
        className="flex w-full items-center justify-center gap-2 bg-[#FF2D87] py-3.5 text-white transition hover:bg-[#CCFF00] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}
      >
        <Send className="h-3 w-3" />
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
  ) : null;

  return (
    <PartyMobileShell
      round={round}
      roundCount={roundCount}
      phaseLabel={PARTY_COPY.phaseCaption}
      phaseEndsAt={phaseEndsAt}
      allReady={allReady}
      layoutFrozen={layoutFrozen}
      progressLabel={PARTY_COPY.captionProgress(captionCount, playerCount)}
      footer={footer}
      embedded={embedded}
    >
      <div className="flex flex-1 flex-col p-3">
        {canvasToolbar}
        <div className="relative p-1">
          <PartyTemplateFrame
            density={canvasEnabled ? "editor" : undefined}
            captionRich={previewDoc}
            imageUrl={template?.imageUrl}
            textBoxes={template?.textBoxes}
          />
          {showOverlay && canvasEditor ? (
            <MemeCanvasOverlay
              boxes={canvasEditor.boxes}
              activeBoxId={canvasEditor.activeBoxId}
              mobile
              onMoveBox={canvasEditor.updateBoxLayout}
              onResizeBox={canvasEditor.updateBoxLayout}
              onInteractionStart={canvasEditor.onInteractionStart}
              onInteractionEnd={canvasEditor.onInteractionEnd}
            />
          ) : null}
        </div>
        {showRerollDraftHint ? (
          <p
            className="mx-1 mt-2 rounded border border-[#00E1FF]/30 bg-[#00E1FF]/10 px-3 py-2 text-[#00E1FF]"
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            {PARTY_COPY.rerollDraftHint}
          </p>
        ) : null}
        <div className="mt-3 flex-1 space-y-3 px-1">
          {editorBoxes
            ? editorBoxes.map((box, index) => {
                const inputId = `party-caption-mobile-${index}`;
                return (
                  <CaptionField
                    key={box.id}
                    id={inputId}
                    label={captionBoxFieldLabel(box, labelBoxes)}
                    value={fieldTexts[index] ?? ""}
                    disabled={inputDisabled}
                    mobile
                    isLastField={index === lastFieldIndex}
                    onChange={(next) => updateField(index, next)}
                    onSubmit={handleSubmit}
                    onToolbarAction={(action, selection) => applyToolbar(index, action, selection)}
                    onFocus={() => canvasEditor?.setActiveBoxId(box.id)}
                  />
                );
              })
            : labels.map((label, index) => {
                const inputId = `party-caption-mobile-${index}`;
                const boxId = labelBoxes[index]?.id;
                return (
                  <CaptionField
                    key={inputId}
                    id={inputId}
                    label={label}
                    value={fieldTexts[index] ?? ""}
                    disabled={inputDisabled}
                    mobile
                    isLastField={index === lastFieldIndex}
                    onChange={(next) => updateField(index, next)}
                    onSubmit={handleSubmit}
                    onToolbarAction={(action, selection) => applyToolbar(index, action, selection)}
                    onFocus={
                      canvasEditor && boxId ? () => canvasEditor.setActiveBoxId(boxId) : undefined
                    }
                  />
                );
              })}
          <div className="flex justify-between text-white/40" style={{ fontSize: 11 }}>
            <span>{PARTY_COPY.captionExample}</span>
            <span className={remaining < 20 ? "text-[#FF2D87]" : undefined}>{remaining}</span>
          </div>
        </div>
        {statusMessage ? (
          <p
            className="mt-2 text-center"
            style={{ fontSize: 13, fontWeight: 700, color: "#CCFF00" }}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>
    </PartyMobileShell>
  );
}
