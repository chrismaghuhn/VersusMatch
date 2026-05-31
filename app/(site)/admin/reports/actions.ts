"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertAdmin() {
  if (!process.env.ADMIN_SECRET) {
    redirect("/admin/login");
  }

  await requireAdminSession();
}

async function cleanupBattleImages(battleId: string, creatorId: string) {
  const supabase = createAdminClient();
  const prefix = `${creatorId}/${battleId}`;
  const { data: files } = await supabase.storage.from("battle-images").list(prefix);

  if (files && files.length > 0) {
    const paths = files.map((file) => `${prefix}/${file.name}`);
    await supabase.storage.from("battle-images").remove(paths);
  }
}

async function resolveOpenReportsForBattle(battleId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("battle_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("battle_id", battleId)
    .is("resolved_at", null);
}

export async function adminCloseBattle(formData: FormData) {
  await assertAdmin();
  const battleId = String(formData.get("battleId") ?? "");

  const supabase = createAdminClient();
  const { error } = await supabase.from("battles").update({ status: "closed" }).eq("id", battleId);

  if (error) {
    redirect("/admin/reports?error=close_failed");
  }

  await resolveOpenReportsForBattle(battleId);

  revalidatePath("/admin/reports");
  revalidatePath("/feed");
  redirect("/admin/reports?closed=1");
}

export async function adminDeleteBattle(formData: FormData) {
  await assertAdmin();
  const battleId = String(formData.get("battleId") ?? "");

  const supabase = createAdminClient();
  const { data: battle } = await supabase
    .from("battles")
    .select("id, slug, creator_id")
    .eq("id", battleId)
    .maybeSingle();

  if (!battle) {
    redirect("/admin/reports?error=not_found");
  }

  await cleanupBattleImages(battleId, battle.creator_id);

  const { error } = await supabase.from("battles").delete().eq("id", battleId);

  if (error) {
    redirect("/admin/reports?error=delete_failed");
  }

  revalidatePath("/admin/reports");
  revalidatePath("/feed");
  redirect("/admin/reports?deleted=1");
}

export async function adminResolveReport(formData: FormData) {
  await assertAdmin();
  const reportId = String(formData.get("reportId") ?? "");
  const filter = String(formData.get("filter") ?? "open");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("battle_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) {
    redirect(`/admin/reports?filter=${filter}&error=resolve_failed`);
  }

  revalidatePath("/admin/reports");
  redirect(`/admin/reports?filter=${filter}&resolved=1`);
}
