import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PartyPageClient } from "@/components/brutal/party/party-page-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Party · MemeFight",
  description: "Live meme caption party game with friends.",
};

export default async function PartyPage() {
  if (process.env.PARTY_ENABLED !== "true") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-[#CCFF00]" style={{ fontWeight: 900, fontSize: 14, letterSpacing: "0.2em" }}>
          COMING SOON
        </p>
        <p className="mt-3 max-w-md text-white/50" style={{ fontSize: 15 }}>
          MemeFight Party ist in Vorbereitung.
        </p>
      </div>
    );
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

  return <PartyPageClient />;
}
