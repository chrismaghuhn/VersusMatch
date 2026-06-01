/**
 * Import licensed meme templates from assets/party-templates/import/
 *
 * Setup:
 *   1. Copy license text to assets/party-templates/import/LICENSE (provider + terms)
 *   2. Add images (webp/png/jpg) to assets/party-templates/import/files/
 *   3. Edit assets/party-templates/import/templates.json (see templates.example.json)
 *   4. Run: node scripts/import-party-templates.mjs
 *
 * text_boxes: normalized 0–1 coords (x, y, w, h). One box per caption segment split by |.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const importDir = resolve(root, "assets/party-templates/import");
const filesDir = resolve(importDir, "files");
const manifestPath = resolve(importDir, "templates.json");

const MIME = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function loadEnv() {
  return Object.fromEntries(
    readFileSync(resolve(root, ".env.local"), "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

if (!existsSync(manifestPath)) {
  console.error("Missing", manifestPath);
  console.error("Copy templates.example.json → templates.json and add files to import/files/");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const licensePath = resolve(importDir, "LICENSE");
if (!existsSync(licensePath)) {
  console.warn("WARN: No import/LICENSE — add provider license before production.");
}

for (const entry of manifest.templates) {
  const localPath = resolve(filesDir, entry.file);
  if (!existsSync(localPath)) {
    console.error("Missing file:", entry.file);
    process.exit(1);
  }

  const ext = extname(entry.file).toLowerCase();
  const contentType = MIME[ext];
  if (!contentType) {
    console.error("Unsupported extension:", entry.file);
    process.exit(1);
  }

  const body = readFileSync(localPath);
  const storageName = entry.storage_name ?? entry.file;

  const { error: uploadError } = await supabase.storage
    .from("party-templates")
    .upload(storageName, body, { contentType, upsert: true });

  if (uploadError) {
    console.error("upload failed", storageName, uploadError.message);
    process.exit(1);
  }
  console.log("uploaded", storageName);

  if (entry.id) {
    const { error: updateError } = await supabase
      .from("party_templates")
      .update({
        image_path: storageName,
        text_boxes: entry.text_boxes,
        active: entry.active !== false,
      })
      .eq("id", entry.id);

    if (updateError) {
      console.error("db update failed", entry.id, updateError.message);
      process.exit(1);
    }
    console.log("updated row", entry.id);
  } else if (entry.sort_order != null) {
    const { data: existing, error: selectError } = await supabase
      .from("party_templates")
      .select("id")
      .eq("sort_order", entry.sort_order)
      .maybeSingle();

    if (selectError) {
      console.error("db select failed sort_order", entry.sort_order, selectError.message);
      process.exit(1);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("party_templates")
        .update({
          image_path: storageName,
          text_boxes: entry.text_boxes,
          active: entry.active !== false,
        })
        .eq("sort_order", entry.sort_order);

      if (updateError) {
        console.error("db update failed sort_order", entry.sort_order, updateError.message);
        process.exit(1);
      }
      console.log("updated sort_order", entry.sort_order);
    } else {
      const { error: insertError } = await supabase.from("party_templates").insert({
        image_path: storageName,
        text_boxes: entry.text_boxes,
        sort_order: entry.sort_order,
        active: entry.active !== false,
      });

      if (insertError) {
        console.error("db insert failed sort_order", entry.sort_order, insertError.message);
        process.exit(1);
      }
      console.log("inserted sort_order", entry.sort_order);
    }
  } else {
    const { error: insertError } = await supabase.from("party_templates").insert({
      image_path: storageName,
      text_boxes: entry.text_boxes,
      sort_order: entry.sort_order ?? 999,
      active: entry.active !== false,
    });

    if (insertError) {
      console.error("db insert failed", entry.file, insertError.message);
      process.exit(1);
    }
    console.log("inserted", entry.file);
  }
}

console.log("\nDone.", manifest.templates.length, "templates imported.");
if (manifest.provider) {
  console.log("License provider:", manifest.provider);
}
