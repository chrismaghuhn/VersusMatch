"use client";

import { PartyDesktopFinished } from "@/components/brutal/party/desktop";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { ShareCard } from "@/components/brutal/party/screens/ShareCard";
import { usePartyDesktop } from "@/lib/party/use-party-desktop";
import { PARTY_COPY } from "@/lib/party/copy";
import type { PartySnapshot } from "@/lib/party/types";
import Link from "next/link";
import { Crown } from "lucide-react";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { decodePartyAvatar } from "@/lib/party/avatar";

type PartyFinishedScreenProps = {
  snapshot: PartySnapshot;
};

function PartyFinishedMobile({ snapshot }: PartyFinishedScreenProps) {
  const ranked = [...snapshot.players].sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  const winners = ranked.filter((p) => p.score === topScore && topScore > 0);

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-6 py-12">
        <Meta color="#CCFF00">━━ {PARTY_COPY.finishedGameOver}</Meta>
        <h1
          className="mt-3 text-white"
          style={{
            fontWeight: 900,
            fontSize: "clamp(36px, 8vw, 56px)",
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
          }}
        >
          {winners.length === 1 ? (
            <span className="italic text-[#CCFF00]">
              {PARTY_COPY.finishedWinner(winners[0]!.handle)}
            </span>
          ) : winners.length > 1 ? (
            <span className="italic text-[#CCFF00]">
              {PARTY_COPY.finishedTie(winners.length)}
            </span>
          ) : (
            PARTY_COPY.finishedScores
          )}
        </h1>
        <p className="mt-2 text-white/50" style={{ fontSize: 14 }}>
          {PARTY_COPY.finishedRoom(snapshot.room.code, snapshot.room.roundCount)}
        </p>

        <ol className="mt-8 space-y-2">
          {ranked.map((player, i) => {
            const avatar = decodePartyAvatar(player.avatarUrl);
            return (
              <li
                key={player.userId}
                className={
                  "flex items-center justify-between border px-4 py-3 " +
                  (player.score === topScore && topScore > 0
                    ? "border-[#CCFF00] bg-[#CCFF00]/10"
                    : "border-white/10 bg-[#0a0a0a]")
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-white/40"
                    style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 14 }}
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
                  className={player.score === topScore && topScore > 0 ? "text-[#CCFF00]" : "text-white"}
                  style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 18 }}
                >
                  {player.score}
                </span>
              </li>
            );
          })}
        </ol>

        <ShareCard snapshot={snapshot} embedded />

        <Link
          href="/party"
          className="mt-8 flex w-full items-center justify-center bg-[#CCFF00] py-4 text-black transition hover:bg-white"
          style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}
        >
          {PARTY_COPY.finishedPlayAgain}
        </Link>
      </div>
    </Shell>
  );
}

export function PartyFinishedScreen({ snapshot }: PartyFinishedScreenProps) {
  const desktop = usePartyDesktop();
  if (desktop) {
    return <PartyDesktopFinished snapshot={snapshot} />;
  }
  return <PartyFinishedMobile snapshot={snapshot} />;
}
