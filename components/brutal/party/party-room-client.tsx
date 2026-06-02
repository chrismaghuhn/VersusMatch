"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LobbyReactionFeedItem } from "@/components/brutal/party/lobby-reaction-bar";
import { PartyFinishedScreen } from "@/components/brutal/party/party-finished-screen";
import { PartyMobileCaption } from "@/components/brutal/party/mobile/PartyMobileCaption";
import { PartyDesktopCaption } from "@/components/brutal/party/desktop";
import { usePartyDesktop } from "@/lib/party/use-party-desktop";
import { PartyRevealScreen } from "@/components/brutal/party/party-reveal-screen";
import { PartyGuessScreen } from "@/components/brutal/party/party-guess-screen";
import { PartyTieScreen } from "@/components/brutal/party/party-tie-screen";
import { PartyVotingScreen } from "@/components/brutal/party/party-voting-screen";
import { RerollConfirmDialog } from "@/components/brutal/party/caption-studio/RerollConfirmDialog";
import { PartyLobbyScreen } from "@/components/brutal/party/screens/HostOnboarding";
import { PartyErrorState } from "@/components/brutal/party/party-error-state";
import { Shell } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY } from "@/lib/party/copy";
import { PARTY_MIN_PLAYERS } from "@/lib/party/constants";
import { decodePartyAvatar } from "@/lib/party/avatar";
import {
  isCaptionPhaseReady,
  isGuessPhaseReady,
  isVotingPhaseReady,
} from "@/lib/party/phase-ready";
import { usePartyRealtime } from "@/lib/party/realtime";
import { useEveryoneLeft } from "@/lib/party/use-everyone-left";
import { tryAdvancePhase, type AdvancePhaseGuards } from "@/lib/party/try-advance-phase";
import type { CaptionDocumentV3 } from "@/lib/party/caption-rich/types";
import type { PartySnapshot, PartyReactionKey } from "@/lib/party/types";
import {
  buildCaptionFromFieldTexts,
  fieldTextsFromSubmission,
} from "@/lib/party/caption-fields";
import type { CaptionSubmitPayload } from "@/lib/party/caption-submit";
import { getAppUrl } from "@/lib/utils";

type PartyRoomClientProps = {
  roomId: string;
};

const PARTY_ROOM_PHASES = [
  "waiting",
  "caption",
  "voting",
  "tie",
  "guess",
  "reveal",
  "finished",
] as const;

export function PartyRoomClient({ roomId }: PartyRoomClientProps) {
  const router = useRouter();
  const desktop = usePartyDesktop();
  const [snapshot, setSnapshot] = useState<PartySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [showRerollDraftHint, setShowRerollDraftHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [captionSubmitError, setCaptionSubmitError] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState(false);
  const [rerollConfirmOpen, setRerollConfirmOpen] = useState(false);
  const [rerollError, setRerollError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [guessing, setGuessing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [retractingVote, setRetractingVote] = useState(false);
  const [phaseTransitioning, setPhaseTransitioning] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);
  const [lobbyReactions, setLobbyReactions] = useState<LobbyReactionFeedItem[]>([]);
  const [disconnected, setDisconnected] = useState(false);
  const playersRef = useRef<PartySnapshot["players"]>([]);
  const snapshotRef = useRef<PartySnapshot | null>(null);
  const advancingRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasResetRef = useRef<
    ((revision: number, draft: CaptionDocumentV3 | null) => void) | null
  >(null);
  const hasCustomBoxesRef = useRef(false);
  const unknownPhaseRefreshRef = useRef(false);

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
        const sub = data.snapshot.mySubmission;
        const boxCount = data.snapshot.myTemplate?.textBoxes.length ?? 2;
        setCaptionDraft((prev) => {
          if (prev) return prev;
          return buildCaptionFromFieldTexts(fieldTextsFromSubmission(sub, boxCount));
        });
      }

      if (data.snapshot.room.phase === "waiting" || data.snapshot.room.phase === "reveal") {
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

  useEffect(() => {
    const p = snapshot?.room.phase;
    if (
      !p ||
      (PARTY_ROOM_PHASES as readonly string[]).includes(p)
    ) {
      unknownPhaseRefreshRef.current = false;
      return;
    }
    if (unknownPhaseRefreshRef.current) return;
    unknownPhaseRefreshRef.current = true;
    void refresh().finally(() => {
      unknownPhaseRefreshRef.current = false;
    });
  }, [snapshot?.room.phase, refresh]);

  const { isPending: everyoneLeftPending, isTriggered: everyoneLeft } =
    useEveryoneLeft(snapshot);

  const phase = snapshot?.room.phase ?? "waiting";
  const playerCount = snapshot?.players.length ?? 0;
  const captionCount = snapshot?.captionCount ?? 0;
  const votesCastCount = snapshot?.votesCastCount ?? 0;
  const authorGuessesCastCount = snapshot?.authorGuessesCastCount ?? 0;
  const eligibleGuesserCount = snapshot?.eligibleGuesserCount ?? 0;
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
    setCaptionSubmitError(null);
  }, [currentRound]);

  useEffect(() => {
    if (phase !== "caption" && phase !== "voting" && phase !== "guess") return;
    const snap = snapshotRef.current;
    if (!snap) return;
    if (phase === "caption" && !isCaptionPhaseReady(snap)) return;
    if (phase === "voting" && !isVotingPhaseReady(snap)) return;
    if (phase === "guess" && !isGuessPhaseReady(snap)) return;

    void runAdvance(snap);
  }, [
    roomId,
    phase,
    captionCount,
    votesCastCount,
    authorGuessesCastCount,
    eligibleGuesserCount,
    playerCount,
    runAdvance,
  ]);

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

  async function handleLobbyPollVote(optionIndex: number) {
    if (!snapshot?.room.id) return;
    try {
      const res = await fetch("/api/party/lobby-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: snapshot.room.id, optionIndex }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (!res.ok) throw new Error(data.error ?? "vote_failed");
      if (data.snapshot) setSnapshot(data.snapshot);
    } catch {
      /* poll is optional warmup — ignore transient errors */
    }
  }

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
        if (data.snapshot.room.phase === "waiting" || data.snapshot.room.phase === "reveal") {
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

  async function handleRematch() {
    setRematchError(null);
    setPhaseTransitioning(true);
    try {
      const res = await fetch("/api/party/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        snapshot?: PartySnapshot;
      };

      if (!res.ok || data.error) {
        setRematchError(
          data.error === "not_host"
            ? PARTY_COPY.finishedRematchNotHost
            : PARTY_COPY.finishedRematchError
        );
        return;
      }

      if (data.snapshot) {
        setSnapshot(data.snapshot);
        setLobbyReactions([]);
      }
    } catch {
      setRematchError(PARTY_COPY.finishedRematchError);
    } finally {
      setPhaseTransitioning(false);
    }
  }

  function requestReroll() {
    setRerollError(null);
    if (snapshot?.room.canvasEditorEnabled && hasCustomBoxesRef.current) {
      setRerollConfirmOpen(true);
      return;
    }
    void handleReroll();
  }

  async function handleReroll() {
    setRerolling(true);
    setRerollError(null);
    try {
      const res = await fetch("/api/party/reroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
        canvasResetRef.current?.(
          data.snapshot.layoutRevision,
          data.snapshot.captionDraft
        );
        setShowRerollDraftHint(true);
      } else if (data.error) {
        if (data.error === "no_rerolls_left") {
          setRerollError(PARTY_COPY.rerollNoBudget);
        } else {
          setRerollError(PARTY_COPY.working);
        }
      }
    } finally {
      setRerolling(false);
    }
  }

  function handleRerollConfirm() {
    setRerollConfirmOpen(false);
    void handleReroll();
  }

  function handleCaptionChange(value: string) {
    setCaptionDraft(value);
    setShowRerollDraftHint(false);
    setRerollError(null);
    setCaptionSubmitError(null);
  }

  async function handleSubmitCaption(payload: CaptionSubmitPayload) {
    setSubmitting(true);
    setCaptionSubmitError(null);
    try {
      const res = await fetch("/api/party/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          caption: payload.caption,
          ...(payload.captionRich ? { captionRich: payload.captionRich } : {}),
        }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
        setCaptionSubmitError(null);
        await runAdvance(data.snapshot);
      } else if (data.error) {
        const captionErrors = new Set([
          "modifier_violation",
          "invalid_caption",
          "stale_revision",
          "caption_rich_required",
          "profanity_rejected",
        ]);
        if (captionErrors.has(data.error)) {
          if (data.error === "modifier_violation" && snapshot?.room.currentModifier) {
            setCaptionSubmitError(PARTY_COPY.modifierViolation(snapshot.room.currentModifier));
          } else if (data.error === "stale_revision") {
            setCaptionSubmitError(PARTY_COPY.captionSubmitBlocked);
          } else {
            setCaptionSubmitError(PARTY_COPY.captionSubmitBlocked);
          }
        } else {
          setError(data.error);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetractCaption() {
    if (!snapshot) return;
    if (!captionDraft && snapshot.mySubmission) {
      const boxCount = snapshot.myTemplate?.textBoxes.length ?? 2;
      setCaptionDraft(
        buildCaptionFromFieldTexts(
          fieldTextsFromSubmission(snapshot.mySubmission, boxCount)
        )
      );
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

  async function handleGuess(guessedUserId: string) {
    setGuessing(true);
    try {
      const res = await fetch("/api/party/guess-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, guessedUserId }),
      });
      const data = (await res.json()) as { snapshot?: PartySnapshot; error?: string };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
        await runAdvance(data.snapshot);
      } else if (data.error) {
        setError(data.error);
      }
    } finally {
      setGuessing(false);
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
    return (
      <PartyLobbyScreen
        code={snapshot.room.code}
        roundCount={snapshot.room.roundCount as 3 | 5 | 7}
        rerollsPerPlayer={snapshot.room.rerollsPerPlayer}
        captionDurationSeconds={snapshot.room.captionDurationSeconds}
        isHost={isHost}
        canStart={isHost && snapshot.players.length >= minPlayers}
        players={snapshot.players.map((p) => {
          const avatar = decodePartyAvatar(p.avatarUrl);
          return {
            handle: p.isYou ? "you" : p.handle,
            avatarId: avatar.id,
            color: avatar.color,
            isHost: p.isHost,
          };
        })}
        recentReactions={lobbyReactions}
        onSendReaction={handleSendReaction}
        lobbyPoll={snapshot.lobbyPoll ?? null}
        onLobbyPollVote={handleLobbyPollVote}
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

    const registerHasCustomBoxes = (hasCustom: boolean) => {
      hasCustomBoxesRef.current = hasCustom;
    };

    return (
      <>
        <RerollConfirmDialog
          open={rerollConfirmOpen}
          onCancel={() => setRerollConfirmOpen(false)}
          onConfirm={handleRerollConfirm}
          title={PARTY_COPY.rerollCustomWarningTitle}
          body={PARTY_COPY.rerollCustomWarningBody}
          confirmLabel={PARTY_COPY.rerollCustomConfirm}
          cancelLabel={PARTY_COPY.rerollCustomCancel}
        />
        {desktop ? (
          <PartyDesktopCaption
            round={snapshot.room.currentRound}
            roundCount={snapshot.room.roundCount}
            phaseEndsAt={snapshot.room.phaseEndsAt}
            allReady={allReady}
            captionCount={snapshot.captionCount}
            playerCount={snapshot.players.length}
            value={captionDraft}
            onChange={handleCaptionChange}
            onSubmit={(payload) => void handleSubmitCaption(payload)}
            onReroll={requestReroll}
            onUnlock={() => void handleRetractCaption()}
            locked={locked}
            unlockDisabled={phaseTransitioning}
            unlocking={unlocking}
            submitting={submitting}
            rerolling={rerolling}
            rerollsRemaining={snapshot.myRerollsRemaining}
            showRerollDraftHint={showRerollDraftHint}
            rerollError={rerollError}
            statusMessage={statusMessage}
            template={snapshot.myTemplate}
            canvasEnabled={snapshot.room.canvasEditorEnabled}
            captionDurationSeconds={snapshot.room.captionDurationSeconds}
            layoutRevision={snapshot.layoutRevision}
            captionDraft={snapshot.captionDraft}
            roomId={roomId}
            onRegisterCanvasReset={(reset) => {
              canvasResetRef.current = reset;
            }}
            onRegisterHasCustomBoxes={registerHasCustomBoxes}
            currentModifier={snapshot.room.currentModifier}
            submitError={captionSubmitError}
          />
        ) : (
          <PartyMobileCaption
            round={snapshot.room.currentRound}
            roundCount={snapshot.room.roundCount}
            phaseEndsAt={snapshot.room.phaseEndsAt}
            allReady={allReady}
            captionCount={snapshot.captionCount}
            playerCount={snapshot.players.length}
            value={captionDraft}
            onChange={handleCaptionChange}
            onSubmit={(payload) => void handleSubmitCaption(payload)}
            onReroll={requestReroll}
            onUnlock={() => void handleRetractCaption()}
            locked={locked}
            unlockDisabled={phaseTransitioning}
            unlocking={unlocking}
            submitting={submitting}
            rerolling={rerolling}
            rerollsRemaining={snapshot.myRerollsRemaining}
            showRerollDraftHint={showRerollDraftHint}
            rerollError={rerollError}
            statusMessage={statusMessage}
            template={snapshot.myTemplate}
            canvasEnabled={snapshot.room.canvasEditorEnabled}
            layoutRevision={snapshot.layoutRevision}
            captionDraft={snapshot.captionDraft}
            roomId={roomId}
            onRegisterCanvasReset={(reset) => {
              canvasResetRef.current = reset;
            }}
            onRegisterHasCustomBoxes={registerHasCustomBoxes}
            currentModifier={snapshot.room.currentModifier}
            submitError={captionSubmitError}
          />
        )}
      </>
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

  if (snapshot.room.phase === "tie") {
    return <PartyTieScreen snapshot={snapshot} />;
  }

  if (snapshot.room.phase === "guess") {
    return (
      <PartyGuessScreen
        snapshot={snapshot}
        onGuess={handleGuess}
        guessing={guessing}
      />
    );
  }

  if (snapshot.room.phase === "reveal") {
    return (
      <PartyRevealScreen
        snapshot={snapshot}
        recentReactions={lobbyReactions}
        onSendReaction={handleSendReaction}
      />
    );
  }

  if (snapshot.room.phase === "finished") {
    return (
      <PartyFinishedScreen
        snapshot={snapshot}
        isHost={isHost}
        rematching={phaseTransitioning}
        rematchError={rematchError}
        onRematch={isHost ? handleRematch : undefined}
      />
    );
  }

  return (
    <Shell>
      <div className="px-6 py-20 text-center text-white/50">{PARTY_COPY.working}</div>
    </Shell>
  );
}
