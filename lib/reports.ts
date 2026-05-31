import { createAdminClient } from "@/lib/supabase/admin";

export type BattleReportRow = {
  id: string;
  battle_id: string;
  reason: string;
  created_at: string;
  battles: {
    slug: string;
    title: string;
    status: string;
  } | null;
};

export async function getBattleReports(limit = 50): Promise<BattleReportRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("battle_reports")
    .select("id, battle_id, reason, created_at, battles(slug, title, status)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as BattleReportRow[];
}
