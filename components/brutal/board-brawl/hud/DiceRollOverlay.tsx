"use client";

import { useEffect, useState } from "react";

type DiceRollOverlayProps = {
  roll: number | null;
};

export function DiceRollOverlay({ roll }: DiceRollOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);

  useEffect(() => {
    if (roll == null) return;
    setDisplayRoll(roll);
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 800);
    return () => window.clearTimeout(timer);
  }, [roll]);

  if (!visible || displayRoll == null) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        className="border-4 border-[#CCFF00] bg-black/90 px-10 py-6 text-[#CCFF00] shadow-lg"
        style={{ fontWeight: 900, fontSize: 56, fontFamily: "ui-monospace, monospace" }}
      >
        {displayRoll}
      </div>
    </div>
  );
}
