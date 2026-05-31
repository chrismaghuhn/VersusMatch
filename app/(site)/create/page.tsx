import Link from "next/link";
import { redirect } from "next/navigation";
import { createBattle } from "@/app/(site)/create/actions";
import { BATTLE_CATEGORIES } from "@/lib/categories";
import { OptionUpload } from "@/components/option-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  missing_fields: "Please fill in the title and both options.",
  battle_limit: "You already have 5 active battles. Close one before creating a new one.",
  imageA_upload_failed: "Failed to upload image for Option A. Please try again.",
  imageB_upload_failed: "Failed to upload image for Option B. Please try again.",
  imageA_invalid_type: "Option A: JPEG, PNG, or WebP only (max. 2MB).",
  imageB_invalid_type: "Option B: JPEG, PNG, or WebP only (max. 2MB).",
  imageA_too_large: "Image A is larger than 2MB.",
  imageB_too_large: "Image B is larger than 2MB.",
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/create");
  }

  const params = await searchParams;
  const errorMessage = params.error
    ? (errorMessages[params.error] ?? decodeURIComponent(params.error))
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <Card className="border-white/10 bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-white">Create Battle</CardTitle>
          <CardDescription>
            Title plus two options — text or image. Then you get a shareable link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <p className="mb-4 border border-[#FF2D87]/40 bg-[#FF2D87]/10 px-4 py-3 text-sm text-[#FF2D87]">
              {errorMessage}
            </p>
          )}
          <form action={createBattle} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-white/60">
                Battle Title
              </label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Pizza vs Burger"
                required
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-white/60">
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue="general"
                className="flex h-10 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]"
              >
                {BATTLE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <OptionUpload label="Option A" name="imageA" textName="optionA" position="A" />
            <OptionUpload label="Option B" name="imageB" textName="optionB" position="B" />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg">
                Publish Battle
              </Button>
              <Link href="/feed">
                <Button type="button" variant="outline" size="lg">
                  View Feed
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
