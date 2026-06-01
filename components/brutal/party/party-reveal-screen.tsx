"use client";

import { PartyMobileReveal } from "@/components/brutal/party/mobile/PartyMobileReveal";
import { PartyDesktopReveal } from "@/components/brutal/party/desktop";
import { usePartyDesktop } from "@/lib/party/use-party-desktop";
import type { PartySnapshot } from "@/lib/party/types";

type PartyRevealScreenProps = {
  snapshot: PartySnapshot;
};

export function PartyRevealScreen({ snapshot }: PartyRevealScreenProps) {
  const desktop = usePartyDesktop();
  if (desktop) {
    return <PartyDesktopReveal snapshot={snapshot} />;
  }
  return <PartyMobileReveal snapshot={snapshot} />;
}
