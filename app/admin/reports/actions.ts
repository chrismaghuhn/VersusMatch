"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminKeyValid } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

function assertAdmin(formData: FormData) {
  const key = String(formData.get("adminKey") ?? "");

  if (!isAdminKeyValid(key)) {
    redirect("/admin/reports?error=unauthorized");
  }

  return key;
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

export async function adminCloseBattle(formData: FormData) {
  const adminKey = assertAdmin(formData);
  const battleId = String(formData.get("battleId") ?? "");

  const supabase = createAdminClient();
  const { error } = await supabase.from("battles").update({ status: "closed" }).eq("id", battleId);

  if (error) {
    redirect(`/admin/reports?key=${encodeURIComponent(adminKey)}&error=close_failed`);
  }

  revalidatePath("/admin/reports");
  revalidatePath("/feed");
  redirect(`/admin/reports?key=${encodeURIComponent(adminKey)}&closed=1`);
}

export async function adminDeleteBattle(formData: FormData) {
  const adminKey = assertAdmin(formData);
  const battleId = String(formData.get("battleId") ?? "");

  const supabase = createAdminClient();
  const { data: battle } = await supabase
    .from("battles")
    .select("id, slug, creator_id")
    .eq("id", battleId)
    .maybeSingle();

  if (!battle) {
    redirect(`/admin/reports?key=${encodeURIComponent(adminKey)}&error=not_found`);
  }

  await cleanupBattleImages(battleId, battle.creator_id);

  const { error } = await supabase.from("battles").delete().eq("id", battleId);

  if (error) {
    redirect(`/admin/reports?key=${encodeURIComponent(adminKey)}&error=delete_failed`);
  }

  revalidatePath("/admin/reports");
  revalidatePath("/feed");
  redirect(`/admin/reports?key=${encodeURIComponent(adminKey)}&deleted=1`);
}
