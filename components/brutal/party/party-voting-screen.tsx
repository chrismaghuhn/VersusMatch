"use client";

import { useMemo, useState } from "react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { PartyPhaseTimer } from "@/components/brutal/party/party-phase-timer";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { decodePartyAvatar } from "@/lib/party/avatar";
import type { PartySnapshot } from "@/lib/party/types";

import { isCaptionPhaseReady, isVotingPhaseReady } from "@/lib/party/phase-ready";

type PartyVotingScreenProps = {
  snapshot: PartySnapshot;
  onVote: (submissionId: string) => Promise<void>;
  onRetractVote?: () => Promise<void>;
  voting?: boolean;
  retracting?: boolean;
  retractDisabled?: boolean;
  phaseTransitioning?: boolean;
};

export function PartyVotingScreen({
  snapshot,
  onVote,
  onRetractVote,
  voting = false,
  retracting = false,
  retractDisabled = false,
  phaseTransitioning = false,
}: PartyVotingScreenProps) {
  const pool = useMemo(() => snapshot.submissions, [snapshot.submissions]);

  const [index, setIndex] = useState(0);
  const voted = Boolean(snapshot.myVote);
  const current = pool[index % Math.max(pool.length, 1)];

  const author = current
    ? snapshot.players.find((p) => p.userId === current.userId)
    : undefined;
  const avatar = decodePartyAvatar(author?.avatarUrl);

  async function handleVote() {
    if (!current || voted || voting) return;
    await onVote(current.id);
  }

  function handleSkip() {
    if (pool.length <= 1 || voted) return;
    setIndex((i) => (i + 1) % pool.length);
  }

  const allReady = isVotingPhaseReady(snapshot);

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-6 py-10">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <Meta>
            ROUND {snapshot.room.currentRound}/{snapshot.room.roundCount} · VOTE
          </Meta>
          <PartyPhaseTimer
            phaseEndsAt={snapshot.room.phaseEndsAt}
            accent="#FF2D87"
            allReady={allReady}
          />
        </div>

        <p className="mt-3 text-white/50" style={{ fontSize: 13 }}>
          {snapshot.votesCastCount}/{snapshot.players.length} voted
        </p>

        {voted ? (
          <div className="mt-12 text-center">
            <div className="text-[#CCFF00]" style={{ fontWeight: 900, fontSize: 18, letterSpacing: "0.08em" }}>
              VOTE LOCKED IN
            </div>
            <p className="mt-2 text-white/50" style={{ fontSize: 14 }}>
              {phaseTransitioning
                ? "Phase changing…"
                : allReady
                  ? "Everyone voted — starting reveal…"
                  : "Waiting for the rest of the chaos council…"}
            </p>
            {onRetractVote ? (
              <button
                type="button"
                disabled={retractDisabled || retracting || phaseTransitioning}
                onClick={() => void onRetractVote()}
                className="mt-6 border border-white/20 px-5 py-2.5 text-white/70 transition hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
              >
                {retracting ? "UNLOCKING…" : "CHANGE VOTE"}
              </button>
            ) : null}
          </div>
        ) : pool.length === 0 ? (
          <div className="mt-12 text-center text-white/50" style={{ fontSize: 14 }}>
            Nothing to vote on this round.
          </div>
        ) : (
          <>
            <p className="mt-2 text-white/40" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em" }}>
              {index + 1} OF {pool.length}
            </p>

            <div className="relative mt-4">
              <div className="absolute inset-0 translate-x-2 translate-y-2 border-2 border-white/10" />
              <div className="relative border-2 border-white/20 bg-black p-3">
                <PartyTemplateFrame
                  caption={current.caption}
                  imageUrl={snapshot.room.template?.imageUrl}
                  textBoxes={snapshot.room.template?.textBoxes}
                />
                <div
                  className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3"
                  style={{ borderColor: avatar.color }}
                >
                  <Avatar id={avatar.id} color={avatar.color} size={28} />
                  <span className="text-white" style={{ fontWeight: 700, fontSize: 13 }}>
                    @{author?.handle ?? "?"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pool.length <= 1 || voting}
                onClick={handleSkip}
                className="border border-white/20 py-3.5 text-white/70 transition hover:border-white hover:text-white disabled:opacity-40"
                style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
              >
                SKIP →
              </button>
              <button
                type="button"
                disabled={voting}
                onClick={() => void handleVote()}
                className="bg-[#CCFF00] py-3.5 text-black transition hover:bg-white disabled:opacity-40"
                style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
              >
                ♥ VOTE
              </button>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
