"use client";

import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { PartyPhaseTimer } from "@/components/brutal/party/party-phase-timer";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { decodePartyAvatar } from "@/lib/party/avatar";
import type { PartySnapshot } from "@/lib/party/types";

type PartyRevealScreenProps = {
  snapshot: PartySnapshot;
};

export function PartyRevealScreen({ snapshot }: PartyRevealScreenProps) {
  const sorted = [...snapshot.submissions].sort(
    (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0)
  );
  const winner = sorted[0];
  const winnerPlayer = winner
    ? snapshot.players.find((p) => p.userId === winner.userId)
    : undefined;
  const winnerAvatar = decodePartyAvatar(winnerPlayer?.avatarUrl);

  return (
    <Shell>
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CCFF00]/30 pb-3">
          <Meta color="#CCFF00">
            ROUND {snapshot.room.currentRound}/{snapshot.room.roundCount} · RESULTS
          </Meta>
          <PartyPhaseTimer phaseEndsAt={snapshot.room.phaseEndsAt} accent="#CCFF00" />
        </div>

        {winner ? (
          <div className="mt-6 border border-[#CCFF00]/40 bg-[#CCFF00]/5 p-4">
            <div
              className="text-[#CCFF00]"
              style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em" }}
            >
              ★ ROUND WINNER
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
              <PartyTemplateFrame
                caption={winner.caption}
                imageUrl={snapshot.room.template?.imageUrl}
                textBoxes={snapshot.room.template?.textBoxes}
              />
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <Avatar id={winnerAvatar.id} color={winnerAvatar.color} size={40} />
                  <div>
                    <div className="text-white" style={{ fontWeight: 900, fontSize: 18 }}>
                      @{winnerPlayer?.handle ?? "?"}
                    </div>
                    <div className="text-[#CCFF00]" style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 22 }}>
                      +{winner.voteCount ?? 0} votes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((sub) => {
            const player = snapshot.players.find((p) => p.userId === sub.userId);
            const avatar = decodePartyAvatar(player?.avatarUrl);
            const isWinner = sub.id === winner?.id;

            return (
              <div
                key={sub.id}
                className={
                  "border bg-black p-3 " +
                  (isWinner ? "border-[#CCFF00]" : "border-white/10")
                }
              >
                <PartyTemplateFrame
                  caption={sub.caption}
                  imageUrl={snapshot.room.template?.imageUrl}
                  textBoxes={snapshot.room.template?.textBoxes}
                  mini
                />
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar id={avatar.id} color={avatar.color} size={22} />
                    <span className="text-white/80" style={{ fontSize: 12, fontWeight: 700 }}>
                      @{player?.handle ?? "?"}
                    </span>
                  </div>
                  <span
                    className="border border-white/20 px-2 py-0.5 text-white/70"
                    style={{ fontSize: 10, fontWeight: 800 }}
                  >
                    {sub.voteCount ?? 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
