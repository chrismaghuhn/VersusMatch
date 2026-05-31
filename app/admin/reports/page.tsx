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
        <h1 className="text-2xl font-bold">Admin Reports</h1>
        <p className="mt-4 text-muted-foreground">
          Setze <code className="text-sm">ADMIN_SECRET</code> in den Env-Vars, um diese Seite zu aktivieren.
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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Battle Reports</h1>
          <p className="mt-2 text-muted-foreground">Moderation — geschlossene Battles bleiben öffentlich sichtbar.</p>
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

      <div className="mb-6 flex gap-2">
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

      {params.closed === "1" && <p className="mb-4 text-sm text-green-600">Battle geschlossen.</p>}
      {params.deleted === "1" && <p className="mb-4 text-sm text-green-600">Battle gelöscht.</p>}
      {params.resolved === "1" && <p className="mb-4 text-sm text-green-600">Report erledigt.</p>}
      {params.error && (
        <p className="mb-4 text-sm text-destructive">Aktion fehlgeschlagen: {params.error}</p>
      )}

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-lg font-medium">
            {filter === "open" ? "Keine offenen Reports" : "Keine Reports"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.created_at).toLocaleString("de-DE")}
                    {report.resolved_at && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">Erledigt</span>
                    )}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {report.battles?.title ?? "Unbekanntes Battle"}
                  </h2>
                  <p className="mt-2 text-sm">
                    Status: <span className="font-medium">{report.battles?.status ?? "—"}</span>
                  </p>
                  <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm">{report.reason}</p>
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
