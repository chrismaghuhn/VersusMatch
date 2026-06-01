"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import { PartyBtn } from "@/components/brutal/party/shared/PartyPrimitives";
import { Meta, Shell } from "@/components/brutal/party/shared/Shell";
import { ShareCard } from "@/components/brutal/party/screens/ShareCard";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { decodePartyAvatar } from "@/lib/party/avatar";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_DESIGN } from "@/lib/party/design";
import type { PartySnapshot } from "@/lib/party/types";

type PartyDesktopFinishedProps = {
  snapshot: PartySnapshot;
};

export function PartyDesktopFinished({ snapshot }: PartyDesktopFinishedProps) {
  const accent = PARTY_DESIGN.accent;
  const ranked = [...snapshot.players].sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  const winners = ranked.filter((p) => p.score === topScore && topScore > 0);

  return (
    <Shell>
      <PartyLayout
        accent={accent}
        regions={{
          eyebrow: `━━ ${PARTY_COPY.finishedGameOver}`,
          title: winners.length === 1 ? (
            <>
              @{winners[0]!.isYou ? "you" : winners[0]!.handle}{" "}
              <span className="italic text-[#CCFF00]">wins</span>.
            </>
          ) : winners.length > 1 ? (
            <>
              <span className="italic text-[#CCFF00]">{PARTY_COPY.finishedTie(winners.length)}</span>
            </>
          ) : (
            PARTY_COPY.finishedScores
          ),
          subtitle: PARTY_COPY.finishedRoom(snapshot.room.code, snapshot.room.roundCount),
          main: (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <Meta>FINAL STANDINGS</Meta>
                <ol className="mt-3 space-y-2">
                  {ranked.map((player, i) => {
                    const avatar = decodePartyAvatar(player.avatarUrl);
                    const lead = player.score === topScore && topScore > 0;
                    return (
                      <li
                        key={player.userId}
                        className={
                          "flex items-center justify-between gap-3 border px-4 py-3 " +
                          (lead
                            ? "border-[#CCFF00] bg-[#CCFF00]/10"
                            : "border-white/10 bg-[#0a0a0a]")
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="text-white/40"
                            style={{
                              fontFamily: "ui-monospace, monospace",
                              fontWeight: 900,
                              fontSize: 14,
                            }}
                          >
                            #{i + 1}
                          </span>
                          <Avatar id={avatar.id} color={avatar.color} size={32} />
                          <span className="text-white" style={{ fontWeight: 800, fontSize: 14 }}>
                            {player.isYou ? "you" : `@${player.handle}`}
                            {player.isHost ? (
                              <Crown className="ml-1 inline h-3 w-3 text-[#FFB800]" />
                            ) : null}
                          </span>
                        </div>
                        <span
                          className={lead ? "text-[#CCFF00]" : "text-white"}
                          style={{
                            fontFamily: "ui-monospace, monospace",
                            fontWeight: 900,
                            fontSize: 18,
                          }}
                        >
                          {player.score}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <ShareCard snapshot={snapshot} embedded showPngDownload={false} />
            </div>
          ),
          actions: (
            <Link href="/party" className="block max-w-sm">
              <PartyBtn accent={accent}>{PARTY_COPY.finishedPlayAgain} →</PartyBtn>
            </Link>
          ),
        }}
      />
    </Shell>
  );
}
