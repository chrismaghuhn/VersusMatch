/**
 * Validates meme template SVG assets listed in assets/party-templates/templates.json.
 * Run upload-party-templates.mjs after changing SVGs.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "assets/party-templates");
const manifest = JSON.parse(readFileSync(resolve(dir, "templates.json"), "utf8"));

for (const entry of manifest) {
  const path = resolve(dir, entry.file);
  if (!existsSync(path)) {
    console.error("missing", entry.file);
    process.exit(1);
  }
  console.log("ok", entry.file, `(${entry.text_boxes.length} text boxes)`);
}

console.log(`\n${manifest.length} meme templates ready. Upload with: node scripts/upload-party-templates.mjs`);
