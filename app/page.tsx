import Link from "next/link";
import { BattleCard } from "@/components/battle-card";
import { Button } from "@/components/ui/button";
import { getActiveBattlesFeed } from "@/lib/battles";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Sparkles, Swords, Zap } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const battles = await getActiveBattlesFeed(supabase, 6);

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-secondary/60 to-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:py-24 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              A vs B Battles in Sekunden
            </div>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
              Erstelle Battles. Teile den Link. Sieh live, wer gewinnt.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              VersusApp ist das schnellste Tool für shareable Umfragen — Memes, Design, Food,
              Gaming. Voten ohne Account, Ergebnisse in Echtzeit.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/create">
                <Button size="lg" className="gap-2">
                  <Swords className="h-4 w-4" />
                  Battle erstellen
                </Button>
              </Link>
              <Link href="/feed">
                <Button size="lg" variant="outline" className="gap-2">
                  Feed ansehen
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Zap, title: "Kein Login zum Voten", text: "Link teilen, fertig." },
              { icon: Swords, title: "A vs B Layout", text: "Groß, klar, shareable." },
              { icon: Sparkles, title: "Live-Ergebnisse", text: "Votes in Echtzeit." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-4">
                <Icon className="mb-2 h-5 w-5 text-primary" />
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Aktuelle Battles</h2>
          <Link href="/feed" className="text-sm font-medium text-primary hover:underline">
            Alle ansehen
          </Link>
        </div>

        {battles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="font-medium">Noch keine Battles live</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Erstelle das erste Battle und teile den Link.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {battles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
