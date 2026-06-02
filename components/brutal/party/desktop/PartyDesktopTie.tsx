"use client";

import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import { HeadCluster } from "@/components/brutal/party/shared/PartyPrimitives";
import { Meta, Shell } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_DESIGN } from "@/lib/party/design";
import type { PartySnapshot } from "@/lib/party/types";

type PartyDesktopTieProps = {
  snapshot: PartySnapshot;
};

export function PartyDesktopTie({ snapshot }: PartyDesktopTieProps) {
  const tied = snapshot.voteTieCount ?? 2;
  const votes = snapshot.tiedVoteCount ?? 0;
  const accent = PARTY_DESIGN.accent;

  return (
    <Shell>
      <PartyLayout
        accent={accent}
        regions={{
          eyebrow: PARTY_COPY.roundMeta(
            snapshot.room.currentRound,
            snapshot.room.roundCount,
            PARTY_COPY.phaseTie
          ),
          title: PARTY_COPY.tiePhaseTitle,
          subtitle: PARTY_COPY.tiePhaseSubtitle(tied, votes),
          headRight: (
            <HeadCluster
              currentRound={snapshot.room.currentRound}
              roundCount={snapshot.room.roundCount}
              phaseEndsAt={snapshot.room.phaseEndsAt}
              label="DEADLOCK"
              accent={accent}
            />
          ),
          main: (
            <div className="flex min-h-[360px] flex-col items-center justify-center border-2 border-[#CCFF00]/40 bg-[#CCFF00]/5 p-12 text-center">
              <Meta color={accent}>TIED AT THE TOP</Meta>
              <p
                className="mt-6 max-w-lg text-white/65"
                style={{ fontSize: 18, lineHeight: 1.45, fontWeight: 600 }}
              >
                {PARTY_COPY.tiePhaseSubtitle(tied, votes)}
              </p>
            </div>
          ),
        }}
      />
    </Shell>
  );
}
