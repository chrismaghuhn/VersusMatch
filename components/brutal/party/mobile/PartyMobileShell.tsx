"use client";

import type { ReactNode } from "react";
import { PartyPhaseTimer } from "@/components/brutal/party/party-phase-timer";
import { Shell } from "@/components/brutal/party/shared/Shell";

type PartyMobileShellProps = {
  round: number;
  roundCount: number;
  phaseLabel: string;
  phaseEndsAt: string | null;
  accent?: string;
  allReady?: boolean;
  layoutFrozen?: boolean;
  progressLabel?: string;
  footer?: ReactNode;
  children: ReactNode;
  embedded?: boolean;
};

export function PartyMobileShell({
  round,
  roundCount,
  phaseLabel,
  phaseEndsAt,
  accent = "#CCFF00",
  allReady = false,
  layoutFrozen = false,
  progressLabel,
  footer,
  children,
  embedded = false,
}: PartyMobileShellProps) {
  const inner = (
    <div
      className={
        embedded
          ? "flex h-full flex-col bg-black"
          : "mx-auto flex min-h-dvh max-w-lg flex-col bg-black md:min-h-[80vh] md:border-x md:border-white/10"
      }
    >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: accent }}
            />
            <span
              className="text-white/60"
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em" }}
            >
              RUNDE {round}/{roundCount} · {phaseLabel}
            </span>
          </div>
          <PartyPhaseTimer
            phaseEndsAt={phaseEndsAt}
            accent={accent}
            allReady={allReady}
            frozen={layoutFrozen}
          />
        </div>

        {progressLabel ? (
          <p className="border-b border-white/5 px-4 py-2 text-white/50" style={{ fontSize: 12 }}>
            {progressLabel}
          </p>
        ) : null}

        <div className="flex flex-1 flex-col">{children}</div>

        {footer ? (
          <div className="mt-auto border-t border-white/10 p-3">{footer}</div>
        ) : null}
    </div>
  );

  if (embedded) return inner;

  return <Shell>{inner}</Shell>;
}
