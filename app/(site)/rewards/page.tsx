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
    <div className="bg-black">
      <RewardsPageContent />
    </div>
  );
}
