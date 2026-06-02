"use client";

import { PartyMobileGuess } from "@/components/brutal/party/mobile/PartyMobileGuess";
import { PartyDesktopGuess } from "@/components/brutal/party/desktop";
import { usePartyDesktop } from "@/lib/party/use-party-desktop";
import type { PartySnapshot } from "@/lib/party/types";

type PartyGuessScreenProps = {
  snapshot: PartySnapshot;
  onGuess: (guessedUserId: string) => Promise<void>;
  guessing?: boolean;
};

export function PartyGuessScreen(props: PartyGuessScreenProps) {
  const desktop = usePartyDesktop();
  if (desktop) {
    return <PartyDesktopGuess {...props} />;
  }
  return <PartyMobileGuess {...props} />;
}
