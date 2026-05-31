"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/my-battles");
  }

  return { supabase, user };
}

async function cleanupBattleImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  battleId: string,
  creatorId: string
) {
  const prefix = `${creatorId}/${battleId}`;
  const { data: files } = await supabase.storage.from("battle-images").list(prefix);

  if (files && files.length > 0) {
    const paths = files.map((file) => `${prefix}/${file.name}`);
    await supabase.storage.from("battle-images").remove(paths);
  }
}

export async function closeBattle(formData: FormData) {
  const battleId = String(formData.get("battleId") ?? "");
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("battles")
    .update({ status: "closed" })
    .eq("id", battleId)
    .eq("creator_id", user.id);

  if (error) {
    redirect("/my-battles?error=close_failed");
  }

  revalidatePath("/my-battles");
  revalidatePath("/feed");
  redirect("/my-battles?closed=1");
}

export async function deleteBattle(formData: FormData) {
  const battleId = String(formData.get("battleId") ?? "");
  const { supabase, user } = await requireUser();

  const { data: battle } = await supabase
    .from("battles")
    .select("id, slug")
    .eq("id", battleId)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!battle) {
    redirect("/my-battles?error=not_found");
  }

  await cleanupBattleImages(supabase, battleId, user.id);

  const { error } = await supabase.from("battles").delete().eq("id", battleId);

  if (error) {
    redirect("/my-battles?error=delete_failed");
  }

  revalidatePath("/my-battles");
  revalidatePath("/feed");
  redirect("/my-battles?deleted=1");
}
