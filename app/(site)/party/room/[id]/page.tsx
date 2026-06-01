import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PartyRoomClient } from "@/components/brutal/party/party-room-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Party Room · MemeFight",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function PartyRoomPage({ params }: PageProps) {
  if (process.env.PARTY_ENABLED !== "true") {
    redirect("/party");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?returnTo=/party");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding?returnTo=/party");
  }

  const { id } = await params;
  return <PartyRoomClient roomId={id} />;
}
