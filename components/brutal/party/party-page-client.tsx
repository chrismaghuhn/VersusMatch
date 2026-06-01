"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PartyJoinScreen } from "@/components/brutal/party/screens/JoinScreen";

export function PartyPageClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roundCount, setRoundCount] = useState<3 | 5 | 7>(5);

  async function handleJoin(code: string) {
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      setError("Enter a 6-character room code.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const data = (await res.json()) as { roomId?: string; error?: string };

      if (!res.ok || !data.roomId) {
        setError(data.error ?? "Could not join room.");
        return;
      }

      router.push(`/party/room/${data.roomId}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/party/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundCount }),
      });
      const data = (await res.json()) as { roomId?: string; error?: string };

      if (!res.ok || !data.roomId) {
        setError(data.error ?? "Could not create room.");
        return;
      }

      router.push(`/party/room/${data.roomId}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error ? (
        <div className="border-b border-[#FF2D87]/40 bg-[#FF2D87]/10 px-6 py-3 text-center text-[#FF2D87]" style={{ fontSize: 13, fontWeight: 700 }}>
          {error}
        </div>
      ) : null}
      {busy ? (
        <div className="border-b border-white/10 bg-black px-6 py-2 text-center text-white/50" style={{ fontSize: 12 }}>
          Working…
        </div>
      ) : null}
      <PartyJoinScreen
        roundCount={roundCount}
        onRoundCountChange={setRoundCount}
        onJoin={handleJoin}
        onCreate={handleCreate}
      />
    </>
  );
}
