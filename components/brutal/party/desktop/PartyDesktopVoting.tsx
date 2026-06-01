"use client";

import { useMemo } from "react";
import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import {
  HeadCluster,
  Scoreboard,
  SubmissionCard,
} from "@/components/brutal/party/shared/PartyPrimitives";
import { Meta, Shell } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_DESIGN, partyVoteGridColumns } from "@/lib/party/design";
import { isVotingPhaseReady } from "@/lib/party/phase-ready";
import type { PartySnapshot } from "@/lib/party/types";

type PartyDesktopVotingProps = {
  snapshot: PartySnapshot;
  onVote: (submissionId: string) => Promise<void>;
  onRetractVote?: () => Promise<void>;
  voting?: boolean;
  retracting?: boolean;
  retractDisabled?: boolean;
  phaseTransitioning?: boolean;
};

export function PartyDesktopVoting({
  snapshot,
  onVote,
  onRetractVote,
  voting = false,
  retracting = false,
  retractDisabled = false,
  phaseTransitioning = false,
}: PartyDesktopVotingProps) {
  const accent = PARTY_DESIGN.accent;
  const pool = useMemo(() => snapshot.submissions, [snapshot.submissions]);
  const votedId = snapshot.myVote?.submissionId ?? null;
  const allReady = isVotingPhaseReady(snapshot);

  const statusLine = votedId
    ? phaseTransitioning
      ? PARTY_COPY.votePhaseChanging
      : allReady
        ? PARTY_COPY.voteAllReady
        : PARTY_COPY.voteWaiting
    : "Tap a meme to lock your vote.";

  return (
    <Shell>
      <PartyLayout
        accent={accent}
        regions={{
          eyebrow: PARTY_COPY.roundMeta(
            snapshot.room.currentRound,
            snapshot.room.roundCount,
            PARTY_COPY.phaseVote
          ),
          title: (
            <>
              Pick the <span className="italic text-[#CCFF00]">funniest</span>.
            </>
          ),
          subtitle: "All anonymous. Trust your gut.",
          headRight: (
            <HeadCluster
              currentRound={snapshot.room.currentRound}
              roundCount={snapshot.room.roundCount}
              phaseEndsAt={snapshot.room.phaseEndsAt}
              label={PARTY_COPY.voteProgress(snapshot.votesCastCount, snapshot.players.length).toUpperCase()}
              accent={accent}
            />
          ),
          main: (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: partyVoteGridColumns(PARTY_DESIGN.density) }}
            >
              {pool.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    submissionId={sub.id}
                    caption={sub.caption}
                    imageUrl={sub.template?.imageUrl}
                    textBoxes={sub.template?.textBoxes}
                    voted={votedId === sub.id}
                    accent={accent}
                    onVote={
                      votedId || voting
                        ? undefined
                        : () => {
                            void onVote(sub.id);
                          }
                    }
                  />
              ))}
            </div>
          ),
          asides: [
            {
              label: PARTY_COPY.voteProgress(snapshot.votesCastCount, snapshot.players.length).toUpperCase(),
              node: (
                <div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {snapshot.players.map((_, i) => (
                      <div
                        key={i}
                        className="h-3 w-3"
                        style={{
                          background:
                            i < snapshot.votesCastCount
                              ? accent
                              : "rgba(255,255,255,0.12)",
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="m-0 font-bold"
                    style={{
                      fontSize: 12,
                      color: votedId ? accent : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {statusLine}
                  </p>
                  {votedId && onRetractVote ? (
                    <button
                      type="button"
                      disabled={retracting || retractDisabled}
                      onClick={() => void onRetractVote()}
                      className="mt-3 border border-white/20 px-3 py-2 text-white/70 hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:opacity-40"
                      style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}
                    >
                      {retracting ? PARTY_COPY.voteUnlocking : PARTY_COPY.voteChange}
                    </button>
                  ) : null}
                </div>
              ),
            },
            {
              label: "STANDINGS",
              node: <Scoreboard players={snapshot.players} accent={accent} compact />,
            },
          ],
        }}
      />
    </Shell>
  );
}
