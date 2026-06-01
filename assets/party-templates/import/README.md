# Licensed meme template import

Drop provider assets here when ready.

## Checklist (license)

- [x] Commercial use allowed (MemeFight is free but public) — Meme Archive License v1.0
- [x] Modification / text overlay on images allowed
- [x] No attribution required to pack seller
- [ ] Third-party trademark/copyright review per template (see license §6)
- [x] Full license in repo root `LICENSE.txt` and `import/LICENSE`

## What the provider should give you

| Need | Why |
|------|-----|
| **Images** (WebP/PNG/JPG, ~800px+) | Storage bucket `party-templates` |
| **Text regions** per template | `text_boxes` in DB (normalized 0–1) |
| **Stable filenames** | `import/files/` + manifest |

If the API only gives images, you can calibrate `text_boxes` manually in [templates.example.json](templates.example.json) using the design preview or a quick overlay test in `/party`.

## Import steps

1. Extract the provider ZIP to `extracted/` (or run picks via `node scripts/extract-party-templates.mjs`)
2. Put images in `files/` (extract script copies curated blank/empty templates)
3. Copy `templates.example.json` → `templates.json` and fill all entries
4. Add `LICENSE` (provider text)
5. Run: `node scripts/import-party-templates.mjs`

Updates rows by `sort_order` when present, inserts new rows for new sort orders.

## Caption format (unchanged)

Players use one caption string; `|` splits into overlay slots (top/bottom, 3-panel, etc.).

Example Drake: `SCHLECHTE IDEE | BESSERE IDEE`
