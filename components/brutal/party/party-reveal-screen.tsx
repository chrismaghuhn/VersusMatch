"use client";

import { PartyMobileReveal } from "@/components/brutal/party/mobile/PartyMobileReveal";
import { PartyDesktopReveal } from "@/components/brutal/party/desktop";
import { usePartyDesktop } from "@/lib/party/use-party-desktop";
import type { LobbyReactionFeedItem } from "@/components/brutal/party/lobby-reaction-bar";
import type { PartyReactionKey, PartySnapshot } from "@/lib/party/types";

type PartyRevealScreenProps = {
  snapshot: PartySnapshot;
  recentReactions?: LobbyReactionFeedItem[];
  onSendReaction?: (key: PartyReactionKey) => void;
};

export function PartyRevealScreen({
  snapshot,
  recentReactions,
  onSendReaction,
}: PartyRevealScreenProps) {
  const desktop = usePartyDesktop();
  if (desktop) {
    return (
      <PartyDesktopReveal
        snapshot={snapshot}
        recentReactions={recentReactions}
        onSendReaction={onSendReaction}
      />
    );
  }
  return (
    <PartyMobileReveal
      snapshot={snapshot}
      recentReactions={recentReactions}
      onSendReaction={onSendReaction}
    />
  );
}
