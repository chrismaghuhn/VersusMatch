import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BoardBrawlRoomClient } from "@/components/brutal/board-brawl/board-brawl-room-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Board Brawl Room · MemeFight",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function BoardBrawlRoomPage({ params }: PageProps) {
  if (process.env.BOARD_BRAWL_ENABLED !== "true") {
    redirect("/board-brawl");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { id } = await params;
  const returnTo = encodeURIComponent(`/board-brawl/room/${id}`);

  if (!user) {
    redirect(`/auth/login?returnTo=${returnTo}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect(`/onboarding?returnTo=${returnTo}`);
  }

  return <BoardBrawlRoomClient roomId={id} />;
}
