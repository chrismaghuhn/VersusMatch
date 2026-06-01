"use client";

import { useState } from "react";
import { Crown, Copy, Clock, Users } from "lucide-react";
import { LobbyReactionBar, type LobbyReactionFeedItem } from "@/components/brutal/party/lobby-reaction-bar";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { Avatar, type AvatarId } from "@/components/brutal/party/shared/Avatar";
import { PARTY_MAX_PLAYERS, PARTY_MIN_PLAYERS } from "@/lib/party/constants";
import { PARTY_COPY } from "@/lib/party/copy";
import type { PartyReactionKey } from "@/lib/party/types";

export type PartyLobbyPlayer = {
  handle: string;
  avatarId: AvatarId;
  color: string;
  isHost?: boolean;
};

export type PartyLobbyScreenProps = {
  code?: string;
  players?: PartyLobbyPlayer[];
  roundCount?: 3 | 5 | 7;
  rerollsPerPlayer?: number;
  minPlayers?: number;
  maxPlayers?: number;
  isHost?: boolean;
  canStart?: boolean;
  recentReactions?: LobbyReactionFeedItem[];
  onSendReaction?: (key: PartyReactionKey) => void;
  onCopyLink?: () => void;
  onStartGame?: () => void;
  onLeave?: () => void;
  /** Show extended host playbook from design export */
  designPreview?: boolean;
};

const DEFAULT_PLAYERS: PartyLobbyPlayer[] = [
  { handle: "?", avatarId: "gremlin", color: "#1a1a1a" },
  { handle: "?", avatarId: "skull", color: "#1a1a1a" },
  { handle: "you", avatarId: "crown", color: "#FFB800", isHost: true },
];

export function PartyLobbyScreen({
  code = "ABC123",
  players = DEFAULT_PLAYERS,
  roundCount = 5,
  rerollsPerPlayer = 0,
  minPlayers = PARTY_MIN_PLAYERS,
  maxPlayers = PARTY_MAX_PLAYERS,
  isHost = true,
  canStart = false,
  recentReactions = [],
  onSendReaction,
  onCopyLink,
  onStartGame,
  onLeave,
  designPreview = false,
}: PartyLobbyScreenProps) {
  const [localReactions, setLocalReactions] = useState<LobbyReactionFeedItem[]>(recentReactions);
  const feed = onSendReaction ? recentReactions : localReactions;
  const joined = players.length;
  const need = Math.max(0, minPlayers - joined);

  function handleReaction(key: PartyReactionKey) {
    if (onSendReaction) {
      onSendReaction(key);
      return;
    }
    setLocalReactions((prev) => [
      { id: `${Date.now()}`, handle: "you", reactionKey: key },
      ...prev,
    ].slice(0, 20));
  }

  return (
    <Shell>
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 border border-[#FFB800] bg-[#FFB800]/15 px-3 py-1.5 text-[#FFB800]"
            style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em" }}
          >
            <Crown className="h-3.5 w-3.5" /> {isHost ? PARTY_COPY.lobbyHosting : PARTY_COPY.lobbyWaiting}
          </div>
          <h1
            className="mt-3 text-white"
            style={{ fontWeight: 900, fontSize: "clamp(40px, 6vw, 80px)", letterSpacing: "-0.05em", lineHeight: 0.9 }}
          >
            {isHost ? (
              <>
                {PARTY_COPY.lobbyWelcomeHost}{" "}
                <span className="italic text-[#FFB800]">{PARTY_COPY.lobbyWelcomeHostAccent}</span>.
              </>
            ) : (
              <>
                {PARTY_COPY.lobbyWelcomeGuest}{" "}
                <span className="italic text-[#CCFF00]">{PARTY_COPY.lobbyWelcomeGuestAccent}</span>.
              </>
            )}
          </h1>
          <p className="mt-3 max-w-2xl text-white/60" style={{ fontSize: 15, lineHeight: 1.5 }}>
            {PARTY_COPY.lobbyShare(minPlayers)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="border border-[#FFB800]/40 bg-gradient-to-br from-[#FFB800]/10 via-black to-black p-8">
            <Meta color="#FFB800">━━ {PARTY_COPY.lobbyRoomCode}</Meta>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div className="flex gap-1.5">
                {code.split("").map((c, i) => (
                  <div
                    key={i}
                    className="flex h-20 w-14 items-center justify-center border-2 border-[#FFB800] bg-[#FFB800]/15 text-[#FFB800]"
                    style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 40 }}
                  >
                    {c}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onCopyLink}
                className="flex items-center gap-2 bg-[#FFB800] px-5 py-3 text-black hover:bg-white"
                style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}
              >
                <Copy className="h-3.5 w-3.5" /> {PARTY_COPY.lobbyCopyLink}
              </button>
            </div>
            <p className="mt-5 text-white/60" style={{ fontSize: 13, lineHeight: 1.5 }}>
              {PARTY_COPY.lobbyStartHint(minPlayers, need)}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                {players.map((p, i) => (
                  <div
                    key={i}
                    className={"border-2 " + (p.isHost ? "border-[#FFB800]" : "border-white/20")}
                  >
                    <Avatar id={p.avatarId} color={p.color} size={32} />
                  </div>
                ))}
              </div>
              <div className="text-white/50" style={{ fontSize: 12 }}>
                {PARTY_COPY.lobbyPlayers(joined, maxPlayers, need)}
              </div>
            </div>

            <div className="mt-6">
              <LobbyReactionBar recent={feed} onSend={handleReaction} />
            </div>
          </div>

          <div className="border border-white/10 bg-black p-6">
            <Meta>{PARTY_COPY.lobbySettings}</Meta>
            <div className="mt-4 space-y-3">
              <SettingRow icon={<Clock className="h-4 w-4" />} label={PARTY_COPY.lobbyCaptionTimer} value="60s" />
              <SettingRow icon={<Clock className="h-4 w-4" />} label={PARTY_COPY.lobbyVoteTimer} value="30s" />
              <SettingRow icon={<Users className="h-4 w-4" />} label={PARTY_COPY.lobbyPlayersSetting} value={`${minPlayers}–${maxPlayers}`} />
              <SettingRow icon={<Users className="h-4 w-4" />} label={PARTY_COPY.lobbyRoundsSetting} value={String(roundCount)} />
              <SettingRow icon={<Users className="h-4 w-4" />} label={PARTY_COPY.lobbyRerollsSetting} value={String(rerollsPerPlayer)} />
            </div>
            {designPreview && (
              <p className="mt-4 text-white/40" style={{ fontSize: 11, lineHeight: 1.5 }}>
                Design export also mocks template pick, NSFW, spectators — out of P1 scope.
              </p>
            )}
          </div>
        </div>

        {isHost && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#0a0a0a] p-5">
            <div>
              <div className="text-white" style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>
                {PARTY_COPY.lobbyReady}
              </div>
              <div className="mt-1 text-white/50" style={{ fontSize: 12 }}>
                {canStart ? PARTY_COPY.lobbyStartReady : PARTY_COPY.lobbyStartNeed(minPlayers)}
              </div>
            </div>
            <button
              type="button"
              disabled={!canStart}
              onClick={onStartGame}
              className="bg-[#CCFF00] px-6 py-3 text-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em" }}
            >
              {PARTY_COPY.lobbyStart}
            </button>
          </div>
        )}

        {onLeave ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onLeave}
              className="border border-white/20 px-5 py-2.5 text-white/60 hover:border-[#FF2D87]/50 hover:text-[#FF2D87]"
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}
            >
              {PARTY_COPY.lobbyLeave}
            </button>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

function SettingRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border border-white/5 bg-[#0a0a0a] px-3 py-2.5 hover:border-white/20">
      <div className="flex items-center gap-2 text-white/60">
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em" }}>{label}</span>
      </div>
      <span className="text-white" style={{ fontSize: 12, fontWeight: 800 }}>
        {value}
      </span>
    </div>
  );
}

export function HostOnboarding() {
  return <PartyLobbyScreen designPreview canStart={false} />;
}
