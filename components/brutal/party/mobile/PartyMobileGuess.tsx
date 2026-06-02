"use client";

import { PartyMobileShell } from "@/components/brutal/party/mobile/PartyMobileShell";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { decodePartyAvatar } from "@/lib/party/avatar";
import { PARTY_COPY } from "@/lib/party/copy";
import { captionForFrame } from "@/lib/party/caption-rich/legacy-read";
import { isGuessPhaseReady } from "@/lib/party/phase-ready";
import type { PartySnapshot } from "@/lib/party/types";

type PartyMobileGuessProps = {
  snapshot: PartySnapshot;
  onGuess: (guessedUserId: string) => Promise<void>;
  guessing?: boolean;
  embedded?: boolean;
};

export function PartyMobileGuess({
  snapshot,
  onGuess,
  guessing = false,
  embedded = false,
}: PartyMobileGuessProps) {
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
    <PartyMobileShell
      round={snapshot.room.currentRound}
      roundCount={snapshot.room.roundCount}
      phaseLabel={PARTY_COPY.authorGuessToggleLabel.toUpperCase()}
      phaseEndsAt={snapshot.room.phaseEndsAt}
      accent="#FF2D87"
      allReady={allReady}
      progressLabel={`${cast}/${eligible} guessed`}
      embedded={embedded}
    >
      <div className="px-4 pb-3 pt-4 text-center">
        <div className="text-[#FF2D87]" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}>
          {PARTY_COPY.guessPhaseTitle}
        </div>
        <p className="mt-2 text-white/60" style={{ fontSize: 13, lineHeight: 1.45 }}>
          {PARTY_COPY.guessPhaseSubtitle}
        </p>
      </div>

      {winner ? (
        <div className="px-3 pb-3">
          <PartyTemplateFrame
            caption={frame && "legacy" in frame ? frame.legacy : winner.caption}
            captionRich={frame && "rich" in frame ? frame.rich : null}
            imageUrl={winner.template?.imageUrl}
            textBoxes={winner.template?.textBoxes}
          />
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-white/50" style={{ fontSize: 13 }}>
          {PARTY_COPY.voteNothing}
        </div>
      )}

      {lockedForWinnerAuthor ? (
        <div className="px-4 pb-6 text-center text-white/70" style={{ fontSize: 13, fontWeight: 700 }}>
          {PARTY_COPY.guessPhaseLocked}
        </div>
      ) : (
        <div className="px-4 pb-5">
          <div className="grid grid-cols-4 gap-2">
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
                    "border-2 p-2 transition " +
                    (selected
                      ? "border-[#FF2D87] bg-[#FF2D87]/15"
                      : "border-white/10 hover:border-white/40") +
                    (!canPick && !selected ? " opacity-55" : "")
                  }
                >
                  <div className="mx-auto w-fit border border-white/10">
                    <Avatar id={avatar.id} color={avatar.color} size={42} />
                  </div>
                  <div className="mt-1 truncate text-white/70" style={{ fontSize: 10, fontWeight: 800 }}>
                    {player.isYou ? "you" : `@${player.handle}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PartyMobileShell>
  );
}
