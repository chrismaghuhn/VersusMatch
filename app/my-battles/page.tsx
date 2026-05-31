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
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-white"
            style={{ fontWeight: 900, fontSize: 36, letterSpacing: "-0.04em" }}
          >
            My Battles
          </h1>
          <p className="mt-2 text-white/50">Manage, close, or delete your battles.</p>
        </div>
        <Link href="/create">
          <Button>New Battle</Button>
        </Link>
      </div>

      {params.closed === "1" && (
        <p className="mb-4 border border-[#CCFF00]/30 bg-[#CCFF00]/5 px-4 py-3 text-sm text-white">
          Battle closed — voting ended.
        </p>
      )}
      {params.deleted === "1" && (
        <p className="mb-4 border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
          Battle deleted.
        </p>
      )}
      {params.error && (
        <p className="mb-4 border border-[#FF2D87]/40 bg-[#FF2D87]/10 px-4 py-3 text-sm text-[#FF2D87]">
          Action failed.
        </p>
      )}

      {battles.length === 0 ? (
        <div className="border border-dashed border-white/20 px-6 py-16 text-center">
          <p className="text-lg font-black text-white">No battles yet</p>
          <Link href="/create" className="mt-6 inline-block">
            <Button>Create your first battle</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {battles.map((battle) => (
            <Card key={battle.id} className="border-white/10 bg-[#0a0a0a]">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/b/${battle.slug}`}
                      className="font-bold text-white hover:text-[#CCFF00]"
                    >
                      {battle.title}
                    </Link>
                    <span
                      className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider"
                      style={{
                        background: battle.status === "active" ? "#CCFF00" : "rgba(255,255,255,0.1)",
                        color: battle.status === "active" ? "#000" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {battle.status === "active" ? "Active" : "Closed"}
                    </span>
                    <span className="border border-white/15 px-2 py-0.5 text-xs text-white/60">
                      {getCategoryLabel(battle.category)}
                    </span>
                  </div>
                  <p className="text-sm text-white/50">
                    {battle.total_votes} Votes · /b/{battle.slug}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {battle.status === "active" && (
                    <form action={closeBattle}>
                      <input type="hidden" name="battleId" value={battle.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Close
                      </Button>
                    </form>
                  )}
                  <form action={deleteBattle}>
                    <input type="hidden" name="battleId" value={battle.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Delete
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
