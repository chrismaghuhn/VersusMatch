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
  { title: "Pizza vs Burger", slug: "pizza-vs-burger-seed01", category: "food", optionA: "Pizza", optionB: "Burger" },
  { title: "Coffee vs Tea", slug: "coffee-vs-tea-seed01", category: "food", optionA: "Coffee", optionB: "Tea" },
  { title: "PC vs Console", slug: "pc-vs-console-seed01", category: "gaming", optionA: "PC Master Race", optionB: "Console" },
  { title: "Minecraft vs Fortnite", slug: "minecraft-vs-fortnite-seed01", category: "gaming", optionA: "Minecraft", optionB: "Fortnite" },
  { title: "Dark Mode vs Light Mode", slug: "dark-mode-vs-light-mode-seed01", category: "design", optionA: "Dark Mode", optionB: "Light Mode" },
  { title: "Tabs vs Spaces", slug: "tabs-vs-spaces-seed01", category: "memes", optionA: "Tabs", optionB: "Spaces" },
  { title: "Summer vs Winter", slug: "summer-vs-winter-seed01", category: "general", optionA: "Summer", optionB: "Winter" },
  { title: "Cats vs Dogs", slug: "cats-vs-dogs-seed01", category: "memes", optionA: "Cats", optionB: "Dogs" },
  { title: "iPhone vs Android", slug: "iphone-vs-android-seo01", category: "general", optionA: "iPhone", optionB: "Android" },
  { title: "Marvel vs DC", slug: "marvel-vs-dc-seo01", category: "general", optionA: "Marvel", optionB: "DC" },
  { title: "PlayStation vs Xbox", slug: "playstation-vs-xbox-seo01", category: "gaming", optionA: "PlayStation", optionB: "Xbox" },
  { title: "Coke vs Pepsi", slug: "coke-vs-pepsi-seo01", category: "food", optionA: "Coke", optionB: "Pepsi" },
  { title: "Star Wars vs Star Trek", slug: "star-wars-vs-star-trek-seo01", category: "general", optionA: "Star Wars", optionB: "Star Trek" },
  { title: "Anime vs Cartoons", slug: "anime-vs-cartoons-seo01", category: "memes", optionA: "Anime", optionB: "Cartoons" },
  { title: "TikTok vs Instagram", slug: "tiktok-vs-instagram-seo01", category: "general", optionA: "TikTok", optionB: "Instagram" },
  { title: "Messi vs Ronaldo", slug: "messi-vs-ronaldo-seo01", category: "general", optionA: "Messi", optionB: "Ronaldo" },
  { title: "Taylor Swift vs Beyoncé", slug: "taylor-swift-vs-beyonce-seo01", category: "music", optionA: "Taylor Swift", optionB: "Beyoncé" },
  { title: "Rock vs Pop", slug: "rock-vs-pop-seo01", category: "music", optionA: "Rock", optionB: "Pop" },
  { title: "Netflix vs YouTube", slug: "netflix-vs-youtube-seo01", category: "general", optionA: "Netflix", optionB: "YouTube" },
  { title: "Pineapple on Pizza", slug: "pineapple-on-pizza-seo01", category: "food", optionA: "Yes, delicious", optionB: "No, crime" },
  { title: "Remote Work vs Office", slug: "remote-work-vs-office-seo01", category: "general", optionA: "Remote Work", optionB: "Office" },
  { title: "AI vs Human Art", slug: "ai-vs-human-art-seo01", category: "design", optionA: "AI Art", optionB: "Human Art" },
  { title: "Vinyl vs Streaming", slug: "vinyl-vs-streaming-seo01", category: "music", optionA: "Vinyl", optionB: "Streaming" },
  { title: "Call of Duty vs Battlefield", slug: "cod-vs-battlefield-seo01", category: "gaming", optionA: "Call of Duty", optionB: "Battlefield" },
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
  const slug = seed.slug ?? slugify(seed.title);

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
