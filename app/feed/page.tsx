import Link from "next/link";
import { BattleCard } from "@/components/battle-card";
import { Button } from "@/components/ui/button";
import { getActiveBattlesFeed } from "@/lib/battles";
import { createClient } from "@/lib/supabase/server";

export default async function FeedPage() {
  const supabase = await createClient();
  const battles = await getActiveBattlesFeed(supabase, 24);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aktive Battles</h1>
          <p className="mt-2 text-muted-foreground">
            Stöbere durch laufende A-vs-B Umfragen und gib deine Stimme ab.
          </p>
        </div>
        <Link href="/create">
          <Button>Battle erstellen</Button>
        </Link>
      </div>

      {battles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-lg font-medium">Noch keine Battles</p>
          <p className="mt-2 text-muted-foreground">Sei der Erste und starte ein Battle.</p>
          <Link href="/create" className="mt-6 inline-block">
            <Button>Jetzt erstellen</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {battles.map((battle) => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      )}
    </div>
  );
}
