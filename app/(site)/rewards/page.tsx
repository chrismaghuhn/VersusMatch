import { redirect } from "next/navigation";
import { RewardsPageContent } from "@/components/rewards-page-content";
import { createClient } from "@/lib/supabase/server";

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?returnTo=/rewards");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <div className="mb-8">
        <h1
          className="text-white"
          style={{ fontWeight: 900, fontSize: 36, letterSpacing: "-0.04em" }}
        >
          Rewards
        </h1>
        <p className="mt-2 text-white/50">
          Fight streak, battle pass tiers, and badges — one season at a time.
        </p>
      </div>

      <RewardsPageContent />
    </div>
  );
}
