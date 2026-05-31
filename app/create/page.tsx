import Link from "next/link";
import { redirect } from "next/navigation";
import { createBattle } from "@/app/create/actions";
import { OptionUpload } from "@/components/option-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  missing_fields: "Bitte Titel und beide Optionen ausfüllen.",
  battle_limit: "Du hast bereits 5 aktive Battles. Schließe erst eines, bevor du ein neues erstellst.",
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
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Battle erstellen</CardTitle>
          <CardDescription>
            Titel plus zwei Optionen — Text oder Bild. Danach bekommst du einen shareable Link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <form action={createBattle} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Battle-Titel
              </label>
              <Input
                id="title"
                name="title"
                placeholder="z.B. Pizza vs Burger"
                required
                maxLength={120}
              />
            </div>

            <OptionUpload label="Option A" name="imageA" textName="optionA" position="A" />
            <OptionUpload label="Option B" name="imageB" textName="optionB" position="B" />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg">
                Battle veröffentlichen
              </Button>
              <Link href="/feed">
                <Button type="button" variant="outline" size="lg">
                  Feed ansehen
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
