"use client";

import { useState } from "react";
import { Crown, Copy, Clock, Users } from "lucide-react";
import { LobbyReactionBar, type LobbyReactionFeedItem } from "@/components/brutal/party/lobby-reaction-bar";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import { CountChip, PartyBtn } from "@/components/brutal/party/shared/PartyPrimitives";
import { Avatar, type AvatarId } from "@/components/brutal/party/shared/Avatar";
import { PARTY_MAX_PLAYERS, PARTY_MIN_PLAYERS } from "@/lib/party/constants";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_DESIGN } from "@/lib/party/design";
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
  captionDurationSeconds?: number;
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
  captionDurationSeconds = 90,
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
  const accent = isHost ? "#FFB800" : PARTY_DESIGN.accent;

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
    <Shell accent={accent}>
      <PartyLayout
        accent={accent}
        regions={{
          eyebrow: (
            <span className="inline-flex items-center gap-2">
              <Crown className="inline h-3.5 w-3.5" />{" "}
              {isHost ? PARTY_COPY.lobbyHosting : PARTY_COPY.lobbyWaiting}
            </span>
          ),
          title: isHost ? (
            <>
              {PARTY_COPY.lobbyWelcomeHost}{" "}
              <span className="italic text-[#FFB800]">{PARTY_COPY.lobbyWelcomeHostAccent}</span>.
            </>
          ) : (
            <>
              {PARTY_COPY.lobbyWelcomeGuest}{" "}
              <span className="italic text-[#CCFF00]">{PARTY_COPY.lobbyWelcomeGuestAccent}</span>.
            </>
          ),
          subtitle: PARTY_COPY.lobbyShare(minPlayers),
          headRight: <CountChip ready={joined} max={maxPlayers} accent={accent} />,
          main: (
            <div className="flex flex-col gap-5">
              <div className="border border-[#FFB800]/40 bg-gradient-to-br from-[#FFB800]/10 via-black to-black p-8">
                <Meta color={accent}>━━ {PARTY_COPY.lobbyRoomCode}</Meta>
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
              </div>
              <div>
                <Meta color="rgba(255,255,255,0.4)">
                  IN THE LOBBY · {joined}
                </Meta>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {players.map((p, i) => (
                    <div
                      key={i}
                      className={"border-2 " + (p.isHost ? "border-[#FFB800]" : "border-white/20")}
                      title={p.handle}
                    >
                      <Avatar id={p.avatarId} color={p.color} size={40} />
                    </div>
                  ))}
                  <span className="text-white/50" style={{ fontSize: 12 }}>
                    {PARTY_COPY.lobbyPlayers(joined, maxPlayers, need)}
                  </span>
                </div>
              </div>
            </div>
          ),
          asides: [
            {
              label: PARTY_COPY.lobbySettings,
              node: (
                <div>
                  <SettingRow icon={<Clock className="h-4 w-4" />} label={PARTY_COPY.lobbyCaptionTimer} value={`${captionDurationSeconds}s`} />
                  <SettingRow icon={<Clock className="h-4 w-4" />} label={PARTY_COPY.lobbyVoteTimer} value="30s" />
                  <SettingRow
                    icon={<Users className="h-4 w-4" />}
                    label={PARTY_COPY.lobbyPlayersSetting}
                    value={`${minPlayers}–${maxPlayers}`}
                  />
                  <SettingRow
                    icon={<Users className="h-4 w-4" />}
                    label={PARTY_COPY.lobbyRoundsSetting}
                    value={String(roundCount)}
                  />
                  <SettingRow
                    icon={<Users className="h-4 w-4" />}
                    label={PARTY_COPY.lobbyRerollsSetting}
                    value={String(rerollsPerPlayer)}
                  />
                  {designPreview && (
                    <p className="mt-4 text-white/40" style={{ fontSize: 11, lineHeight: 1.5 }}>
                      Design export also mocks template pick, NSFW, spectators — out of P1 scope.
                    </p>
                  )}
                </div>
              ),
            },
            {
              label: "REACTIONS",
              node: <LobbyReactionBar recent={feed} onSend={handleReaction} />,
            },
          ],
          actions: isHost ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div className="border border-white/10 bg-[#0a0a0a] p-5">
                <div className="text-white" style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>
                  {PARTY_COPY.lobbyReady}
                </div>
                <div className="mt-1 text-white/50" style={{ fontSize: 12 }}>
                  {canStart ? PARTY_COPY.lobbyStartReady : PARTY_COPY.lobbyStartNeed(minPlayers)}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <PartyBtn
                  accent={PARTY_DESIGN.accent}
                  disabled={!canStart}
                  onClick={onStartGame}
                  className="sm:min-w-[180px]"
                >
                  {PARTY_COPY.lobbyStart} →
                </PartyBtn>
                {onLeave ? (
                  <PartyBtn kind="ghost" accent={accent} onClick={onLeave} className="sm:w-auto sm:px-6">
                    {PARTY_COPY.lobbyLeave}
                  </PartyBtn>
                ) : null}
              </div>
            </div>
          ) : onLeave ? (
            <PartyBtn kind="ghost" accent={accent} onClick={onLeave} className="max-w-xs">
              {PARTY_COPY.lobbyLeave}
            </PartyBtn>
          ) : null,
        }}
      />
    </Shell>
  );
}

function SettingRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2 text-white/60">
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em" }}>{label}</span>
      </div>
      <span className="font-mono text-white" style={{ fontSize: 12, fontWeight: 800 }}>
        {value}
      </span>
    </div>
  );
}

export function HostOnboarding() {
  return <PartyLobbyScreen designPreview canStart={false} />;
}
