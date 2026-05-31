import Link from "next/link";
import { notFound } from "next/navigation";
import { logoutAdmin } from "@/app/admin/login/actions";
import {
  adminCloseBattle,
  adminDeleteBattle,
  adminResolveReport,
} from "@/app/admin/reports/actions";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/lib/admin-session";
import { getBattleReports, type ReportFilter } from "@/lib/reports";
import { captureServerError } from "@/lib/observability";

type PageProps = {
  searchParams: Promise<{
    filter?: string;
    error?: string;
    closed?: string;
    deleted?: string;
    resolved?: string;
  }>;
};

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (!process.env.ADMIN_SECRET) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black text-white">Admin Reports</h1>
        <p className="mt-4 text-white/50">
          Setze <code className="text-sm text-[#CCFF00]">ADMIN_SECRET</code> in den Env-Vars, um
          diese Seite zu aktivieren.
        </p>
      </div>
    );
  }

  await requireAdminSession("/admin/reports");

  const filter: ReportFilter = params.filter === "all" ? "all" : "open";

  let reports: Awaited<ReturnType<typeof getBattleReports>> = [];

  try {
    reports = await getBattleReports(filter);
  } catch (error) {
    captureServerError("admin-reports", error);
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-white"
            style={{ fontWeight: 900, fontSize: 36, letterSpacing: "-0.04em" }}
          >
            Battle Reports
          </h1>
          <p className="mt-2 text-white/50">
            Moderation — geschlossene Battles bleiben öffentlich sichtbar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/feed">
            <Button variant="outline">Zum Feed</Button>
          </Link>
          <form action={logoutAdmin}>
            <Button variant="secondary" type="submit">
              Abmelden
            </Button>
          </form>
        </div>
      </div>

      <div className="mb-6 flex gap-1">
        <Link href="/admin/reports?filter=open">
          <Button variant={filter === "open" ? "default" : "outline"} size="sm">
            Offen
          </Button>
        </Link>
        <Link href="/admin/reports?filter=all">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm">
            Alle
          </Button>
        </Link>
      </div>

      {params.closed === "1" && (
        <p className="mb-4 text-sm text-[#CCFF00]">Battle geschlossen.</p>
      )}
      {params.deleted === "1" && (
        <p className="mb-4 text-sm text-[#CCFF00]">Battle gelöscht.</p>
      )}
      {params.resolved === "1" && (
        <p className="mb-4 text-sm text-[#CCFF00]">Report erledigt.</p>
      )}
      {params.error && (
        <p className="mb-4 text-sm text-[#FF2D87]">Aktion fehlgeschlagen: {params.error}</p>
      )}

      {reports.length === 0 ? (
        <div className="border border-dashed border-white/20 px-6 py-16 text-center">
          <p className="text-lg font-black text-white">
            {filter === "open" ? "Keine offenen Reports" : "Keine Reports"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="border border-white/10 bg-[#0a0a0a] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/50">
                    {new Date(report.created_at).toLocaleString("de-DE")}
                    {report.resolved_at && (
                      <span className="ml-2 border border-[#CCFF00]/30 bg-[#CCFF00]/10 px-2 py-0.5 text-xs text-[#CCFF00]">
                        Erledigt
                      </span>
                    )}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-white">
                    {report.battles?.title ?? "Unbekanntes Battle"}
                  </h2>
                  <p className="mt-2 text-sm text-white/70">
                    Status:{" "}
                    <span className="font-bold text-white">{report.battles?.status ?? "—"}</span>
                  </p>
                  <p className="mt-3 border border-white/10 bg-black px-3 py-2 text-sm text-white/80">
                    {report.reason}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.battles?.slug && (
                    <Link href={`/b/${report.battles.slug}`}>
                      <Button variant="outline" size="sm">
                        Ansehen
                      </Button>
                    </Link>
                  )}
                  {!report.resolved_at && (
                    <form action={adminResolveReport}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="filter" value={filter} />
                      <Button type="submit" variant="secondary" size="sm">
                        Erledigt
                      </Button>
                    </form>
                  )}
                  {report.battles?.status === "active" && (
                    <form action={adminCloseBattle}>
                      <input type="hidden" name="battleId" value={report.battle_id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Schließen
                      </Button>
                    </form>
                  )}
                  <form action={adminDeleteBattle}>
                    <input type="hidden" name="battleId" value={report.battle_id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Löschen
                    </Button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
