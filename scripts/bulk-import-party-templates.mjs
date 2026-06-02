/**
 * Bulk import licensed meme templates from extracted HD pack.
 *
 * Default: active=false (live pool stays curated 20 + reviewed batches).
 *
 *   node scripts/bulk-import-party-templates.mjs --dry-run --write-review
 *   node scripts/bulk-import-party-templates.mjs --max=50 --active=false
 *   node scripts/bulk-import-party-templates.mjs --activate-reviewed
 *   node scripts/bulk-import-party-templates.mjs --resume
 *   node scripts/bulk-import-party-templates.mjs --contact-sheet
 *
 * See docs/party-templates-license.md before production activation.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { basename, dirname, extname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const importDir = resolve(root, "assets/party-templates/import");
const extractedRoot = resolve(
  importDir,
  "extracted",
  "Memes templates -HD-"
);
const reviewCsvPath = resolve(importDir, "bulk-review.csv");
const manifestPath = resolve(importDir, "bulk-manifest.json");
const contactSheetPath = resolve(importDir, "bulk-contact-sheet.html");

const MIME = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const GENERIC_TEXT_BOXES = [
  { id: "top", x: 0.05, y: 0.03, w: 0.9, h: 0.2, align: "center", maxLines: 2 },
  { id: "bottom", x: 0.05, y: 0.53, w: 0.9, h: 0.2, align: "center", maxLines: 2 },
];

const BULK_SORT_ORDER_START = 100;

const FILENAME_BLOCKLIST = [
  /thumbs\.db/i,
  /\.ds_store$/i,
  /desktop\.ini/i,
  /^~\$/,
  /\.svg$/i,
  /\bpreview\b/i,
  /\bthumb(nail)?\b/i,
];

const CURATED_STORAGE = new Set(
  JSON.parse(
    existsSync(resolve(importDir, "templates.json"))
      ? readFileSync(resolve(importDir, "templates.json"), "utf8")
      : '{"templates":[]}'
  ).templates.map((t) => t.storage_name ?? t.file)
);

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    writeReview: false,
    contactSheet: false,
    resume: false,
    activateReviewed: false,
    max: Infinity,
    active: false,
    concurrency: 8,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--write-review") opts.writeReview = true;
    else if (arg === "--contact-sheet") opts.contactSheet = true;
    else if (arg === "--resume") opts.resume = true;
    else if (arg === "--activate-reviewed") opts.activateReviewed = true;
    else if (arg === "--active=false") opts.active = false;
    else if (arg === "--active=true") opts.active = true;
    else if (arg.startsWith("--max=")) opts.max = Number(arg.slice(6));
    else if (arg.startsWith("--concurrency=")) opts.concurrency = Number(arg.slice(14));
    else if (arg === "--help") {
      console.log(`Usage: node scripts/bulk-import-party-templates.mjs [flags]
  --dry-run              Scan only
  --write-review         Write bulk-review.csv (+ manifest)
  --contact-sheet        HTML contact sheet (requires --write-review or prior manifest)
  --max=N                Limit files processed
  --active=false         Default for bulk rows
  --active=true          Force active on import (avoid for bulk)
  --resume               Skip paths already in bulk-manifest.json
  --activate-reviewed    Set active=true for manifest rows with review_status=approved
  --concurrency=N        Upload parallelism (default 8)`);
      process.exit(0);
    }
  }
  return opts;
}

function loadEnv() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
}

function walkImages(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkImages(full, acc);
    else acc.push(full);
  }
  return acc;
}

function sha256File(path) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (d) => hash.update(d))
      .on("end", () => resolvePromise(hash.digest("hex")))
      .on("error", reject);
  });
}

function blockReasonForFile(filePath, relPath) {
  const base = basename(filePath);
  for (const re of FILENAME_BLOCKLIST) {
    if (re.test(base) || re.test(relPath)) return `filename:${re.source}`;
  }
  const ext = extname(base).toLowerCase();
  if (!MIME[ext]) return "unsupported_extension";
  return "";
}

function slugStorageName(relPath, sha) {
  const base = basename(relPath, extname(relPath))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase();
  const ext = extname(relPath).toLowerCase();
  const prefix = sha.slice(0, 8);
  return `bulk-${prefix}-${base || "meme"}${ext}`;
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeReviewCsv(rows) {
  const header = [
    "source_path",
    "storage_name",
    "width",
    "height",
    "size_mb",
    "sha256",
    "block_reason",
    "review_status",
    "active_default",
    "sort_order",
    "imported",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.source_path,
        row.storage_name,
        row.width,
        row.height,
        row.size_mb,
        row.sha256,
        row.block_reason,
        row.review_status,
        row.active_default,
        row.sort_order,
        row.imported,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  writeFileSync(reviewCsvPath, lines.join("\n"), "utf8");
  console.log("Wrote", reviewCsvPath, `(${rows.length} rows)`);
}

function writeContactSheet(rows, thumbDir) {
  const eligible = rows.filter((r) => !r.block_reason && r.source_path);
  const cards = eligible
    .slice(0, 600)
    .map((r) => {
      const rel = relative(root, r.source_path).replace(/\\/g, "/");
      const thumb = r.thumb_rel
        ? relative(root, join(thumbDir, r.thumb_rel)).replace(/\\/g, "/")
        : rel;
      return `<figure><img src="../${thumb}" alt="" loading="lazy"/><figcaption>${r.storage_name}<br/>${r.width}×${r.height} · ${r.size_mb}MB<br/><code>${r.review_status}</code></figcaption></figure>`;
    })
    .join("\n");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Bulk template review</title>
<style>body{font-family:system-ui;background:#111;color:#eee;padding:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
figure{margin:0;border:1px solid #333;padding:8px;background:#1a1a1a}
img{width:100%;height:140px;object-fit:contain;background:#000}
figcaption{font-size:11px;margin-top:6px;word-break:break-all}</style></head>
<body><h1>Party bulk review (${eligible.length} shown)</h1><div class="grid">${cards}</div></body></html>`;
  writeFileSync(contactSheetPath, html, "utf8");
  console.log("Wrote", contactSheetPath);
}

async function scanAll(opts) {
  const files = walkImages(extractedRoot).sort();
  const shaSeen = new Map();
  const rows = [];
  let sortOrder = BULK_SORT_ORDER_START;

  mkdirSync(resolve(importDir, "review-thumbs"), { recursive: true });
  const thumbDir = resolve(importDir, "review-thumbs");

  for (const filePath of files) {
    const relPath = relative(extractedRoot, filePath);
    const blockReason = blockReasonForFile(filePath, relPath);
    const stat = statSync(filePath);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

    let width = "";
    let height = "";
    let sha = "";
    let thumbRel = "";

    if (!blockReason) {
      sha = await sha256File(filePath);
      if (shaSeen.has(sha)) {
        rows.push({
          source_path: filePath,
          storage_name: "",
          width: "",
          height: "",
          size_mb: sizeMb,
          sha256: sha,
          block_reason: `duplicate_of:${shaSeen.get(sha)}`,
          review_status: "rejected",
          active_default: "false",
          sort_order: "",
          imported: "false",
        });
        continue;
      }
      shaSeen.set(sha, relPath);

      try {
        const meta = await sharp(filePath).metadata();
        width = meta.width ?? "";
        height = meta.height ?? "";
        if (width && height && (width < 200 || height < 200)) {
          rows.push({
            source_path: filePath,
            storage_name: "",
            width,
            height,
            size_mb: sizeMb,
            sha256: sha,
            block_reason: "dimensions_too_small",
            review_status: "rejected",
            active_default: "false",
            sort_order: "",
            imported: "false",
          });
          continue;
        }
        if (stat.size > 8 * 1024 * 1024) {
          rows.push({
            source_path: filePath,
            storage_name: "",
            width,
            height,
            size_mb: sizeMb,
            sha256: sha,
            block_reason: "file_too_large",
            review_status: "rejected",
            active_default: "false",
            sort_order: "",
            imported: "false",
          });
          continue;
        }
      } catch {
        rows.push({
          source_path: filePath,
          storage_name: "",
          width: "",
          height: "",
          size_mb: sizeMb,
          sha256: sha,
          block_reason: "invalid_image",
          review_status: "rejected",
          active_default: "false",
          sort_order: "",
          imported: "false",
        });
        continue;
      }

      const storageName = slugStorageName(relPath, sha);
      if (CURATED_STORAGE.has(storageName) || CURATED_STORAGE.has(basename(filePath))) {
        rows.push({
          source_path: filePath,
          storage_name: storageName,
          width,
          height,
          size_mb: sizeMb,
          sha256: sha,
          block_reason: "curated_duplicate",
          review_status: "rejected",
          active_default: "false",
          sort_order: "",
          imported: "false",
        });
        continue;
      }

      if (opts.contactSheet || opts.writeReview) {
        thumbRel = `${storageName}.jpg`;
        const thumbPath = join(thumbDir, thumbRel);
        if (!existsSync(thumbPath)) {
          await sharp(filePath).resize(160, 160, { fit: "inside" }).jpeg({ quality: 70 }).toFile(thumbPath);
        }
      }

      rows.push({
        source_path: filePath,
        storage_name: storageName,
        width,
        height,
        size_mb: sizeMb,
        sha256: sha,
        block_reason: "",
        review_status: "pending",
        active_default: "false",
        sort_order: sortOrder++,
        imported: "false",
        thumb_rel: thumbRel,
      });
    } else {
      rows.push({
        source_path: filePath,
        storage_name: "",
        width,
        height,
        size_mb: sizeMb,
        sha256: sha,
        block_reason: blockReason,
        review_status: "rejected",
        active_default: "false",
        sort_order: "",
        imported: "false",
      });
    }
  }

  return rows;
}

function loadManifest() {
  if (!existsSync(manifestPath)) return { rows: [], imported: {} };
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function saveManifest(data) {
  writeFileSync(manifestPath, JSON.stringify(data, null, 2), "utf8");
}

async function importRows(supabase, rows, opts) {
  const manifest = loadManifest();
  const importedMap = manifest.imported ?? {};
  let done = 0;
  const queue = rows.filter((r) => !r.block_reason && r.storage_name);

  async function uploadOne(row) {
    if (opts.resume && importedMap[row.storage_name]) {
      return;
    }
    const ext = extname(row.storage_name).toLowerCase();
    const contentType = MIME[ext];
    const body = readFileSync(row.source_path);
    const active = opts.active && row.review_status === "approved";

    if (opts.dryRun) {
      console.log("[dry-run] would upload", row.storage_name, `active=${active}`);
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from("party-templates")
      .upload(row.storage_name, body, { contentType, upsert: true });

    if (uploadError) throw new Error(`upload ${row.storage_name}: ${uploadError.message}`);

    const { data: existing } = await supabase
      .from("party_templates")
      .select("id")
      .eq("image_path", row.storage_name)
      .maybeSingle();

    const payload = {
      image_path: row.storage_name,
      text_boxes: GENERIC_TEXT_BOXES,
      sort_order: row.sort_order,
      active,
    };

    if (existing?.id) {
      const { error } = await supabase.from("party_templates").update(payload).eq("id", existing.id);
      if (error) throw new Error(`update ${row.storage_name}: ${error.message}`);
    } else {
      const { error } = await supabase.from("party_templates").insert(payload);
      if (error) throw new Error(`insert ${row.storage_name}: ${error.message}`);
    }

    importedMap[row.storage_name] = {
      at: new Date().toISOString(),
      active,
      sort_order: row.sort_order,
    };
    row.imported = "true";
    console.log("imported", row.storage_name, active ? "ACTIVE" : "inactive");
  }

  let index = 0;
  async function worker() {
    while (index < queue.length && done < opts.max) {
      const i = index++;
      if (i >= queue.length) break;
      await uploadOne(queue[i]);
      done++;
    }
  }

  const workers = Array.from({ length: Math.min(opts.concurrency, queue.length) }, () => worker());
  await Promise.all(workers);

  manifest.rows = rows;
  manifest.imported = importedMap;
  saveManifest(manifest);
}

async function activateReviewed(supabase) {
  if (!existsSync(reviewCsvPath)) {
    console.error("Missing", reviewCsvPath);
    process.exit(1);
  }
  const lines = readFileSync(reviewCsvPath, "utf8").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const statusIdx = header.indexOf("review_status");
  const storageIdx = header.indexOf("storage_name");
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[statusIdx] !== "approved") continue;
    const storageName = cols[storageIdx];
    if (!storageName) continue;
    const { error } = await supabase
      .from("party_templates")
      .update({ active: true })
      .eq("image_path", storageName);
    if (error) {
      console.error("activate failed", storageName, error.message);
      process.exit(1);
    }
    count++;
    console.log("activated", storageName);
  }
  console.log(`Activated ${count} templates`);
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!existsSync(extractedRoot)) {
    console.error("Extracted pack not found:", extractedRoot);
    process.exit(1);
  }

  if (!existsSync(resolve(importDir, "LICENSE"))) {
    console.warn("WARN: Missing assets/party-templates/import/LICENSE");
  }

  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (opts.activateReviewed) {
    await activateReviewed(supabase);
    return;
  }

  console.log("Scanning", extractedRoot);
  let rows = await scanAll(opts);
  const importable = rows.filter((r) => !r.block_reason && r.storage_name);
  const blocked = rows.length - importable.length;
  const totalMb = importable.reduce((s, r) => s + Number(r.size_mb), 0).toFixed(1);

  console.log(
    `Scan: ${rows.length} files, ${importable.length} importable, ${blocked} blocked/skipped, ~${totalMb} MB importable`
  );

  if (opts.writeReview || opts.dryRun) {
    writeReviewCsv(rows);
  }
  if (opts.contactSheet) {
    writeContactSheet(rows, resolve(importDir, "review-thumbs"));
  }

  if (opts.dryRun) {
    console.log("Dry run complete — no uploads.");
    return;
  }

  const toImport = importable.slice(0, opts.max);
  await importRows(supabase, rows, { ...opts, max: toImport.length });
  if (opts.writeReview) writeReviewCsv(rows);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
