"use client";

import { useEffect, useState } from "react";
import { PartyCaptionInput } from "@/components/brutal/party/party-caption-input";
import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import { HeadCluster } from "@/components/brutal/party/shared/PartyPrimitives";
import { Shell } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_DESIGN } from "@/lib/party/design";
import type { CaptionSubmitPayload } from "@/lib/party/caption-submit";
import type { CaptionDocumentV3 } from "@/lib/party/caption-rich/types";
import type { TextBox } from "@/lib/party/types";

type PartyDesktopCaptionProps = {
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
  canvasEnabled?: boolean;
  captionDurationSeconds?: number;
  layoutRevision?: number;
  captionDraft?: CaptionDocumentV3 | null;
  roomId?: string;
  onRegisterCanvasReset?: (
    reset: (revision: number, draft: CaptionDocumentV3 | null) => void
  ) => void;
  onRegisterHasCustomBoxes?: (hasCustomBoxes: boolean) => void;
};

export function PartyDesktopCaption({
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
  canvasEnabled = false,
  captionDurationSeconds = 60,
  layoutRevision = 0,
  captionDraft = null,
  roomId = "",
  onRegisterCanvasReset,
  onRegisterHasCustomBoxes,
}: PartyDesktopCaptionProps) {
  const accent = PARTY_DESIGN.accent;
  const [layoutFrozen, setLayoutFrozen] = useState(false);

  useEffect(() => {
    if (!canvasEnabled) setLayoutFrozen(false);
  }, [canvasEnabled]);

  const captionTimerTotal = captionDurationSeconds;

  return (
    <Shell>
      <PartyLayout
        accent={accent}
        regions={{
          eyebrow: PARTY_COPY.roundMeta(round, roundCount, PARTY_COPY.phaseCaption),
          title: (
            <>
              Write your <span className="italic text-[#CCFF00]">caption</span>.
            </>
          ),
          subtitle: PARTY_COPY.captionExample,
          headRight: (
            <HeadCluster
              currentRound={round}
              roundCount={roundCount}
              phaseEndsAt={phaseEndsAt}
              label={PARTY_COPY.captionProgress(captionCount, playerCount).toUpperCase()}
              accent={accent}
              layoutFrozen={layoutFrozen}
              captionDurationSeconds={captionTimerTotal}
            />
          ),
          main: (
            <div className="mx-auto max-w-xl">
              <PartyCaptionInput
                value={value}
                onChange={onChange}
                onSubmit={onSubmit}
                onUnlock={onUnlock}
                onReroll={onReroll}
                locked={locked}
                unlockDisabled={unlockDisabled}
                unlocking={unlocking}
                submitting={submitting}
                rerolling={rerolling}
                rerollsRemaining={rerollsRemaining}
                showRerollDraftHint={showRerollDraftHint}
                template={template}
                canvasEnabled={canvasEnabled}
                layoutRevision={layoutRevision}
                captionDraft={captionDraft}
                roomId={roomId}
                onRegisterCanvasReset={onRegisterCanvasReset}
                onRegisterHasCustomBoxes={onRegisterHasCustomBoxes}
                onLayoutFrozenChange={setLayoutFrozen}
              />
              {statusMessage ? (
                <p
                  className="mt-4 text-center text-[#CCFF00]"
                  style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em" }}
                >
                  {statusMessage}
                </p>
              ) : allReady && locked ? (
                <p className="mt-4 text-center text-[#CCFF00]" style={{ fontSize: 12, fontWeight: 800 }}>
                  {PARTY_COPY.captionAllReady}
                </p>
              ) : null}
            </div>
          ),
        }}
      />
    </Shell>
  );
}
