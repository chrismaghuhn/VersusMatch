"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameLayout } from "@/components/brutal/board-brawl/hud/GameLayout";
import { DiceRollOverlay } from "@/components/brutal/board-brawl/hud/DiceRollOverlay";
import { BB_COPY } from "@/lib/board-brawl/copy";
import { useBoardBrawlRealtime } from "@/lib/board-brawl/realtime";
import type { BoardBrawlSnapshot, ItemId } from "@/lib/board-brawl/types";
import { getMinigameTickInterval } from "@/lib/board-brawl/minigames/registry";
import { getAppUrl } from "@/lib/utils";

const SceneCanvas = dynamic(
  () =>
    import("@/components/brutal/board-brawl/three/SceneCanvas").then((m) => m.SceneCanvas),
  { ssr: false }
);

type BoardBrawlRoomClientProps = {
  roomId: string;
};

export function BoardBrawlRoomClient({ roomId }: BoardBrawlRoomClientProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<BoardBrawlSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const lastRollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/board-brawl/rooms/${roomId}`);
      if (!res.ok) {
        setError((await res.json()).error ?? "not_found");
        return;
      }
      const data = (await res.json()) as BoardBrawlSnapshot;
      const nextRoll = data.room.lastRoll;
      if (nextRoll != null && nextRoll !== lastRollRef.current) {
        lastRollRef.current = nextRoll;
        setDiceRoll(nextRoll);
      }
      setSnapshot(data);
    } catch {
      setError("network_error");
    }
  }, [roomId]);

  useBoardBrawlRealtime({
    roomId,
    phase: snapshot?.room.phase ?? null,
    onRefresh: refresh,
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
      if (!gl) setWebglError(true);
    } catch {
      setWebglError(true);
    }
  }, []);

  useEffect(() => {
    const beat = () => {
      void fetch("/api/board-brawl/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      }).then(() => refresh());
    };
    beat();
    const interval = setInterval(beat, 20_000);
    return () => clearInterval(interval);
  }, [roomId, refresh]);

  useEffect(() => {
    if (snapshot?.room.phase !== "minigame_results") return;
    const interval = setInterval(() => void refresh(), 1_500);
    return () => clearInterval(interval);
  }, [snapshot?.room.phase, refresh]);

  const lastPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const phase = snapshot?.room.phase ?? null;
    if (phase && phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase;
      setError(null);
    }
  }, [snapshot?.room.phase]);

  useEffect(() => {
    if (!snapshot || snapshot.room.phase !== "minigame") return;
    const me = snapshot.players.find((p) => p.userId === snapshot.self.userId);
    if (!me?.isHost || !snapshot.room.minigameId) return;

    const ms = getMinigameTickInterval(snapshot.room.minigameId);
    const interval = setInterval(() => {
      void fetch("/api/board-brawl/minigame/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      }).then(() => refresh());
    }, ms);
    return () => clearInterval(interval);
  }, [snapshot, roomId, refresh]);

  const post = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, ...body }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "invalid_action");
          return;
        }
        await refresh();
      } catch {
        setError("network_error");
      } finally {
        setBusy(false);
      }
    },
    [roomId, refresh]
  );

  useEffect(() => {
    if (!snapshot || snapshot.room.phase !== "minigame") return;
    const id = snapshot.room.minigameId;
    if (id !== "button_mash" && id !== "relay_dash") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" && event.key !== " ") return;
      event.preventDefault();
      const type = id === "relay_dash" ? "boost" : "tap";
      void post("/api/board-brawl/minigame/input", { type, payload: {} });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [snapshot, post]);

  if (webglError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <p>{BB_COPY.webglUnsupported}</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        {BB_COPY.loading}
      </div>
    );
  }

  return (
    <GameLayout
      snapshot={snapshot}
      busy={busy}
      error={error}
      viewport={
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-white/40">{BB_COPY.loading}</div>
          }
        >
          <div className="relative h-full w-full">
            <SceneCanvas
              phase={snapshot.room.phase}
              snapshot={snapshot}
              onMinigameInput={(type, payload) => {
                void post("/api/board-brawl/minigame/input", { type, payload });
              }}
            />
            <DiceRollOverlay roll={diceRoll} />
          </div>
        </Suspense>
      }
      onRoll={() => post("/api/board-brawl/take-turn", { turnNonce: crypto.randomUUID() })}
      onBuyStar={() => post("/api/board-brawl/buy-star", {})}
      onSkipShop={() => post("/api/board-brawl/skip-shop", {})}
      onStart={() => post("/api/board-brawl/start", {})}
      onToggleReady={() =>
        post("/api/board-brawl/ready", {
          ready: !snapshot.players.find((p) => p.userId === snapshot.self.userId)?.ready,
        })
      }
      onMinigameTap={() => {
        const id = snapshot.room.minigameId;
        if (id === "button_mash") void post("/api/board-brawl/minigame/input", { type: "tap", payload: {} });
        if (id === "relay_dash") void post("/api/board-brawl/minigame/input", { type: "boost", payload: {} });
      }}
      onCopyLink={() => {
        const url = getAppUrl(`/board-brawl/join/${snapshot.room.code}`);
        void navigator.clipboard.writeText(url);
      }}
      onUseItem={(itemId: ItemId) => {
        void post("/api/board-brawl/use-item", { itemId });
      }}
      onSelectTarget={(targetUserId: string) => {
        void post("/api/board-brawl/use-item", { targetUserId });
      }}
      onLeave={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/board-brawl/leave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId }),
          });
          if (res.ok) router.push("/board-brawl");
          else setError(((await res.json()) as { error?: string }).error ?? "invalid_action");
        } catch {
          setError("network_error");
        } finally {
          setBusy(false);
        }
      }}
      onRematch={() => post("/api/board-brawl/rematch", {})}
      footer={
        snapshot.room.phase === "finished" ? (
          <div className="border-t border-white/10 bg-black px-4 py-3 text-center">
            <button
              type="button"
              onClick={() => router.push("/board-brawl")}
              className="bg-[#CCFF00] px-8 py-3 font-extrabold text-black"
            >
              {BB_COPY.backToLobby}
            </button>
          </div>
        ) : null
      }
    />
  );
}
