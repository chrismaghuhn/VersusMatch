"use client";

import { Send } from "lucide-react";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import type { TextBox } from "@/lib/party/types";
import { PARTY_COPY } from "@/lib/party/copy-de";
import {
  CAPTION_MAX_LENGTH,
  CAPTION_PLACEHOLDER,
  normalizeCaption,
} from "@/lib/party/caption";

type PartyCaptionInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onUnlock?: () => void;
  locked?: boolean;
  unlockDisabled?: boolean;
  unlocking?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  template?: { imageUrl: string; textBoxes: TextBox[] } | null;
  /** Fallback when no storage template yet */
  previewTemplate?: "drake" | "boyfriend" | "brain" | "pikachu";
};

export function PartyCaptionInput({
  value,
  onChange,
  onSubmit,
  onUnlock,
  locked = false,
  unlockDisabled = false,
  unlocking = false,
  disabled = false,
  submitting = false,
  template = null,
  previewTemplate = "drake",
}: PartyCaptionInputProps) {
  const inputDisabled = (locked ? true : disabled) || submitting || unlocking;
  const normalized = normalizeCaption(value);
  const remaining = CAPTION_MAX_LENGTH - normalized.length;

  function handleSubmit() {
    if (inputDisabled || !normalized) return;
    onSubmit();
  }

  return (
    <div className="flex flex-col gap-4">
      <PartyTemplateFrame
        caption={normalized || undefined}
        imageUrl={template?.imageUrl}
        textBoxes={template?.textBoxes}
        fallbackTemplate={previewTemplate}
      />

      <div>
        <label
          htmlFor="party-caption"
          className="text-white/40"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
        >
          {PARTY_COPY.captionLabel}
        </label>
        <input
          id="party-caption"
          value={value}
          disabled={inputDisabled}
          maxLength={CAPTION_MAX_LENGTH}
          placeholder={CAPTION_PLACEHOLDER}
          onChange={(e) => onChange(e.target.value.slice(0, CAPTION_MAX_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="mt-2 w-full border-2 border-white/10 bg-[#0a0a0a] px-4 py-4 text-white outline-none transition focus:border-[#CCFF00] disabled:opacity-50"
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        />
        <div className="mt-1 flex justify-between text-white/40" style={{ fontSize: 11 }}>
          <span>{PARTY_COPY.captionExample}</span>
          <span className={remaining < 20 ? "text-[#FF2D87]" : undefined}>{remaining}</span>
        </div>
      </div>

      {!locked ? (
        <button
          type="button"
          disabled={inputDisabled || !normalized}
          onClick={handleSubmit}
          className="flex w-full items-center justify-center gap-2 bg-[#FF2D87] py-3.5 text-white transition hover:bg-[#CCFF00] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? PARTY_COPY.lockInSending : PARTY_COPY.lockIn}
        </button>
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
