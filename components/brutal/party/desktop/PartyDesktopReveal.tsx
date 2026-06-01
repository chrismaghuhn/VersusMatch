"use client";

import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import { HeadCluster, Scoreboard, SubmissionCard } from "@/components/brutal/party/shared/PartyPrimitives";
import { Meta, Shell } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_DESIGN } from "@/lib/party/design";
import type { PartySnapshot } from "@/lib/party/types";

type PartyDesktopRevealProps = {
  snapshot: PartySnapshot;
};

export function PartyDesktopReveal({ snapshot }: PartyDesktopRevealProps) {
  const accent = PARTY_DESIGN.accent;
  const sorted = [...snapshot.submissions].sort(
    (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0)
  );
  const winner = sorted[0];
  const winnerPlayer = winner
    ? snapshot.players.find((p) => p.userId === winner.userId)
    : undefined;
  const others = sorted.slice(1);

  return (
    <Shell>
      <PartyLayout
        accent={accent}
        regions={{
          eyebrow: PARTY_COPY.roundMeta(
            snapshot.room.currentRound,
            snapshot.room.roundCount,
            PARTY_COPY.phaseResults
          ),
          title: winnerPlayer ? (
            <>
              @{winnerPlayer.isYou ? "you" : winnerPlayer.handle}{" "}
              <span className="italic text-[#CCFF00]">takes it</span>.
            </>
          ) : (
            PARTY_COPY.revealAll
          ),
          subtitle: winner
            ? `${PARTY_COPY.revealVotes(winner.voteCount ?? 0)} · ${PARTY_COPY.revealWinner}`
            : undefined,
          headRight: (
            <HeadCluster
              currentRound={snapshot.room.currentRound}
              roundCount={snapshot.room.roundCount}
              showTimer={false}
              accent={accent}
            />
          ),
          main: winner ? (
            <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,360px)_1fr]">
              <div>
                <Meta color={accent}>{PARTY_COPY.revealWinner}</Meta>
                <div className="mt-2">
                  <SubmissionCard
                    caption={winner.caption}
                    captionRich={winner.captionRich}
                    imageUrl={winner.template?.imageUrl}
                    textBoxes={winner.template?.textBoxes}
                    authorHandle={winnerPlayer?.handle}
                    authorAvatarUrl={winnerPlayer?.avatarUrl}
                    authorIsYou={winnerPlayer?.isYou}
                    voteCount={winner.voteCount ?? 0}
                    winner
                    revealAuthor
                    showVotes
                    accent={accent}
                  />
                </div>
              </div>
              <div>
                <Meta>{PARTY_COPY.revealAll}</Meta>
                <div
                  className="mt-2 grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
                >
                  {others.map((sub) => {
                    const author = snapshot.players.find((p) => p.userId === sub.userId);
                    return (
                      <SubmissionCard
                        key={sub.id}
                        caption={sub.caption}
                        captionRich={sub.captionRich}
                        imageUrl={sub.template?.imageUrl}
                        textBoxes={sub.template?.textBoxes}
                        authorHandle={author?.handle}
                        authorAvatarUrl={author?.avatarUrl}
                        authorIsYou={author?.isYou}
                        voteCount={sub.voteCount ?? 0}
                        revealAuthor
                        showVotes
                        accent={accent}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-white/50">{PARTY_COPY.voteNothing}</p>
          ),
          asides: [
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
