"use client";

import { PartyMobileShell } from "@/components/brutal/party/mobile/PartyMobileShell";
import {
  LobbyReactionBar,
  type LobbyReactionFeedItem,
} from "@/components/brutal/party/lobby-reaction-bar";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { decodePartyAvatar } from "@/lib/party/avatar";
import { PARTY_COPY } from "@/lib/party/copy";
import { captionForFrame } from "@/lib/party/caption-rich/legacy-read";
import type { PartyReactionKey, PartySnapshot } from "@/lib/party/types";

type PartyMobileRevealProps = {
  snapshot: PartySnapshot;
  recentReactions?: LobbyReactionFeedItem[];
  onSendReaction?: (key: PartyReactionKey) => void;
  embedded?: boolean;
};

export function PartyMobileReveal({
  snapshot,
  recentReactions,
  onSendReaction,
  embedded = false,
}: PartyMobileRevealProps) {
  const sorted = [...snapshot.submissions].sort(
    (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0)
  );
  const winner = sorted[0];
  const winnerPlayer = winner
    ? snapshot.players.find((p) => p.userId === winner.userId)
    : undefined;
  const winnerAvatar = decodePartyAvatar(winnerPlayer?.avatarUrl);
  const winnerFrame = winner ? captionForFrame(winner) : null;

  const rankedPlayers = [...snapshot.players].sort((a, b) => b.score - a.score);

  return (
    <PartyMobileShell
      round={snapshot.room.currentRound}
      roundCount={snapshot.room.roundCount}
      phaseLabel={PARTY_COPY.phaseResults}
      phaseEndsAt={snapshot.room.phaseEndsAt}
      accent="#CCFF00"
      embedded={embedded}
    >
      {winner ? (
        <>
          <div className="border-b border-[#CCFF00]/30 bg-[#CCFF00]/5 px-4 py-2">
            <span
              className="text-[#CCFF00]"
              style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em" }}
            >
              {PARTY_COPY.revealWinner}
            </span>
          </div>
          <div className="p-3">
            <PartyTemplateFrame
              caption={winnerFrame && "legacy" in winnerFrame ? winnerFrame.legacy : winner.caption}
              captionRich={winnerFrame && "rich" in winnerFrame ? winnerFrame.rich : null}
              imageUrl={winner.template?.imageUrl}
              textBoxes={winner.template?.textBoxes}
            />
          </div>
          <div className="flex items-center gap-2 px-4 pb-3">
            <div className="border-2" style={{ borderColor: winnerAvatar.color }}>
              <Avatar id={winnerAvatar.id} color={winnerAvatar.color} size={32} />
            </div>
            <div>
              <div className="text-white" style={{ fontWeight: 900, fontSize: 14 }}>
                @{winnerPlayer?.handle ?? "?"}
              </div>
              <div className="text-white/40" style={{ fontSize: 10 }}>
                {PARTY_COPY.revealVotes(winner.voteCount ?? 0)}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div
          className="mb-2 text-white/40"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em" }}
        >
          {PARTY_COPY.revealAll}
        </div>
        {rankedPlayers.map((player, i) => {
          const avatar = decodePartyAvatar(player.avatarUrl);
          const isLeader = i === 0;
          return (
            <div
              key={player.userId}
              className={
                "flex items-center justify-between border-b border-white/5 py-2 " +
                (isLeader ? "text-[#CCFF00]" : "text-white")
              }
              style={{ fontSize: 12 }}
            >
              <div className="flex items-center gap-2">
                <Avatar id={avatar.id} color={avatar.color} size={20} />
                <span style={{ fontWeight: 700 }}>
                  #{i + 1} {player.isYou ? "you" : `@${player.handle}`}
                </span>
              </div>
              <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800 }}>
                {player.score}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <LobbyReactionBar recent={recentReactions} onSend={onSendReaction} />
      </div>
    </PartyMobileShell>
  );
}
