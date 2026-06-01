"use client";

import { useEffect, useState } from "react";
import { PARTY_COPY } from "@/lib/party/copy";

export function usePhaseCountdown(phaseEndsAt: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!phaseEndsAt) {
      setLabel(null);
      return;
    }

    const endsAt = new Date(phaseEndsAt).getTime();
    if (Number.isNaN(endsAt)) {
      setLabel(null);
      return;
    }

    function tick() {
      const remainingMs = Math.max(0, endsAt - Date.now());
      const totalSec = Math.ceil(remainingMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      setLabel(`${min}:${sec.toString().padStart(2, "0")}`);
    }

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phaseEndsAt]);

  return label;
}

type PartyPhaseTimerProps = {
  phaseEndsAt: string | null;
  accent?: string;
  allReady?: boolean;
};

export function PartyPhaseTimer({
  phaseEndsAt,
  accent = "#CCFF00",
  allReady = false,
}: PartyPhaseTimerProps) {
  const label = usePhaseCountdown(phaseEndsAt);

  if (allReady) {
    return (
      <span
        className="text-[#CCFF00]"
        style={{
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: "0.1em",
        }}
      >
        {PARTY_COPY.timerAllReady}
      </span>
    );
  }

  if (!label) return null;

  return (
    <span
      style={{
        fontFamily: "ui-monospace, monospace",
        fontWeight: 900,
        fontSize: 14,
        color: accent,
      }}
    >
      {label}
    </span>
  );
}
