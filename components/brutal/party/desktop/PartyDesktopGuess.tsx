"use client";

import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import { HeadCluster, Scoreboard } from "@/components/brutal/party/shared/PartyPrimitives";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { Meta, Shell } from "@/components/brutal/party/shared/Shell";
import { decodePartyAvatar } from "@/lib/party/avatar";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_DESIGN } from "@/lib/party/design";
import { captionForFrame } from "@/lib/party/caption-rich/legacy-read";
import { isGuessPhaseReady } from "@/lib/party/phase-ready";
import type { PartySnapshot } from "@/lib/party/types";

type PartyDesktopGuessProps = {
  snapshot: PartySnapshot;
  onGuess: (guessedUserId: string) => Promise<void>;
  guessing?: boolean;
};

export function PartyDesktopGuess({
  snapshot,
  onGuess,
  guessing = false,
}: PartyDesktopGuessProps) {
  const accent = "#FF2D87";
  const winner = snapshot.roundWinnerSubmission ?? null;
  const frame = winner ? captionForFrame(winner) : null;
  const selectedGuessId = snapshot.myAuthorGuess?.guessedUserId ?? null;
  const lockedForWinnerAuthor = Boolean(snapshot.iAmWinnerAuthor);
  const alreadyGuessed = Boolean(selectedGuessId);
  const allReady = isGuessPhaseReady(snapshot);
  const cast = snapshot.authorGuessesCastCount ?? 0;
  const eligible = snapshot.eligibleGuesserCount ?? 0;
  const disabled = guessing || lockedForWinnerAuthor || alreadyGuessed;

  return (
    <Shell>
      <PartyLayout
        accent={accent}
        regions={{
          eyebrow: PARTY_COPY.roundMeta(
            snapshot.room.currentRound,
            snapshot.room.roundCount,
            PARTY_COPY.authorGuessToggleLabel.toUpperCase()
          ),
          title: PARTY_COPY.guessPhaseTitle,
          subtitle: PARTY_COPY.guessPhaseSubtitle,
          headRight: (
            <HeadCluster
              currentRound={snapshot.room.currentRound}
              roundCount={snapshot.room.roundCount}
              phaseEndsAt={snapshot.room.phaseEndsAt}
              label={`${cast}/${eligible} GUESSED`}
              accent={accent}
            />
          ),
          main: (
            <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,380px)_1fr]">
              <div>
                <Meta color={accent}>ANONYMOUS WINNER</Meta>
                <div className="mt-2">
                  {winner ? (
                    <PartyTemplateFrame
                      caption={frame && "legacy" in frame ? frame.legacy : winner.caption}
                      captionRich={frame && "rich" in frame ? frame.rich : null}
                      imageUrl={winner.template?.imageUrl}
                      textBoxes={winner.template?.textBoxes}
                    />
                  ) : (
                    <p className="text-white/50">{PARTY_COPY.voteNothing}</p>
                  )}
                </div>
              </div>
              <div>
                <Meta>{lockedForWinnerAuthor ? "LOCKED" : "PICK THE AUTHOR"}</Meta>
                {lockedForWinnerAuthor ? (
                  <p className="mt-3 text-white/70" style={{ fontSize: 14, fontWeight: 700 }}>
                    {PARTY_COPY.guessPhaseLocked}
                  </p>
                ) : (
                  <div className="mt-2 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))" }}>
                    {snapshot.players.map((player) => {
                      const avatar = decodePartyAvatar(player.avatarUrl);
                      const selected = selectedGuessId === player.userId;
                      const canPick = !disabled;
                      return (
                        <button
                          key={player.userId}
                          type="button"
                          disabled={!canPick}
                          onClick={() => void onGuess(player.userId)}
                          className={
                            "border-2 p-3 transition " +
                            (selected
                              ? "border-[#FF2D87] bg-[#FF2D87]/15"
                              : "border-white/10 hover:border-white/40") +
                            (!canPick && !selected ? " opacity-55" : "")
                          }
                        >
                          <div className="mx-auto w-fit border border-white/10">
                            <Avatar id={avatar.id} color={avatar.color} size={56} />
                          </div>
                          <div className="mt-2 truncate text-white/70" style={{ fontSize: 11, fontWeight: 800 }}>
                            {player.isYou ? "you" : `@${player.handle}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ),
          asides: [
            {
              label: allReady ? "READY" : "PROGRESS",
              node: (
                <div>
                  <div className="mb-2 text-white/70" style={{ fontSize: 12, fontWeight: 800 }}>
                    {cast}/{eligible} guessed
                  </div>
                  <p className="m-0 text-white/50" style={{ fontSize: 12 }}>
                    {allReady ? PARTY_COPY.voteAllReady : "Waiting on the final guesses…"}
                  </p>
                </div>
              ),
            },
            {
              label: "STANDINGS",
              node: <Scoreboard players={snapshot.players} accent={PARTY_DESIGN.accent} compact />,
            },
          ],
        }}
      />
    </Shell>
  );
}
