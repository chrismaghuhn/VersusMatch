"use client";

import { PARTY_COPY } from "@/lib/party/copy";
import type { LobbyPollSnapshot } from "@/lib/party/lobby-polls";

type LobbyWarmupPollProps = {
  poll: LobbyPollSnapshot;
  disabled?: boolean;
  onVote: (optionIndex: number) => void;
};

export function LobbyWarmupPoll({ poll, disabled = false, onVote }: LobbyWarmupPollProps) {
  const total = poll.tallies.reduce((sum, n) => sum + n, 0);
  const voted = poll.myOptionIndex != null;

  return (
    <section className="mt-4 border border-white/10 bg-black/40 p-4">
      <div
        className="text-[#00E1FF]"
        style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em" }}
      >
        {PARTY_COPY.lobbyPollTitle}
      </div>
      <p className="mt-2 text-white" style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>
        {poll.question}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {poll.options.map((label, index) => {
          const count = poll.tallies[index] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const selected = poll.myOptionIndex === index;
          return (
            <button
              key={label}
              type="button"
              disabled={disabled || voted}
              onClick={() => onVote(index)}
              className={`relative overflow-hidden border px-3 py-2.5 text-left transition min-h-[44px] ${
                selected
                  ? "border-[#CCFF00] text-[#CCFF00]"
                  : "border-white/20 text-white/80 hover:border-[#CCFF00]/60"
              } disabled:cursor-default`}
            >
              {total > 0 ? (
                <span
                  className="absolute inset-y-0 left-0 bg-[#CCFF00]/15"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              ) : null}
              <span className="relative flex items-center justify-between gap-2">
                <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
                <span className="text-white/40" style={{ fontSize: 11, fontWeight: 700 }}>
                  {total > 0 ? `${pct}%` : voted ? "" : PARTY_COPY.lobbyPollVote}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {voted ? (
        <p className="mt-2 text-white/40" style={{ fontSize: 11, fontWeight: 700 }}>
          {PARTY_COPY.lobbyPollVoted}
        </p>
      ) : null}
    </section>
  );
}
