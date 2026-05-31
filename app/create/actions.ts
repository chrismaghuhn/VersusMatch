"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { countActiveBattlesForCreator } from "@/lib/battles";
import { generateBattleSlug } from "@/lib/utils";

const MAX_ACTIVE_BATTLES = 5;

export async function createBattle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/create");
  }

  const title = String(formData.get("title") ?? "").trim();
  const optionAText = String(formData.get("optionA") ?? "").trim();
  const optionBText = String(formData.get("optionB") ?? "").trim();
  const imageA = formData.get("imageA");
  const imageB = formData.get("imageB");

  if (!title || !optionAText || !optionBText) {
    redirect("/create?error=missing_fields");
  }

  const activeCount = await countActiveBattlesForCreator(supabase, user.id);
  if (activeCount >= MAX_ACTIVE_BATTLES) {
    redirect("/create?error=battle_limit");
  }

  const slug = generateBattleSlug(title);

  const { data: battle, error: battleError } = await supabase
    .from("battles")
    .insert({
      title,
      slug,
      creator_id: user.id,
      status: "active",
    })
    .select("id, slug")
    .single();

  if (battleError || !battle) {
    redirect(`/create?error=${encodeURIComponent(battleError?.message ?? "create_failed")}`);
  }

  async function uploadImage(file: FormDataEntryValue | null, position: 0 | 1): Promise<string | null> {
    if (!(file instanceof File) || file.size === 0) return null;

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user!.id}/${battle!.id}/${position}.${extension}`;

    const { error } = await supabase.storage.from("battle-images").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (error) return null;
    return path;
  }

  const imagePathA = await uploadImage(imageA, 0);
  const imagePathB = await uploadImage(imageB, 1);

  const { error: optionsError } = await supabase.from("battle_options").insert([
    {
      battle_id: battle.id,
      label: optionAText,
      image_path: imagePathA,
      position: 0,
    },
    {
      battle_id: battle.id,
      label: optionBText,
      image_path: imagePathB,
      position: 1,
    },
  ]);

  if (optionsError) {
    redirect(`/create?error=${encodeURIComponent(optionsError.message)}`);
  }

  redirect(`/b/${battle.slug}`);
}
