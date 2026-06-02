import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PartyJoinTeaser } from "@/components/brutal/party/screens/PartyJoinTeaser";
import { getCachedPartyPeek } from "@/lib/party/peek-room";
import { parsePartyRpc } from "@/lib/party/rpc-response";
import { createClient } from "@/lib/supabase/server";
import { partyJoinRoomRpc } from "@/lib/supabase/party-rpc";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const peek = await getCachedPartyPeek(normalized);
  if (!peek.ok) {
    return { title: "Join Party · MemeFight" };
  }
  return {
    title: `Join @${peek.hostHandle}'s Party · MemeFight`,
    description: `${peek.playerCount}/${peek.maxPlayers} players · Live meme caption game`,
  };
}

export default async function PartyJoinCodePage({ params }: PageProps) {
  if (process.env.PARTY_ENABLED !== "true") {
    redirect("/party");
  }

  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const returnTo = `/party/join/${normalized}`;
  const peek = await getCachedPartyPeek(normalized);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (peek.ok && (peek.inGame || peek.isFinished)) {
    return <PartyJoinTeaser peek={peek} code={normalized} isLoggedIn={Boolean(user)} />;
  }

  if (!user) {
    return <PartyJoinTeaser peek={peek} code={normalized} isLoggedIn={false} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
  }

  if (!peek.ok || peek.inGame) {
    return <PartyJoinTeaser peek={peek} code={normalized} isLoggedIn />;
  }

  const { data, error } = await partyJoinRoomRpc(supabase, normalized);
  if (error) {
    redirect(`/party?error=join_failed`);
  }

  const result = parsePartyRpc(data);
  if (!result.ok || !result.room_id) {
    if (result.error === "banned_from_room") {
      redirect("/party?error=banned_from_room");
    }
    redirect(`/party?error=${result.error ?? "bad_code"}`);
  }

  redirect(`/party/room/${result.room_id}`);
}
