# Party meme templates — license gate

**Status:** Signed off for **full archive import** (staging with `active: false` default).  
**Last reviewed:** 2026-06-02  
**License holder:** VersusMatch / Chris (`versus.match.lol@gmail.com`)

## Coverage

| Item | Location | Covers full ~527 pack? |
|------|----------|-------------------------|
| Meme Archive License v1.0 | [`assets/party-templates/import/LICENSE`](../assets/party-templates/import/LICENSE) | **Yes** — §1–2 grant applies to “the digital meme archive contained in this ZIP file” and “all … files included in it (the Licensed Content)” |
| Source archive | `Memes templates -HD--20260601T184038Z-3-002.zip` | Same pack as extracted tree under `assets/party-templates/import/extracted/` |
| Curated import (20) | [`assets/party-templates/import/templates.json`](../assets/party-templates/import/templates.json) | Subset with custom `text_boxes`; `sort_order` 1–20, `active: true` |
| Bulk import (staged) | `scripts/bulk-import-party-templates.mjs` | Full scan; DB `sort_order >= 100`; **`active: false` until review** |

## Provider metadata

- **Provider folder:** `Memes templates -HD-`
- **Purchase date:** 2026-06-01
- **Governing law:** Germany (license §11)
- **Attribution:** Not required (license §5)

## Production rules (release blocker)

1. **Do not** claim “500+ templates” on marketing or `/credits` until:
   - `SELECT count(*) FROM party_templates WHERE active = true` matches the claim, **and**
   - Human review batches are activated via `--activate-reviewed`.
2. **Bulk upload** may run to Storage + DB with `active: false` before license review; **mass `active: true`** requires this doc + visual QA on `bulk-review.csv`.
3. **Third-party rights** (characters, brands, likeness) remain the operator’s responsibility per license §6–7.

## Sign-off

| Check | Owner | Date |
|-------|-------|------|
| LICENSE text covers full ZIP, not only curated 20 | Chris | 2026-06-02 |
| Purchase receipt on file | Chris | 2026-06-01 |
| Credits page lists **20** live templates only (no inflated count) | Engineering | 2026-06-02 |
| Bulk import default `active: false` | Engineering | 2026-06-02 |

## Related commands

```bash
# Scan + review manifest (no writes)
node scripts/bulk-import-party-templates.mjs --dry-run --write-review

# Pilot import (50 files, inactive)
node scripts/bulk-import-party-templates.mjs --max=50 --active=false

# Activate approved rows from manifest
node scripts/bulk-import-party-templates.mjs --activate-reviewed
```
