"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PartyErrorState } from "@/components/brutal/party/party-error-state";
import { PartyTutorialOverlay } from "@/components/brutal/party/party-tutorial-overlay";
import { PartyJoinScreen } from "@/components/brutal/party/screens/JoinScreen";
import { PARTY_COPY } from "@/lib/party/copy";

const TUTORIAL_STORAGE_KEY = "memefight_party_tutorial_v1";

function PartyPageClientInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");

  const [joinCreateError, setJoinCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roundCount, setRoundCount] = useState<3 | 5 | 7>(5);
  const [rerollsPerPlayer, setRerollsPerPlayer] = useState(0);
  const [roundModifiersEnabled, setRoundModifiersEnabled] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(true);

  useEffect(() => {
    setRerollsPerPlayer((prev) => Math.min(prev, roundCount));
  }, [roundCount]);

  useEffect(() => {
    setTutorialSeen(localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1");
  }, []);

  const activeError = queryError ?? joinCreateError;

  const dismissTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
    setTutorialSeen(true);
  }, []);

  const clearJoinCreateError = useCallback(() => {
    setJoinCreateError(null);
    if (queryError) {
      router.replace("/party");
    }
  }, [queryError, router]);

  async function handleJoin(code: string) {
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      setJoinCreateError("join_code_invalid");
      return;
    }

    setBusy(true);
    setJoinCreateError(null);

    try {
      const res = await fetch("/api/party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const data = (await res.json()) as { roomId?: string; error?: string };

      if (!res.ok || !data.roomId) {
        setJoinCreateError(data.error ?? "could_not_join_room");
        return;
      }

      router.push(`/party/room/${data.roomId}`);
    } catch {
      setJoinCreateError("network_error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    setBusy(true);
    setJoinCreateError(null);

    try {
      const res = await fetch("/api/party/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundCount,
          rerollsPerPlayer,
          canvasEditorEnabled: true,
          roundModifiersEnabled,
        }),
      });
      const data = (await res.json()) as { roomId?: string; error?: string };

      if (!res.ok || !data.roomId) {
        setJoinCreateError(data.error ?? "could_not_create_room");
        return;
      }

      router.push(`/party/room/${data.roomId}`);
    } catch {
      setJoinCreateError("network_error");
    } finally {
      setBusy(false);
    }
  }

  if (activeError) {
    return (
      <PartyErrorState
        code={activeError === "join_code_invalid" ? "bad_code" : activeError}
        onRetry={clearJoinCreateError}
      />
    );
  }

  const showTutorial = !tutorialSeen && !activeError;

  return (
    <>
      {showTutorial ? <PartyTutorialOverlay onDismiss={dismissTutorial} /> : null}
      {busy ? (
        <div className="border-b border-white/10 bg-black px-6 py-2 text-center text-white/50" style={{ fontSize: 12 }}>
          {PARTY_COPY.working}
        </div>
      ) : null}
      <PartyJoinScreen
        roundCount={roundCount}
        onRoundCountChange={setRoundCount}
        rerollsPerPlayer={rerollsPerPlayer}
        onRerollsPerPlayerChange={setRerollsPerPlayer}
        roundModifiersEnabled={roundModifiersEnabled}
        onRoundModifiersEnabledChange={setRoundModifiersEnabled}
        onJoin={handleJoin}
        onCreate={handleCreate}
      />
      <p className="border-t border-white/10 bg-black py-4 text-center text-white/40" style={{ fontSize: 12 }}>
        Meme templates —{" "}
        <Link href="/credits" className="text-[#CCFF00] transition hover:text-white">
          Credits
        </Link>
      </p>
    </>
  );
}

export function PartyPageClient() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-20 text-center text-white/50">{PARTY_COPY.working}</div>
      }
    >
      <PartyPageClientInner />
    </Suspense>
  );
}
