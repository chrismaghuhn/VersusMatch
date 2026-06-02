"use client";

import { PartyMobileShell } from "@/components/brutal/party/mobile/PartyMobileShell";
import { PARTY_COPY } from "@/lib/party/copy";
import type { PartySnapshot } from "@/lib/party/types";

type PartyMobileTieProps = {
  snapshot: PartySnapshot;
  embedded?: boolean;
};

export function PartyMobileTie({ snapshot, embedded = false }: PartyMobileTieProps) {
  const tied = snapshot.voteTieCount ?? 2;
  const votes = snapshot.tiedVoteCount ?? 0;

  return (
    <PartyMobileShell
      round={snapshot.room.currentRound}
      roundCount={snapshot.room.roundCount}
      phaseLabel={PARTY_COPY.phaseTie}
      phaseEndsAt={snapshot.room.phaseEndsAt}
      accent="#CCFF00"
      embedded={embedded}
    >
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 text-center">
        <div
          className="text-[#CCFF00]"
          style={{
            fontSize: "clamp(48px, 14vw, 72px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
          }}
        >
          {PARTY_COPY.tiePhaseTitle}
        </div>
        <p
          className="mt-6 max-w-xs text-white/70"
          style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 600 }}
        >
          {PARTY_COPY.tiePhaseSubtitle(tied, votes)}
        </p>
      </div>
    </PartyMobileShell>
  );
}
