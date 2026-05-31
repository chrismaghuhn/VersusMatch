/**
 * Seed text-only battles for feed/sitemap testing.
 *
 * Usage:
 *   node scripts/seed-battles.mjs
 *
 * Requires in .env.local (or env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_CREATOR_ID (optional — uses first auth user if omitted)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SEED_BATTLES = [
  { title: "Pizza vs Burger", category: "food", optionA: "Pizza", optionB: "Burger" },
  { title: "Coffee vs Tea", category: "food", optionA: "Coffee", optionB: "Tea" },
  { title: "PC vs Console", category: "gaming", optionA: "PC Master Race", optionB: "Console" },
  { title: "Minecraft vs Fortnite", category: "gaming", optionA: "Minecraft", optionB: "Fortnite" },
  { title: "Dark Mode vs Light Mode", category: "design", optionA: "Dark Mode", optionB: "Light Mode" },
  { title: "Tabs vs Spaces", category: "memes", optionA: "Tabs", optionB: "Spaces" },
  { title: "Summer vs Winter", category: "general", optionA: "Summer", optionB: "Winter" },
  { title: "Cats vs Dogs", category: "memes", optionA: "Cats", optionB: "Dogs" },
];

function slugify(text) {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "battle";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

async function resolveCreatorId() {
  if (process.env.SEED_CREATOR_ID) {
    return process.env.SEED_CREATOR_ID;
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error || !data.users.length) {
    throw new Error(
      "No auth users found. Set SEED_CREATOR_ID or log in once via magic link."
    );
  }

  return data.users[0].id;
}

async function seedBattle(creatorId, seed) {
  const slug = slugify(seed.title);

  const { data: existing } = await admin
    .from("battles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    console.log(`skip (exists): ${slug}`);
    return;
  }

  const { data: battle, error: battleError } = await admin
    .from("battles")
    .insert({
      title: seed.title,
      slug,
      creator_id: creatorId,
      status: "active",
      category: seed.category,
    })
    .select("id, slug")
    .single();

  if (battleError || !battle) {
    console.error(`failed battle: ${seed.title}`, battleError?.message);
    return;
  }

  const { error: optionsError } = await admin.from("battle_options").insert([
    {
      battle_id: battle.id,
      label: seed.optionA,
      image_path: null,
      position: 0,
    },
    {
      battle_id: battle.id,
      label: seed.optionB,
      image_path: null,
      position: 1,
    },
  ]);

  if (optionsError) {
    await admin.from("battles").delete().eq("id", battle.id);
    console.error(`failed options: ${seed.title}`, optionsError.message);
    return;
  }

  console.log(`created: /b/${battle.slug}`);
}

async function main() {
  const creatorId = await resolveCreatorId();
  console.log(`Seeding as creator ${creatorId}…`);

  for (const seed of SEED_BATTLES) {
    await seedBattle(creatorId, seed);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
