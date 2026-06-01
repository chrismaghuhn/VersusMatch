"use client";

import { useMemo, useState } from "react";
import { PartyMobileShell } from "@/components/brutal/party/mobile/PartyMobileShell";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { decodePartyAvatar } from "@/lib/party/avatar";
import { PARTY_COPY } from "@/lib/party/copy";
import { captionForFrame } from "@/lib/party/caption-rich/legacy-read";
import { isVotingPhaseReady } from "@/lib/party/phase-ready";
import type { PartySnapshot } from "@/lib/party/types";

type PartyMobileVotingProps = {
  snapshot: PartySnapshot;
  onVote: (submissionId: string) => Promise<void>;
  onRetractVote?: () => Promise<void>;
  voting?: boolean;
  retracting?: boolean;
  retractDisabled?: boolean;
  phaseTransitioning?: boolean;
  embedded?: boolean;
};

export function PartyMobileVoting({
  snapshot,
  onVote,
  onRetractVote,
  voting = false,
  retracting = false,
  retractDisabled = false,
  phaseTransitioning = false,
  embedded = false,
}: PartyMobileVotingProps) {
  const pool = useMemo(() => snapshot.submissions, [snapshot.submissions]);
  const [index, setIndex] = useState(0);
  const voted = Boolean(snapshot.myVote);
  const current = pool[index % Math.max(pool.length, 1)];
  const author = current
    ? snapshot.players.find((p) => p.userId === current.userId)
    : undefined;
  const avatar = decodePartyAvatar(author?.avatarUrl);
  const frame = current ? captionForFrame(current) : null;
  const allReady = isVotingPhaseReady(snapshot);

  async function handleVote() {
    if (!current || voted || voting) return;
    await onVote(current.id);
  }

  function handleSkip() {
    if (pool.length <= 1 || voted) return;
    setIndex((i) => (i + 1) % pool.length);
  }

  const statusMessage = voted
    ? phaseTransitioning
      ? PARTY_COPY.votePhaseChanging
      : allReady
        ? PARTY_COPY.voteAllReady
        : PARTY_COPY.voteWaiting
    : null;

  const footer =
    !voted && pool.length > 0 ? (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pool.length <= 1 || voting}
          onClick={handleSkip}
          className="border border-white/20 py-3 text-white/60 transition hover:border-white hover:text-white disabled:opacity-40"
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
        >
          {PARTY_COPY.voteSkip}
        </button>
        <button
          type="button"
          disabled={voting}
          onClick={() => void handleVote()}
          className="bg-[#CCFF00] py-3 text-black transition hover:bg-white disabled:opacity-40"
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
        >
          {PARTY_COPY.voteHeart}
        </button>
      </div>
    ) : null;

  return (
    <PartyMobileShell
      round={snapshot.room.currentRound}
      roundCount={snapshot.room.roundCount}
      phaseLabel={PARTY_COPY.phaseVote}
      phaseEndsAt={snapshot.room.phaseEndsAt}
      accent="#FF2D87"
      allReady={allReady}
      progressLabel={
        voted
          ? PARTY_COPY.voteLockedIn
          : pool.length > 0
            ? `${PARTY_COPY.voteOf(index + 1, pool.length)} · ${PARTY_COPY.voteProgress(snapshot.votesCastCount, snapshot.players.length)}`
            : PARTY_COPY.voteProgress(snapshot.votesCastCount, snapshot.players.length)
      }
      footer={footer}
      embedded={embedded}
    >
      {voted ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
          <div
            className="text-[#CCFF00]"
            style={{ fontWeight: 900, fontSize: 18, letterSpacing: "0.08em" }}
          >
            {PARTY_COPY.voteLockedIn}
          </div>
          {statusMessage ? (
            <p className="mt-2 text-white/50" style={{ fontSize: 14 }}>
              {statusMessage}
            </p>
          ) : null}
          {onRetractVote ? (
            <button
              type="button"
              disabled={retractDisabled || retracting || phaseTransitioning}
              onClick={() => void onRetractVote()}
              className="mt-6 border border-white/20 px-5 py-2.5 text-white/70 transition hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
            >
              {retracting ? PARTY_COPY.voteUnlocking : PARTY_COPY.voteChange}
            </button>
          ) : null}
        </div>
      ) : pool.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 text-white/50" style={{ fontSize: 14 }}>
          {PARTY_COPY.voteNothing}
        </div>
      ) : (
        <div className="relative flex-1 p-3">
          <div className="absolute inset-3">
            <div className="absolute inset-0 translate-x-2 translate-y-2 border-2 border-white/10" />
            <div className="absolute inset-0 translate-x-1 translate-y-1 border-2 border-white/20" />
            <div className="relative h-full min-h-[280px]">
              <PartyTemplateFrame
                caption={frame && "legacy" in frame ? frame.legacy : current.caption}
                captionRich={frame && "rich" in frame ? frame.rich : null}
                imageUrl={current.template?.imageUrl}
                textBoxes={current.template?.textBoxes}
              />
              <div
                className="absolute inset-x-0 bottom-0 bg-black/90 p-2.5 backdrop-blur"
                style={{ borderTop: `2px solid ${avatar.color}` }}
              >
                <div className="flex items-center gap-2">
                  <Avatar id={avatar.id} color={avatar.color} size={20} />
                  <span className="text-white" style={{ fontWeight: 700, fontSize: 12 }}>
                    @{author?.handle ?? "?"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PartyMobileShell>
  );
}
