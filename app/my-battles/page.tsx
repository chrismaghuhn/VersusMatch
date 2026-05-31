import Link from "next/link";
import { redirect } from "next/navigation";
import { closeBattle, deleteBattle } from "@/app/my-battles/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCreatorBattles } from "@/lib/battles";
import { getCategoryLabel } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export default async function MyBattlesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; closed?: string; deleted?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/my-battles");
  }

  const params = await searchParams;
  const battles = await getCreatorBattles(supabase, user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meine Battles</h1>
          <p className="mt-2 text-muted-foreground">Verwalte, schließe oder lösche deine Battles.</p>
        </div>
        <Link href="/create">
          <Button>Neues Battle</Button>
        </Link>
      </div>

      {params.closed === "1" && (
        <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">Battle geschlossen — Voting beendet.</p>
      )}
      {params.deleted === "1" && (
        <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">Battle gelöscht.</p>
      )}
      {params.error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Aktion fehlgeschlagen.
        </p>
      )}

      {battles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-lg font-medium">Noch keine Battles</p>
          <Link href="/create" className="mt-6 inline-block">
            <Button>Erstes Battle erstellen</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {battles.map((battle) => (
            <Card key={battle.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/b/${battle.slug}`} className="font-semibold hover:underline">
                      {battle.title}
                    </Link>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {battle.status === "active" ? "Aktiv" : "Geschlossen"}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {getCategoryLabel(battle.category)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {battle.total_votes} Votes · /b/{battle.slug}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {battle.status === "active" && (
                    <form action={closeBattle}>
                      <input type="hidden" name="battleId" value={battle.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Schließen
                      </Button>
                    </form>
                  )}
                  <form action={deleteBattle}>
                    <input type="hidden" name="battleId" value={battle.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Löschen
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
