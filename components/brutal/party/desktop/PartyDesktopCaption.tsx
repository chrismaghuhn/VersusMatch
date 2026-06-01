"use client";

import { PartyCaptionInput } from "@/components/brutal/party/party-caption-input";
import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import { HeadCluster } from "@/components/brutal/party/shared/PartyPrimitives";
import { Shell } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_DESIGN } from "@/lib/party/design";
import type { CaptionSubmitPayload } from "@/lib/party/caption-submit";
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
}: PartyDesktopCaptionProps) {
  const accent = PARTY_DESIGN.accent;

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
