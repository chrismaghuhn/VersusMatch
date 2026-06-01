# Licensed meme template import

Drop provider assets here when ready.

## Checklist (license)

- [ ] Commercial use allowed (MemeFight is free but public)
- [ ] Modification / text overlay on images allowed
- [ ] No exclusive “editorial only” restriction for UGC caption game
- [ ] Attribution requirements documented (if any → add to app credits)
- [ ] Copy full license into `LICENSE` in this folder

## What the provider should give you

| Need | Why |
|------|-----|
| **Images** (WebP/PNG/JPG, ~800px+) | Storage bucket `party-templates` |
| **Text regions** per template | `text_boxes` in DB (normalized 0–1) |
| **Stable filenames** | `import/files/` + manifest |

If the API only gives images, you can calibrate `text_boxes` manually in [templates.example.json](templates.example.json) using the design preview or a quick overlay test in `/party`.

## Import steps

1. Put images in `files/`
2. Copy `templates.example.json` → `templates.json` and fill all entries
3. Add `LICENSE` (provider text)
4. Run: `node scripts/import-party-templates.mjs`

Updates rows by `sort_order` (1–8 replaces current pool) or by `id` if you UUID them from Supabase.

## Caption format (unchanged)

Players use one caption string; `|` splits into overlay slots (top/bottom, 3-panel, etc.).

Example Drake: `SCHLECHTE IDEE | BESSERE IDEE`
