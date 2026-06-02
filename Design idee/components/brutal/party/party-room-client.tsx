"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LobbyReactionFeedItem } from "@/components/brutal/party/lobby-reaction-bar";
import { PartyFinishedScreen } from "@/components/brutal/party/party-finished-screen";
import { PartyMobileCaption } from "@/components/brutal/party/mobile/PartyMobileCaption";
import { PartyRevealScreen } from "@/components/brutal/party/party-reveal-screen";
import { PartyVotingScreen } from "@/components/brutal/party/party-voting-screen";
import { PartyLobbyScreen } from "@/components/brutal/party/screens/HostOnboarding";
import { PartyErrorState } from "@/components/brutal/party/party-error-state";
import { Shell } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_MIN_PLAYERS } from "@/lib/party/constants";
import { decodePartyAvatar } from "@/lib/party/avatar";
import { isCaptionPhaseReady, isVotingPhaseReady } from "@/lib/party/phase-ready";
import { usePartyRealtime } from "@/lib/party/realtime";
import { useEveryoneLeft } from "@/lib/party/use-everyone-left";
import { tryAdvancePhase, type AdvancePhaseGuards } from "@/lib/party/try-advance-phase";
import type { PartySnapshot, PartyReactionKey } from "@/lib/party/types";
import { getAppUrl } from "@/lib/utils";

type PartyRoomClientProps = {
  roomId: string;
};

export function PartyRoomClient({ roomId }: PartyRoomClientProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PartySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [showRerollDraftHint, setShowRerollDraftHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [voting, setVoting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [retractingVote, setRetractingVote] = useState(false);
  const [phaseTransitioning, setPhaseTransitioning] = useState(false);
  const [lobbyReactions, setLobbyReactions] = useState<LobbyReactionFeedItem[]>([]);
  const [disconnected, setDisconnected] = useState(false);
  const playersRef = useRef<PartySnapshot["players"]>([]);
  const snapshotRef = useRef<PartySnapshot | null>(null);
  const advancingRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceGuardsRef = useRef<AdvancePhaseGuards>({
    advancingRef,
    cooldownUntilRef,
    cooldownTimerRef,
  });
  advanceGuardsRef.current = { advancingRef, cooldownUntilRef, cooldownTimerRef };

  const runAdvance = useCallback(
    async (snap: PartySnapshot | null, options?: { forceTimer?: boolean }) => {
      if (!snap) return snap;
      setPhaseTransitioning(true);
      try {
        const result = await tryAdvancePhase(
          roomId,
          snap,
          advanceGuardsRef.current,
          options
        );
        if (result.snapshot) {
          setSnapshot(result.snapshot);
          return result.snapshot;
        }
        return snap;
      } finally {
        setPhaseTransitioning(false);
      }
    },
    [roomId]
  );

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/party/rooms/${roomId}`, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "could_not_load_room");
        return;
      }
      const data = (await res.json()) as { snapshot: PartySnapshot };
      setSnapshot(data.snapshot);
      playersRef.current = data.snapshot.players;
      setError(null);

      if (data.snapshot.mySubmission) {
        setCaptionDraft((prev) => prev || data.snapshot.mySubmission!.caption);
      }

      if (data.snapshot.room.phase === "waiting") {
        setLobbyReactions(
          data.snapshot.recentReactions.map((r) => ({
            id: r.id,
            handle: r.handle,
            reactionKey: r.reactionKey,
          }))
        );
      }
    } catch {
      setError("network_error");
    }
  }, [roomId]);

  const { isPending: everyoneLeftPending, isTriggered: everyoneLeft } =
    useEveryoneLeft(snapshot);

  const phase = snapshot?.room.phase ?? "waiting";
  const playerCount = snapshot?.players.length ?? 0;
  const captionCount = snapshot?.captionCount ?? 0;
  const votesCastCount = snapshot?.votesCastCount ?? 0;
  const phaseEndsAt = snapshot?.room.phaseEndsAt ?? null;
  const currentRound = snapshot?.room.currentRound ?? 0;

  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!showRerollDraftHint) return;
    const timer = window.setTimeout(() => setShowRerollDraftHint(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showRerollDraftHint]);

  useEffect(() => {
    setCaptionDraft("");
    setShowRerollDraftHint(false);
  }, [currentRound]);

  useEffect(() => {
    if (phase !== "caption" && phase !== "voting") return;
    const snap = snapshotRef.current;
    if (!snap) return;
    if (phase === "caption" && !isCaptionPhaseReady(snap)) return;
    if (phase === "voting" && !isVotingPhaseReady(snap)) return;

    void runAdvance(snap);
  }, [roomId, phase, captionCount, votesCastCount, playerCount, runAdvance]);

  useEffect(() => {
    if (!phaseEndsAt) return;
    const endsAt = new Date(phaseEndsAt).getTime();
    if (Number.isNaN(endsAt)) return;

    const tick = window.setInterval(() => {
      const snap = snapshotRef.current;
      if (Date.now() >= endsAt && snap) {
        void runAdvance(snap, { forceTimer: true });
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [phaseEndsAt, roomId, runAdvance]);

  const { teardownRealtime } = usePartyRealtime(roomId, {
    phase,
    onRefresh: () => void refresh(),
    onLeaveWaiting: () => setLobbyReactions([]),
    onChannelError: () => setDisconnected(true),
    onReactionInsert: (reaction) => {
      setLobbyReactions((prev) => {
        const handle =
          playersRef.current.find((p) => p.userId === reaction.userId)?.handle ?? "?";
        return [
          { id: reaction.id, handle, reactionKey: reaction.reactionKey },
          ...prev,
        ].slice(0, 20);
      });
    },
  });

  useEffect(() => {
    function handleOnline() {
      setDisconnected(false);
      void refresh();
    }
    function handleOffline() {
      setDisconnected(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) {
      setDisconnected(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const pollMs = phase === "waiting" ? 2500 : 8000;
    const poll = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(poll);
  }, [refresh, phase]);

  useEffect(() => {
    const beat = window.setInterval(() => {
      void fetch("/api/party/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
    }, 20_000);

    void fetch("/api/party/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });

    return () => window.clearInterval(beat);
  }, [roomId]);

  async function handleSendReaction(key: PartyReactionKey) {
    const res = await fetch("/api/party/reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, reactionKey: key }),
    });
    if (res.ok) {
      const data = (await res.json()) as { snapshot?: PartySnapshot };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
        if (data.snapshot.room.phase === "waiting") {
          setLobbyReactions(
            data.snapshot.recentReactions.map((r) => ({
              id: r.id,
              handle: r.handle,
              reactionKey: r.reactionKey,
            }))
          );
        }
      }
    }
  }

  async function handleStartGame() {
    teardownRealtime();
    setLobbyReactions([]);

    const res = await fetch("/api/party/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { snapshot?: PartySnapshot };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      } else {
        void refresh();
      }
    }
  }

  async function handleReroll() {
    setRerolling(true);
    try {
      const res = await fetch("/api/party/reroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
        setShowRerollDraftHint(true);
      } else if (data.error) {
        setError(data.error);
      }
    } finally {
      setRerolling(false);
    }
  }

  function handleCaptionChange(value: string) {
    setCaptionDraft(value);
    setShowRerollDraftHint(false);
  }

  async function handleSubmitCaption() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/party/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, caption: captionDraft }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
        await runAdvance(data.snapshot);
      } else if (data.error) {
        setError(data.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetractCaption() {
    if (!snapshot) return;
    if (!captionDraft && snapshot.mySubmission?.caption) {
      setCaptionDraft(snapshot.mySubmission.caption);
    }

    setUnlocking(true);
    try {
      const res = await fetch("/api/party/retract-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      } else if (data.error) {
        setError(data.error);
      }
    } finally {
      setUnlocking(false);
    }
  }

  async function handleVote(submissionId: string) {
    setVoting(true);
    try {
      const res = await fetch("/api/party/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, submissionId }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
        await runAdvance(data.snapshot);
      } else if (data.error) {
        setError(data.error);
      }
    } finally {
      setVoting(false);
    }
  }

  async function handleRetractVote() {
    setRetractingVote(true);
    try {
      const res = await fetch("/api/party/retract-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      } else if (data.error) {
        setError(data.error);
      }
    } finally {
      setRetractingVote(false);
    }
  }

  async function handleLeaveLobby() {
    teardownRealtime();
    const res = await fetch("/api/party/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    if (res.ok) {
      router.push("/party");
      return;
    }
    void refresh();
  }

  function handleCopyLink() {
    if (!snapshot) return;
    const url = getAppUrl(`/party/join/${snapshot.room.code}`);
    void navigator.clipboard.writeText(url);
  }

  if (disconnected && snapshot) {
    return <PartyErrorState code="disconnected" roomCode={snapshot.room.code} />;
  }

  if (everyoneLeft && snapshot) {
    return <PartyErrorState code="everyone_left" />;
  }

  if (error && !snapshot) {
    return (
      <PartyErrorState
        code={error}
        onRetry={() => {
          setError(null);
          void refresh();
        }}
      />
    );
  }

  if (!snapshot) {
    return (
      <Shell>
        <div className="px-6 py-20 text-center text-white/50">{PARTY_COPY.loadingRoom}</div>
      </Shell>
    );
  }

  if (everyoneLeftPending && snapshot.room.status === "in_progress") {
    return (
      <Shell>
        <div className="px-6 py-20 text-center text-white/50">{PARTY_COPY.checkingConnection}</div>
      </Shell>
    );
  }

  const me = snapshot.players.find((p) => p.isYou);
  const isHost = me?.isHost ?? false;
  const minPlayers = PARTY_MIN_PLAYERS;

  if (snapshot.room.phase === "waiting") {
    const settingsDraft = {
      captionDurationSeconds: snapshot.room.captionDurationSeconds,
      voteDurationSeconds: snapshot.room.voteDurationSeconds as 20 | 30 | 45,
      maxPlayers: snapshot.room.maxPlayers,
      roundCount: snapshot.room.roundCount as 3 | 5 | 7,
      rerollsPerPlayer: snapshot.room.rerollsPerPlayer,
      canvasEditorEnabled: snapshot.room.canvasEditorEnabled,
      roundModifiersEnabled: snapshot.room.roundModifiersEnabled,
      authorGuessEnabled: snapshot.room.authorGuessEnabled,
    };
    return (
      <PartyLobbyScreen
        code={snapshot.room.code}
        phase={snapshot.room.phase}
        settingsDraft={settingsDraft}
        maxPlayers={snapshot.room.maxPlayers}
        isHost={isHost}
        canStart={isHost && snapshot.players.length >= minPlayers}
        players={snapshot.players.map((p) => {
          const avatar = decodePartyAvatar(p.avatarUrl);
          return {
            userId: p.userId,
            handle: p.isYou ? "you" : p.handle,
            avatarId: avatar.id,
            color: avatar.color,
            isHost: p.isHost,
          };
        })}
        recentReactions={lobbyReactions}
        onSendReaction={handleSendReaction}
        onCopyLink={handleCopyLink}
        onStartGame={handleStartGame}
        onLeave={handleLeaveLobby}
      />
    );
  }

  if (snapshot.room.phase === "caption") {
    const locked = Boolean(snapshot.mySubmission);
    const allReady = isCaptionPhaseReady(snapshot);
    const statusMessage = locked
      ? phaseTransitioning
        ? PARTY_COPY.captionPhaseChanging
        : allReady
          ? PARTY_COPY.captionAllReady
          : PARTY_COPY.captionLockedIn
      : null;

    return (
      <PartyMobileCaption
        round={snapshot.room.currentRound}
        roundCount={snapshot.room.roundCount}
        phaseEndsAt={snapshot.room.phaseEndsAt}
        allReady={allReady}
        captionCount={snapshot.captionCount}
        playerCount={snapshot.players.length}
        value={captionDraft}
        onChange={handleCaptionChange}
        onSubmit={() => void handleSubmitCaption()}
        onReroll={() => void handleReroll()}
        onUnlock={() => void handleRetractCaption()}
        locked={locked}
        unlockDisabled={phaseTransitioning}
        unlocking={unlocking}
        submitting={submitting}
        rerolling={rerolling}
        rerollsRemaining={snapshot.myRerollsRemaining}
        showRerollDraftHint={showRerollDraftHint}
        statusMessage={statusMessage}
        template={snapshot.myTemplate}
      />
    );
  }

  if (snapshot.room.phase === "voting") {
    return (
      <PartyVotingScreen
        snapshot={snapshot}
        onVote={handleVote}
        onRetractVote={handleRetractVote}
        voting={voting}
        retracting={retractingVote}
        retractDisabled={phaseTransitioning}
        phaseTransitioning={phaseTransitioning}
      />
    );
  }

  if (snapshot.room.phase === "reveal") {
    return <PartyRevealScreen snapshot={snapshot} />;
  }

  return (
    <PartyFinishedScreen
      snapshot={snapshot}
      isHost={isHost}
      rematching={false}
      rematchError={null}
    />
  );
}
