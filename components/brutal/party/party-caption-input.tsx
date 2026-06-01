"use client";

import { RefreshCw, Send } from "lucide-react";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import type { TextBox } from "@/lib/party/types";
import { PARTY_COPY } from "@/lib/party/copy";
import {
  buildCaptionFromFields,
  buildCaptionFromFieldsForSubmit,
  captionFieldsTotalLength,
  clampCaptionFields,
  splitCaptionToFields,
} from "@/lib/party/caption-fields";
import { CAPTION_MAX_LENGTH, normalizeCaption } from "@/lib/party/caption";

type PartyCaptionInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
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
  const [topField, bottomField] = splitCaptionToFields(value);
  const previewCaption = buildCaptionFromFields(topField, bottomField);
  const submitCaption = normalizeCaption(
    buildCaptionFromFieldsForSubmit(topField, bottomField)
  );
  const remaining = CAPTION_MAX_LENGTH - captionFieldsTotalLength(topField, bottomField);
  const canReroll = Boolean(onReroll) && !locked && rerollsRemaining > 0;

  function updateFields(nextTop: string, nextBottom: string) {
    const [t, b] = clampCaptionFields(nextTop, nextBottom);
    onChange(buildCaptionFromFields(t, b));
  }

  function handleSubmit() {
    if (inputDisabled || !submitCaption) return;
    onSubmit();
  }

  return (
    <div className="flex flex-col gap-4">
      <PartyTemplateFrame
        caption={previewCaption || undefined}
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
        {([PARTY_COPY.captionFieldTop, PARTY_COPY.captionFieldBottom] as const).map(
          (label, index) => {
            const fieldValue = index === 0 ? topField : bottomField;
            const inputId = index === 0 ? "party-caption-top" : "party-caption-bottom";
            return (
              <div key={label}>
                <label
                  htmlFor={inputId}
                  className="text-white/40"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
                >
                  {label.toUpperCase()}
                </label>
                <textarea
                  id={inputId}
                  rows={2}
                  value={fieldValue}
                  disabled={inputDisabled}
                  placeholder={label}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (index === 0) {
                      updateFields(next, bottomField);
                    } else {
                      updateFields(topField, next);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && index === 1) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="mt-2 w-full resize-none border-2 border-white/10 bg-[#0a0a0a] px-4 py-4 text-white outline-none transition focus:border-[#CCFF00] disabled:opacity-50"
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                />
              </div>
            );
          }
        )}
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
            disabled={inputDisabled || !submitCaption}
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
