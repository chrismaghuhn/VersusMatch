"use client";

import { useEffect, useRef, useState } from "react";
import { PARTY_COPY } from "@/lib/party/copy";

export function usePhaseCountdown(
  phaseEndsAt: string | null,
  frozen = false
): string | null {
  const [label, setLabel] = useState<string | null>(null);
  const labelRef = useRef<string | null>(null);

  useEffect(() => {
    if (!phaseEndsAt) {
      labelRef.current = null;
      setLabel(null);
      return;
    }

    const endsAt = new Date(phaseEndsAt).getTime();
    if (Number.isNaN(endsAt)) {
      labelRef.current = null;
      setLabel(null);
      return;
    }

    function tick() {
      const remainingMs = Math.max(0, endsAt - Date.now());
      const totalSec = Math.ceil(remainingMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const nextLabel = `${min}:${sec.toString().padStart(2, "0")}`;
      if (!frozen) {
        labelRef.current = nextLabel;
        setLabel(nextLabel);
      } else if (labelRef.current === null) {
        labelRef.current = nextLabel;
        setLabel(nextLabel);
      }
    }

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phaseEndsAt, frozen]);

  return label;
}

type PartyPhaseTimerProps = {
  phaseEndsAt: string | null;
  accent?: string;
  allReady?: boolean;
  frozen?: boolean;
};

export function PartyPhaseTimer({
  phaseEndsAt,
  accent = "#CCFF00",
  allReady = false,
  frozen = false,
}: PartyPhaseTimerProps) {
  const label = usePhaseCountdown(phaseEndsAt, frozen);

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
