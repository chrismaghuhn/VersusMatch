"use client";

import { useState } from "react";
import { Crown, Copy, EllipsisVertical } from "lucide-react";
import { LobbyReactionBar, type LobbyReactionFeedItem } from "@/components/brutal/party/lobby-reaction-bar";
import { LobbySettingsForm, type LobbySettingsDraft } from "@/components/brutal/party/lobby-settings-form";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { PartyLayout } from "@/components/brutal/party/shared/PartyLayout";
import { CountChip, PartyBtn } from "@/components/brutal/party/shared/PartyPrimitives";
import { Avatar, type AvatarId } from "@/components/brutal/party/shared/Avatar";
import { PARTY_MAX_PLAYERS, PARTY_MIN_PLAYERS } from "@/lib/party/constants";
import { LobbyWarmupPoll } from "@/components/brutal/party/lobby-warmup-poll";
import { PARTY_COPY } from "@/lib/party/copy";
import type { LobbyPollSnapshot } from "@/lib/party/lobby-polls";
import { PARTY_DESIGN } from "@/lib/party/design";
import type { PartyReactionKey } from "@/lib/party/types";

export type PartyLobbyPlayer = {
  userId: string;
  handle: string;
  avatarId: AvatarId;
  color: string;
  isHost?: boolean;
};

export type PartyLobbyScreenProps = {
  code?: string;
  players?: PartyLobbyPlayer[];
  settingsDraft?: LobbySettingsDraft;
  settingsSaving?: boolean;
  settingsError?: string | null;
  maxPlayersBlocked?: boolean;
  phase?: "waiting" | "caption" | "voting" | "tie" | "guess" | "reveal" | "finished";
  minPlayers?: number;
  maxPlayers?: number;
  isHost?: boolean;
  canStart?: boolean;
  recentReactions?: LobbyReactionFeedItem[];
  onSendReaction?: (key: PartyReactionKey) => void;
  onCopyLink?: () => void;
  onStartGame?: () => void;
  onLeave?: () => void;
  onSettingsDraftChange?: (draft: LobbySettingsDraft) => void;
  onSaveSettings?: () => void;
  onKickPlayer?: (userId: string, blockRejoin: boolean) => void;
  lobbyPoll?: LobbyPollSnapshot | null;
  onLobbyPollVote?: (optionIndex: number) => void;
  lobbyPollBusy?: boolean;
  /** Show extended host playbook from design export */
  designPreview?: boolean;
};

const DEFAULT_PLAYERS: PartyLobbyPlayer[] = [
  { userId: "p-1", handle: "?", avatarId: "gremlin", color: "#1a1a1a" },
  { userId: "p-2", handle: "?", avatarId: "skull", color: "#1a1a1a" },
  { userId: "you", handle: "you", avatarId: "crown", color: "#FFB800", isHost: true },
];

export function PartyLobbyScreen({
  code = "ABC123",
  players = DEFAULT_PLAYERS,
  settingsDraft = {
    captionDurationSeconds: 90,
    voteDurationSeconds: 30,
    maxPlayers: 8,
    roundCount: 5,
    rerollsPerPlayer: 2,
    canvasEditorEnabled: true,
    roundModifiersEnabled: false,
    authorGuessEnabled: true,
  },
  settingsSaving = false,
  settingsError = null,
  maxPlayersBlocked = false,
  phase = "waiting",
  minPlayers = PARTY_MIN_PLAYERS,
  maxPlayers = PARTY_MAX_PLAYERS,
  isHost = true,
  canStart = false,
  recentReactions = [],
  onSendReaction,
  onCopyLink,
  onStartGame,
  onLeave,
  onSettingsDraftChange,
  onSaveSettings,
  onKickPlayer,
  lobbyPoll = null,
  onLobbyPollVote,
  lobbyPollBusy = false,
  designPreview: _designPreview = false, // design-only prop remains for preview entrypoint compatibility
}: PartyLobbyScreenProps) {
  void _designPreview;
  const [localReactions, setLocalReactions] = useState<LobbyReactionFeedItem[]>(recentReactions);
  const feed = onSendReaction ? recentReactions : localReactions;
  const [kickTarget, setKickTarget] = useState<{ userId: string; handle: string } | null>(null);
  const [blockRejoin, setBlockRejoin] = useState(false);
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
                      className={
                        "relative border-2 pr-7 " + (p.isHost ? "border-[#FFB800]" : "border-white/20")
                      }
                      title={p.handle}
                    >
                      <Avatar id={p.avatarId} color={p.color} size={40} />
                      {isHost && phase === "waiting" && !p.isHost && onKickPlayer ? (
                        <button
                          type="button"
                          onClick={() => setKickTarget({ userId: p.userId, handle: p.handle })}
                          className="absolute -right-6 top-1/2 -translate-y-1/2 border border-white/20 bg-black p-1 text-white/70 transition hover:border-white/50 hover:text-white"
                          aria-label={`Kick @${p.handle}`}
                        >
                          <EllipsisVertical className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <span className="text-white/50" style={{ fontSize: 12 }}>
                    {PARTY_COPY.lobbyPlayers(joined, maxPlayers, need)}
                  </span>
                </div>
              </div>
              {lobbyPoll && onLobbyPollVote ? (
                <LobbyWarmupPoll
                  poll={lobbyPoll}
                  disabled={lobbyPollBusy}
                  onVote={onLobbyPollVote}
                />
              ) : null}
            </div>
          ),
          asides: [
            {
              label: PARTY_COPY.lobbySettings,
              node: (
                <LobbySettingsForm
                  readOnly={!isHost}
                  draft={settingsDraft}
                  onChange={(next) => onSettingsDraftChange?.(next)}
                  onSave={onSaveSettings}
                  saving={settingsSaving}
                  saveError={settingsError}
                  maxPlayersBlocked={maxPlayersBlocked}
                />
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
      {kickTarget && onKickPlayer ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md border-2 border-[#FF2D87] bg-[#0a0a0a] p-5">
            <h3 className="text-white" style={{ fontWeight: 900, fontSize: 18 }}>
              {PARTY_COPY.lobbyKick}
            </h3>
            <p className="mt-2 text-white/70" style={{ fontSize: 13 }}>
              {PARTY_COPY.lobbyKickConfirm(kickTarget.handle)}
            </p>
            <label className="mt-4 flex items-center gap-2 text-white/80" style={{ fontSize: 12 }}>
              <input
                type="checkbox"
                checked={blockRejoin}
                onChange={(e) => setBlockRejoin(e.target.checked)}
              />
              {PARTY_COPY.lobbyKickBlock}
            </label>
            <div className="mt-5 flex gap-2">
              <PartyBtn
                kind="ghost"
                onClick={() => {
                  setKickTarget(null);
                  setBlockRejoin(false);
                }}
              >
                Cancel
              </PartyBtn>
              <PartyBtn
                kind="pink"
                onClick={() => {
                  onKickPlayer(kickTarget.userId, blockRejoin);
                  setKickTarget(null);
                  setBlockRejoin(false);
                }}
              >
                {PARTY_COPY.lobbyKick}
              </PartyBtn>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

export function HostOnboarding() {
  return <PartyLobbyScreen designPreview canStart={false} />;
}
