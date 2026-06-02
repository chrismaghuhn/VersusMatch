"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BoardBrawlPhase } from "@/lib/board-brawl/types";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

const FALLBACK_POLL_MS = 3_000;
const WAITING_POLL_MS = 2_500;
const IN_GAME_POLL_MS = 5_000;
const RESULTS_POLL_MS = 1_500;

type UseBoardBrawlRealtimeOptions = {
  roomId: string;
  phase: BoardBrawlPhase | null;
  onRefresh: () => void;
};

async function syncRealtimeAuth(supabase: ReturnType<typeof createSupabaseBrowser>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  await supabase.realtime.setAuth(session?.access_token ?? null);
}

export function useBoardBrawlRealtime({ roomId, phase, onRefresh }: UseBoardBrawlRealtimeOptions) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const refresh = useCallback(() => {
    onRefreshRef.current();
  }, []);

  useEffect(() => {
    void refresh();
    const pollMs =
      phase === "minigame_results"
        ? RESULTS_POLL_MS
        : phase === "waiting" || phase == null
          ? WAITING_POLL_MS
          : IN_GAME_POLL_MS;
    const pollTimer = window.setInterval(() => refresh(), pollMs);
    return () => window.clearInterval(pollTimer);
  }, [refresh, phase]);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let errorPollTimer: ReturnType<typeof setInterval> | null = null;

    const startErrorPoll = () => {
      if (errorPollTimer) return;
      errorPollTimer = setInterval(() => refresh(), FALLBACK_POLL_MS);
    };

    const stopErrorPoll = () => {
      if (!errorPollTimer) return;
      clearInterval(errorPollTimer);
      errorPollTimer = null;
    };

    async function connect() {
      await syncRealtimeAuth(supabase);
      if (cancelled) return;

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(`board-brawl:${roomId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "bb_rooms", filter: `id=eq.${roomId}` },
          () => refresh()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bb_players", filter: `room_id=eq.${roomId}` },
          () => refresh()
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            stopErrorPoll();
            refresh();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            startErrorPoll();
          }
        });
    }

    void connect();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void supabase.realtime.setAuth(session?.access_token ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      stopErrorPoll();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [roomId, refresh]);
}
