import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const manifest = JSON.parse(
  readFileSync(resolve(root, "assets/party-templates/templates.json"), "utf8")
);

for (const entry of manifest) {
  const body = readFileSync(resolve(root, "assets/party-templates", entry.file));
  const { error } = await supabase.storage.from("party-templates").upload(entry.file, body, {
    contentType: "image/svg+xml",
    upsert: true,
  });
  if (error) {
    console.error("upload failed", entry.file, error.message);
    process.exit(1);
  }
  console.log("uploaded", entry.file);
}
