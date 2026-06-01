"use client";

import { Send } from "lucide-react";
import { PartyMobileShell } from "@/components/brutal/party/mobile/PartyMobileShell";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { PARTY_COPY } from "@/lib/party/copy-de";
import type { TextBox } from "@/lib/party/types";
import {
  CAPTION_MAX_LENGTH,
  CAPTION_PLACEHOLDER,
  normalizeCaption,
} from "@/lib/party/caption";

type PartyMobileCaptionProps = {
  round: number;
  roundCount: number;
  phaseEndsAt: string | null;
  allReady: boolean;
  captionCount: number;
  playerCount: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onUnlock?: () => void;
  locked?: boolean;
  unlockDisabled?: boolean;
  unlocking?: boolean;
  submitting?: boolean;
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
  locked = false,
  unlocking = false,
  unlockDisabled = false,
  submitting = false,
  statusMessage,
  template = null,
  embedded = false,
}: PartyMobileCaptionProps) {
  const inputDisabled = locked || submitting || unlocking;
  const normalized = normalizeCaption(value);
  const remaining = CAPTION_MAX_LENGTH - normalized.length;

  function handleSubmit() {
    if (inputDisabled || !normalized) return;
    onSubmit();
  }

  const footer = !locked ? (
    <button
      type="button"
      disabled={inputDisabled || !normalized}
      onClick={handleSubmit}
      className="flex w-full items-center justify-center gap-2 bg-[#FF2D87] py-3.5 text-white transition hover:bg-[#CCFF00] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
      style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}
    >
      <Send className="h-3 w-3" />
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
            caption={normalized || undefined}
            imageUrl={template?.imageUrl}
            textBoxes={template?.textBoxes}
          />
        </div>
        <div className="mt-3 flex-1 px-1">
          <label
            htmlFor="party-caption-mobile"
            className="text-white/40"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em" }}
          >
            {PARTY_COPY.captionLabel}
          </label>
          <input
            id="party-caption-mobile"
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
            className="mt-2 w-full border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-white outline-none focus:border-[#CCFF00] disabled:opacity-50"
            style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}
          />
          <div className="mt-1 flex justify-between text-white/40" style={{ fontSize: 11 }}>
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
