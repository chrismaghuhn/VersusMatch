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

const files = [
  "placeholder-1.svg",
  "placeholder-2.svg",
  "placeholder-3.svg",
  "placeholder-4.svg",
  "placeholder-5.svg",
  "placeholder-6.svg",
  "placeholder-7.svg",
  "placeholder-8.svg",
];

for (const name of files) {
  const body = readFileSync(resolve(root, "public/party/placeholders", name));
  const { error } = await supabase.storage.from("party-templates").upload(name, body, {
    contentType: "image/svg+xml",
    upsert: true,
  });
  if (error) {
    console.error("upload failed", name, error.message);
    process.exit(1);
  }
  console.log("uploaded", name);
}
