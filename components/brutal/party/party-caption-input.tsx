"use client";

import { RefreshCw, Send } from "lucide-react";
import { CaptionField } from "@/components/brutal/party/caption-studio/CaptionField";
import { useCaptionStudio } from "@/components/brutal/party/caption-studio/use-caption-studio";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import type { TextBox } from "@/lib/party/types";
import { PARTY_COPY } from "@/lib/party/copy";
import { captionFieldLabels, defaultCaptionTextBoxes } from "@/lib/party/caption-fields";
import type { CaptionSubmitPayload } from "@/lib/party/caption-submit";

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
  template?: { imageUrl: string; textBoxes: TextBox[] } | null;
  previewTemplate?: "drake" | "boyfriend" | "brain" | "pikachu";
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
  template = null,
  previewTemplate = "drake",
}: PartyCaptionInputProps) {
  const inputDisabled = (locked ? true : disabled) || submitting || unlocking || rerolling;
  const textBoxes = template?.textBoxes ?? defaultCaptionTextBoxes(2);
  const boxCount = Math.max(1, Math.min(4, textBoxes.length));
  const labels = captionFieldLabels(textBoxes, boxCount);
  const { fieldTexts, previewDoc, remaining, submitPayload, updateField, applyToolbar } =
    useCaptionStudio(value, onChange, boxCount);
  const canReroll = Boolean(onReroll) && !locked && rerollsRemaining > 0;
  const lastFieldIndex = boxCount - 1;

  function handleSubmit() {
    if (inputDisabled || !submitPayload) return;
    onSubmit(submitPayload);
  }

  return (
    <div className="flex flex-col gap-4">
      <PartyTemplateFrame
        captionRich={previewDoc}
        imageUrl={template?.imageUrl}
        textBoxes={template?.textBoxes}
        fallbackTemplate={previewTemplate}
      />

      {showRerollDraftHint ? (
        <p
          className="rounded border border-[#00E1FF]/30 bg-[#00E1FF]/10 px-3 py-2 text-[#00E1FF]"
          style={{ fontSize: 12, fontWeight: 700 }}
        >
          {PARTY_COPY.rerollDraftHint}
        </p>
      ) : null}

      <div className="space-y-3">
        {labels.map((label, index) => {
          const inputId = `party-caption-${index}`;
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
