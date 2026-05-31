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
  { title: "Pizza vs Burger", slug: "pizza-vs-burger", category: "food", optionA: "Pizza", optionB: "Burger" },
  { title: "Coffee vs Tea", slug: "coffee-vs-tea", category: "food", optionA: "Coffee", optionB: "Tea" },
  { title: "PC vs Console", slug: "pc-vs-console", category: "gaming", optionA: "PC Master Race", optionB: "Console" },
  { title: "Minecraft vs Fortnite", slug: "minecraft-vs-fortnite", category: "gaming", optionA: "Minecraft", optionB: "Fortnite" },
  { title: "Dark Mode vs Light Mode", slug: "dark-mode-vs-light-mode", category: "design", optionA: "Dark Mode", optionB: "Light Mode" },
  { title: "Tabs vs Spaces", slug: "tabs-vs-spaces", category: "memes", optionA: "Tabs", optionB: "Spaces" },
  { title: "Summer vs Winter", slug: "summer-vs-winter", category: "general", optionA: "Summer", optionB: "Winter" },
  { title: "Cats vs Dogs", slug: "cats-vs-dogs", category: "memes", optionA: "Cats", optionB: "Dogs" },
  { title: "iPhone vs Android", slug: "iphone-vs-android", category: "general", optionA: "iPhone", optionB: "Android" },
  { title: "Marvel vs DC", slug: "marvel-vs-dc", category: "general", optionA: "Marvel", optionB: "DC" },
  { title: "PlayStation vs Xbox", slug: "playstation-vs-xbox", category: "gaming", optionA: "PlayStation", optionB: "Xbox" },
  { title: "Coke vs Pepsi", slug: "coke-vs-pepsi", category: "food", optionA: "Coke", optionB: "Pepsi" },
  { title: "Star Wars vs Star Trek", slug: "star-wars-vs-star-trek", category: "general", optionA: "Star Wars", optionB: "Star Trek" },
  { title: "Anime vs Cartoons", slug: "anime-vs-cartoons", category: "memes", optionA: "Anime", optionB: "Cartoons" },
  { title: "TikTok vs Instagram", slug: "tiktok-vs-instagram", category: "general", optionA: "TikTok", optionB: "Instagram" },
  { title: "Messi vs Ronaldo", slug: "messi-vs-ronaldo", category: "general", optionA: "Messi", optionB: "Ronaldo" },
  { title: "Taylor Swift vs Beyoncé", slug: "taylor-swift-vs-beyonce", category: "music", optionA: "Taylor Swift", optionB: "Beyoncé" },
  { title: "Rock vs Pop", slug: "rock-vs-pop", category: "music", optionA: "Rock", optionB: "Pop" },
  { title: "Netflix vs YouTube", slug: "netflix-vs-youtube", category: "general", optionA: "Netflix", optionB: "YouTube" },
  { title: "Pineapple on Pizza", slug: "pineapple-on-pizza", category: "food", optionA: "Yes, delicious", optionB: "No, crime" },
  { title: "Remote Work vs Office", slug: "remote-work-vs-office", category: "general", optionA: "Remote Work", optionB: "Office" },
  { title: "AI vs Human Art", slug: "ai-vs-human-art", category: "design", optionA: "AI Art", optionB: "Human Art" },
  { title: "Vinyl vs Streaming", slug: "vinyl-vs-streaming", category: "music", optionA: "Vinyl", optionB: "Streaming" },
  { title: "Call of Duty vs Battlefield", slug: "cod-vs-battlefield", category: "gaming", optionA: "Call of Duty", optionB: "Battlefield" },
  { title: "Mac vs Windows", slug: "mac-vs-windows", category: "general", optionA: "Mac", optionB: "Windows" },
  { title: "Spotify vs Apple Music", slug: "spotify-vs-apple-music", category: "music", optionA: "Spotify", optionB: "Apple Music" },
  { title: "Valorant vs CS2", slug: "valorant-vs-cs2", category: "gaming", optionA: "Valorant", optionB: "CS2" },
  { title: "Beer vs Wine", slug: "beer-vs-wine", category: "food", optionA: "Beer", optionB: "Wine" },
  { title: "City vs Country", slug: "city-vs-country", category: "general", optionA: "City Life", optionB: "Country Life" },
  { title: "Nintendo vs Steam Deck", slug: "nintendo-vs-steam-deck", category: "gaming", optionA: "Nintendo", optionB: "Steam Deck" },
  { title: "Gym vs Home Workout", slug: "gym-vs-home-workout", category: "general", optionA: "Gym", optionB: "Home Workout" },
  { title: "Book vs Movie", slug: "book-vs-movie", category: "general", optionA: "Read the Book", optionB: "Watch the Movie" },
  { title: "Reddit vs X", slug: "reddit-vs-x", category: "memes", optionA: "Reddit", optionB: "X" },
  { title: "Electric vs Gas Cars", slug: "electric-vs-gas", category: "general", optionA: "Electric", optionB: "Gas" },
  { title: "Harry Potter vs LOTR", slug: "harry-potter-vs-lotr", category: "general", optionA: "Harry Potter", optionB: "Lord of the Rings" },
  { title: "Jordan vs LeBron", slug: "jordan-vs-lebron", category: "general", optionA: "Jordan", optionB: "LeBron" },
  { title: "Hot Dog vs Sandwich", slug: "hot-dog-vs-sandwich", category: "food", optionA: "Hot Dog", optionB: "Sandwich" },
  { title: "Chrome vs Firefox", slug: "chrome-vs-firefox", category: "design", optionA: "Chrome", optionB: "Firefox" },
  { title: "Sushi vs Burger", slug: "sushi-vs-burger", category: "food", optionA: "Sushi", optionB: "Burger" },
  { title: "Early Bird vs Night Owl", slug: "early-bird-vs-night-owl", category: "general", optionA: "Early Bird", optionB: "Night Owl" },
  { title: "Brainrot vs Classic Memes", slug: "brainrot-vs-classic", category: "memes", optionA: "Brainrot", optionB: "Classic Memes" },
  { title: "Batman vs Superman", slug: "batman-vs-superman", category: "general", optionA: "Batman", optionB: "Superman" },
  { title: "Manual vs Automatic", slug: "manual-vs-automatic", category: "general", optionA: "Manual", optionB: "Automatic" },
  { title: "Breakfast vs Brunch", slug: "breakfast-vs-brunch", category: "food", optionA: "Breakfast", optionB: "Brunch" },
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

  const { data: existingBySlug } = await admin
    .from("battles")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existingBySlug) {
    console.log(`skip (exists): ${slug}`);
    return;
  }

  const { data: existingByTitle } = await admin
    .from("battles")
    .select("id, slug")
    .eq("title", seed.title)
    .maybeSingle();

  if (existingByTitle) {
    if (existingByTitle.slug !== slug) {
      await admin.from("battle_slug_redirects").upsert(
        { old_slug: existingByTitle.slug, battle_id: existingByTitle.id },
        { onConflict: "old_slug" }
      );

      const { error: updateError } = await admin
        .from("battles")
        .update({ slug })
        .eq("id", existingByTitle.id);

      if (updateError) {
        console.error(`failed slug update: ${seed.title}`, updateError.message);
        return;
      }

      console.log(`updated slug: ${existingByTitle.slug} → /b/${slug}`);
    } else {
      console.log(`skip (title exists): ${slug}`);
    }
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
