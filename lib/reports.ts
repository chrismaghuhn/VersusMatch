import { createAdminClient } from "@/lib/supabase/admin";

export type ReportFilter = "open" | "all";

export type BattleReportRow = {
  id: string;
  battle_id: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
  battles: {
    slug: string;
    title: string;
    status: string;
  } | null;
};

export async function getBattleReports(
  filter: ReportFilter = "open",
  limit = 50
): Promise<BattleReportRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("battle_reports")
    .select("id, battle_id, reason, created_at, resolved_at, battles(slug, title, status)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "open") {
    query = query.is("resolved_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as BattleReportRow[];
}
