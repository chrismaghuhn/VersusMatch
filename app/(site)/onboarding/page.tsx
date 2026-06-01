import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PartyOnboardingForm } from "@/components/brutal/party/party-onboarding-form";
import { sanitizeReturnPath } from "@/lib/sanitize-return-path";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profil einrichten · MemeFight Party",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { returnTo: returnToParam } = await searchParams;
  const returnTo = sanitizeReturnPath(returnToParam, "/party");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) {
    redirect(returnTo);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PartyOnboardingForm />
    </Suspense>
  );
}
