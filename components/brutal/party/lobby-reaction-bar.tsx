"use client";

import { Meta } from "@/components/brutal/party/shared/Shell";
import {
  PARTY_REACTION_EMOJI,
  PARTY_REACTION_KEYS,
  type PartyReactionKey,
} from "@/lib/party/types";

export type LobbyReactionFeedItem = {
  id: string;
  handle: string;
  reactionKey: PartyReactionKey;
};

type LobbyReactionBarProps = {
  recent?: LobbyReactionFeedItem[];
  onSend?: (key: PartyReactionKey) => void;
  disabled?: boolean;
};

/** Lobby-only reactions — SpectatorMode button row, no counts, live feed below. */
export function LobbyReactionBar({
  recent = [],
  onSend,
  disabled = false,
}: LobbyReactionBarProps) {
  return (
    <div className="border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Meta>YOUR REACTION</Meta>
        <span className="text-white/40" style={{ fontSize: 11 }}>
          while you wait
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {PARTY_REACTION_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled || !onSend}
            onClick={() => onSend?.(key)}
            aria-label={key}
            className="border border-white/10 bg-black px-4 py-2.5 transition hover:border-[#CCFF00] hover:bg-[#CCFF00]/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span style={{ fontSize: 18 }}>{PARTY_REACTION_EMOJI[key]}</span>
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <ul
          className="mt-3 max-h-28 space-y-1 overflow-y-auto border-t border-white/10 pt-3"
          aria-live="polite"
        >
          {recent.map((item) => (
            <li
              key={item.id}
              className="text-white/70"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              <span className="text-white">@{item.handle}</span>{" "}
              {PARTY_REACTION_EMOJI[item.reactionKey]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
