import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { partyJoinRoomRpc } from "@/lib/supabase/party-rpc";
import { parsePartyRpc } from "@/lib/party/rpc-response";

export const metadata: Metadata = {
  title: "Join Party · MemeFight",
};

type PageProps = { params: Promise<{ code: string }> };

export default async function PartyJoinCodePage({ params }: PageProps) {
  if (process.env.PARTY_ENABLED !== "true") {
    redirect("/party");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const returnTo = `/party/join/${normalized}`;

  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const { data, error } = await partyJoinRoomRpc(supabase, normalized);
  if (error) {
    redirect(`/party?error=join_failed`);
  }

  const result = parsePartyRpc(data);
  if (!result.ok || !result.room_id) {
    redirect(`/party?error=${result.error ?? "bad_code"}`);
  }

  redirect(`/party/room/${result.room_id}`);
}
