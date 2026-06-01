"use client";

import { RefreshCw, Send } from "lucide-react";
import { PartyMobileShell } from "@/components/brutal/party/mobile/PartyMobileShell";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { PARTY_COPY } from "@/lib/party/copy";
import {
  buildCaptionFromFieldTexts,
  captionFieldLabels,
  captionFieldTextsTotalLength,
  clampCaptionFieldTexts,
  defaultCaptionTextBoxes,
  splitCaptionToFieldTexts,
} from "@/lib/party/caption-fields";
import { CAPTION_MAX_LENGTH } from "@/lib/party/caption";
import { structuralDocumentFromFieldTexts } from "@/lib/party/caption-rich/document";
import type { CaptionSubmitPayload } from "@/lib/party/caption-submit";
import { prepareCaptionSubmit } from "@/lib/party/caption-submit";
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
}: PartyMobileCaptionProps) {
  const inputDisabled = locked || submitting || unlocking || rerolling;
  const textBoxes = template?.textBoxes ?? defaultCaptionTextBoxes(2);
  const boxCount = Math.max(1, Math.min(4, textBoxes.length));
  const fieldTexts = splitCaptionToFieldTexts(value, boxCount);
  const labels = captionFieldLabels(textBoxes, boxCount);
  const previewDoc = structuralDocumentFromFieldTexts(fieldTexts);
  const submitPayload = prepareCaptionSubmit(fieldTexts, boxCount);
  const remaining = CAPTION_MAX_LENGTH - captionFieldTextsTotalLength(fieldTexts);
  const canReroll = Boolean(onReroll) && !locked && rerollsRemaining > 0;
  const lastFieldIndex = boxCount - 1;

  function updateField(index: number, nextValue: string) {
    const next = [...fieldTexts];
    next[index] = nextValue;
    const clamped = clampCaptionFieldTexts(next);
    onChange(buildCaptionFromFieldTexts(clamped));
  }

  function handleSubmit() {
    if (inputDisabled || !submitPayload) return;
    onSubmit(submitPayload);
  }

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
      progressLabel={PARTY_COPY.captionProgress(captionCount, playerCount)}
      footer={footer}
      embedded={embedded}
    >
      <div className="flex flex-1 flex-col p-3">
        <div className="p-1">
          <PartyTemplateFrame
            captionRich={previewDoc}
            imageUrl={template?.imageUrl}
            textBoxes={template?.textBoxes}
          />
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
          {labels.map((label, index) => {
            const fieldValue = fieldTexts[index] ?? "";
            const inputId = `party-caption-mobile-${index}`;
            return (
              <div key={inputId}>
                <label
                  htmlFor={inputId}
                  className="text-white/40"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em" }}
                >
                  {label.toUpperCase()}
                </label>
                <textarea
                  id={inputId}
                  rows={2}
                  value={fieldValue}
                  disabled={inputDisabled}
                  placeholder={label}
                  onChange={(e) => updateField(index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && index === lastFieldIndex) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="mt-2 w-full resize-none border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-white outline-none focus:border-[#CCFF00] disabled:opacity-50"
                  style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}
                />
              </div>
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
