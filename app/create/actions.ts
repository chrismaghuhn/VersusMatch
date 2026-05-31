"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BATTLE_CATEGORIES, type BattleCategory } from "@/lib/categories";
import { countActiveBattlesForCreator } from "@/lib/battles";
import { generateBattleSlug } from "@/lib/utils";

const MAX_ACTIVE_BATTLES = 5;
const MAX_SLUG_RETRIES = 5;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateImage(file: FormDataEntryValue | null, fieldName: string): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `${fieldName}_invalid_type`;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `${fieldName}_too_large`;
  }

  return null;
}

async function cleanupFailedBattle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  battleId: string,
  imagePaths: string[]
) {
  if (imagePaths.length > 0) {
    await supabase.storage.from("battle-images").remove(imagePaths);
  }

  await supabase.from("battles").delete().eq("id", battleId);
}

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
  const categoryInput = String(formData.get("category") ?? "general");
  const category = BATTLE_CATEGORIES.some((item) => item.value === categoryInput)
    ? (categoryInput as BattleCategory)
    : "general";

  if (!title || !optionAText || !optionBText) {
    redirect("/create?error=missing_fields");
  }

  const imageAError = validateImage(imageA, "imageA");
  if (imageAError) {
    redirect(`/create?error=${imageAError}`);
  }

  const imageBError = validateImage(imageB, "imageB");
  if (imageBError) {
    redirect(`/create?error=${imageBError}`);
  }

  const activeCount = await countActiveBattlesForCreator(supabase, user.id);
  if (activeCount >= MAX_ACTIVE_BATTLES) {
    redirect("/create?error=battle_limit");
  }

  let battle: { id: string; slug: string } | null = null;
  let lastBattleError: string | null = null;

  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt += 1) {
    const slug = generateBattleSlug(title);
    const { data, error } = await supabase
      .from("battles")
      .insert({
        title,
        slug,
        creator_id: user.id,
        status: "active",
        category,
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      battle = data;
      break;
    }

    lastBattleError = error?.message ?? "create_failed";
    if (error?.code !== "23505") {
      redirect(`/create?error=${encodeURIComponent(lastBattleError)}`);
    }
  }

  if (!battle) {
    redirect(`/create?error=${encodeURIComponent(lastBattleError ?? "create_failed")}`);
  }

  async function uploadImage(
    file: FormDataEntryValue | null,
    position: 0 | 1
  ): Promise<string | null> {
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

  const uploadedPaths: string[] = [];
  const imagePathA = await uploadImage(imageA, 0);
  if (imagePathA) uploadedPaths.push(imagePathA);

  const imagePathB = await uploadImage(imageB, 1);
  if (imagePathB) uploadedPaths.push(imagePathB);

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
    await cleanupFailedBattle(supabase, battle.id, uploadedPaths);
    redirect(`/create?error=create_failed`);
  }

  redirect(`/b/${battle.slug}`);
}
