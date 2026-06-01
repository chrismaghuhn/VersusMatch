"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { PartyPhase, PartyReactionKey } from "@/lib/party/types";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export type PartyReactionInsert = {
  id: string;
  userId: string;
  reactionKey: PartyReactionKey;
};

type UsePartyRealtimeOptions = {
  phase: PartyPhase;
  onRefresh: () => void;
  onReactionInsert?: (reaction: PartyReactionInsert) => void;
  onLeaveWaiting?: () => void;
};

function attachRoomFilter(
  channel: RealtimeChannel,
  roomId: string,
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  callback: (payload?: unknown) => void
) {
  channel.on(
    "postgres_changes",
    {
      event,
      schema: "public",
      table,
      filter: table === "party_rooms" ? `id=eq.${roomId}` : `room_id=eq.${roomId}`,
    },
    callback
  );
}

function buildChannel(
  supabase: ReturnType<typeof createSupabaseBrowser>,
  roomId: string,
  phase: PartyPhase,
  options: UsePartyRealtimeOptions
) {
  const channel = supabase.channel(`party:${roomId}`);

  attachRoomFilter(channel, roomId, "party_rooms", "UPDATE", (payload) => {
    const next = (payload as { new?: { phase?: string } }).new?.phase;
    if (next && next !== "waiting") {
      options.onLeaveWaiting?.();
    }
    options.onRefresh();
  });

  attachRoomFilter(channel, roomId, "party_players", "INSERT", () => {
    options.onRefresh();
  });

  attachRoomFilter(channel, roomId, "party_players", "UPDATE", () => {
    options.onRefresh();
  });

  attachRoomFilter(channel, roomId, "party_players", "DELETE", () => {
    options.onRefresh();
  });

  if (phase === "waiting") {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "party_reactions",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row = (payload as { new: Record<string, string> }).new;
        if (!row?.id || !row.user_id || !row.reaction_key) return;
        options.onReactionInsert?.({
          id: row.id,
          userId: row.user_id,
          reactionKey: row.reaction_key as PartyReactionKey,
        });
      }
    );
  }

  if (phase === "voting" || phase === "reveal" || phase === "finished") {
    attachRoomFilter(channel, roomId, "party_submissions", "*", () => {
      options.onRefresh();
    });
  }

  if (phase === "reveal" || phase === "finished") {
    attachRoomFilter(channel, roomId, "party_round_results", "*", () => {
      options.onRefresh();
    });
  }

  channel.subscribe();
  return channel;
}

async function syncRealtimeAuth(supabase: ReturnType<typeof createSupabaseBrowser>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  await supabase.realtime.setAuth(session?.access_token ?? null);
}

export function usePartyRealtime(roomId: string, options: UsePartyRealtimeOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const teardownRef = useRef<(() => void) | null>(null);

  const teardown = useCallback(() => {
    teardownRef.current?.();
    teardownRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowser();
    let channel: RealtimeChannel | null = null;

    async function connect() {
      await syncRealtimeAuth(supabase);
      if (cancelled) return;

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      channel = buildChannel(supabase, roomId, optionsRef.current.phase, {
        phase: optionsRef.current.phase,
        onRefresh: () => optionsRef.current.onRefresh(),
        onReactionInsert: (r) => optionsRef.current.onReactionInsert?.(r),
        onLeaveWaiting: () => optionsRef.current.onLeaveWaiting?.(),
      });
    }

    void connect();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void supabase.realtime.setAuth(session?.access_token ?? null);
    });

    teardownRef.current = () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
      teardownRef.current = null;
    };
  }, [roomId, options.phase]);

  return { teardownRealtime: teardown };
}
