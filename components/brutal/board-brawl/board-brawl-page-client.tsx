"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BB_COPY, bbErrorMessage } from "@/lib/board-brawl/copy";

export function BoardBrawlPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [roundCount, setRoundCount] = useState<3 | 5 | 7>(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoJoinAttempted = useRef(false);

  const join = useCallback(
    async (joinCode: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/board-brawl/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
        });
        const data = (await res.json()) as { roomId?: string; error?: string };
        if (!res.ok || !data.roomId) {
          setError(data.error ?? "could_not_join_room");
          return;
        }
        router.push(`/board-brawl/room/${data.roomId}`);
      } catch {
        setError("network_error");
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (!joinCode || joinCode.length < 6) return;
    const normalized = joinCode.toUpperCase();
    setCode(normalized);
    if (autoJoinAttempted.current) return;
    autoJoinAttempted.current = true;
    void join(normalized);
  }, [searchParams, join]);

  async function createRoom() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/board-brawl/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundCount }),
      });
      const data = (await res.json()) as { roomId?: string; error?: string };
      if (!res.ok || !data.roomId) {
        setError(data.error ?? "could_not_create_room");
        return;
      }
      router.push(`/board-brawl/room/${data.roomId}`);
    } catch {
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-white">
      <h1 className="mb-2 text-[#CCFF00]" style={{ fontWeight: 900, fontSize: 32, letterSpacing: "-0.04em" }}>
        {BB_COPY.title}
      </h1>
      <p className="mb-8 text-white/50">Private 3D board game · 2–8 players</p>

      {error ? (
        <p className="mb-4 bg-[#FF2D87] px-3 py-2 text-sm font-bold">{bbErrorMessage(error)}</p>
      ) : null}

      <div className="mb-8 space-y-4 border border-white/10 p-6">
        <label className="block text-sm font-bold text-white/60">Join code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="w-full border border-white/20 bg-black px-3 py-2 font-mono text-lg text-white"
          placeholder="ABC123"
        />
        <button
          type="button"
          disabled={busy || code.length < 6}
          onClick={() => join(code)}
          className="w-full bg-white py-3 font-extrabold text-black disabled:opacity-40"
        >
          {BB_COPY.joinRoom}
        </button>
      </div>

      <div className="space-y-4 border border-white/10 p-6">
        <label className="block text-sm font-bold text-white/60">Rounds</label>
        <select
          value={roundCount}
          onChange={(e) => setRoundCount(Number(e.target.value) as 3 | 5 | 7)}
          className="w-full border border-white/20 bg-black px-3 py-2 text-white"
        >
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={7}>7</option>
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={createRoom}
          className="w-full bg-[#CCFF00] py-3 font-extrabold text-black disabled:opacity-40"
        >
          {BB_COPY.createRoom}
        </button>
      </div>
    </div>
  );
}
