/**
 * Print live sitemap URLs for Google Search Console submission.
 *
 * Usage:
 *   node scripts/list-index-urls.mjs
 */

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

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://memefight.lol").replace(/\/$/, "");

const categories = ["general", "memes", "design", "food", "gaming", "music"];

const staticUrls = [
  baseUrl,
  `${baseUrl}/feed`,
  ...categories.map((category) => `${baseUrl}/feed/${category}`),
];

const priorityBattles = [
  "pizza-vs-burger-seed01",
  "minecraft-vs-fortnite-seed04",
  "iphone-vs-android-seo01",
  "marvel-vs-dc-seo01",
  "coffee-vs-tea-seed02",
];

console.log("# Static + category URLs\n");
for (const url of staticUrls) {
  console.log(url);
}

console.log("\n# Priority battle URLs (submit in GSC URL inspection)\n");
for (const slug of priorityBattles) {
  console.log(`${baseUrl}/b/${slug}`);
}

console.log("\n# Sitemap\n");
console.log(`${baseUrl}/sitemap.xml`);
