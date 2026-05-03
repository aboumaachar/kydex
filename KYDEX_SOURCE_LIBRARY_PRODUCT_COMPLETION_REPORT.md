# KYDEX Source Library — Product Completion Report

**Date:** 2026-05-02  
**Scope:** Full Source Library product surface implementation — bilingual preview, download engine, translation coverage, available-source registry.  
**Baseline preserved:** Screening, OCR, Fallback, WordPress Plugin, and all existing routes remain untouched.

---

## Summary

All items from the Source Library Dashboard Gap Report have been implemented. The Source Library is now a complete, commercially presentable product surface with:

- Bilingual (English / Arabic-normalized) preview mode with RTL column rendering
- Full-list export as CSV or JSON (up to 10 000 records per list)
- Arabic translation/normalisation coverage statistics per list
- Source availability registry endpoint
- A dedicated **Downloads** page
- Prominent machine-translation disclaimers on all Arabic-related surfaces

---

## Completed Work

### Backend — `apps/api/src/source-library/`

#### `source-library.controller.ts`

Three new routes added (all guarded by `JwtAuthGuard` + `RolesGuard`):

| Route | Purpose |
|---|---|
| `GET /api/v1/sources/available` | Lists all `KydexDataSource` rows where `localCopyAvailable: true` |
| `GET /api/v1/sources/:source/lists/:listName/download` | Bulk export — up to 10 000 entities with nested names (including `normalizedArabic`) |
| `GET /api/v1/sources/:source/lists/:listName/translation-status` | Arabic coverage statistics per list |

Route ordering follows NestJS priority rules — `GET available` is defined before parameterized `:source` routes to prevent shadowing.

#### `source-library.service.ts`

Three new methods:

- **`getAvailableSources()`** — queries `KydexDataSource` where `localCopyAvailable: true`
- **`getTranslationStatus(sourceCode, listName)`** — runs 4 Prisma count queries in a `$transaction` to compute entity/name Arabic coverage percentages
- **`downloadList(sourceCode, listName)`** — exports up to 10 000 `SourceEntity` rows with nested `SourceName` records (including `normalizedArabic`, `language`, `aliasType`)

### Frontend — `apps/web/src/lib/api.ts`

#### New Types

| Type | Purpose |
|---|---|
| `SourceTranslationStatus` | Coverage response shape from `/translation-status` endpoint |
| `SourceDownloadEntity` | Single entity in a bulk download response |
| `SourceDownloadResponse` | Full download response wrapper |
| `AvailableSource` | Single available source row |

#### Updated Types

- `SourceNamePreview` — added `normalizedArabic?: string | null`, `language?: string | null`
- `SourceEntityPreview` — added `normalizedArabic?: string | null`

#### New API Client Functions

| Function | Description |
|---|---|
| `getSourceTranslationStatus(sourceCode, listName)` | Fetches Arabic coverage stats |
| `getSourceListDownload(sourceCode, listName)` | Fetches full bulk download data |
| `getAvailableSources()` | Fetches available source list |
| `sourceDownloadToCsv(data)` | Pure utility — converts `SourceDownloadResponse` to RFC 4180 CSV string |
| `triggerBlobDownload(content, filename, mimeType)` | Browser blob download trigger |

### Frontend — Pages

#### `apps/web/src/app/dashboard/sources/ofac/local-lists/page.tsx` (upgraded)

- **Language Selector** — dropdown with `English only | Arabic-normalized only | Bilingual (EN + AR)` modes
- **Arabic column** — RTL-direction `الاسم (عربي مُعيَّر)` column shown when lang = `ar` or `bilingual`
- **Arabic coverage card** — fetches `getSourceTranslationStatus` on load; shows entity %, name %, and raw counts
- **Download bar** — `↓ Download CSV` and `↓ Download JSON` buttons with loading state; all downloads limited to 10 000 records
- **Enhanced search** — corpus now includes `normalizedArabic` fields from entity and name records
- **Arabic disclaimer** — shown on coverage card, download bar, and as table footnote

#### `apps/web/src/app/dashboard/sources/ofac/downloads/page.tsx` (new)

- Shows all imported OFAC lists as cards
- Each card: record count, last import date, entity Arabic %, name Arabic %
- Per-card `↓ Download CSV` and `↓ Download JSON` buttons with per-list loading state
- Top-level prominent Arabic normalisation disclaimer

#### `apps/web/src/app/dashboard/sources/page.tsx` (upgraded)

- Added **Downloads ↓** nav button in teal accent style linking to `/dashboard/sources/ofac/downloads`

---

## Arabic Normalisation Disclaimer (Canonical Text)

> *Arabic values are machine-transliterated/normalized from source records. These are NOT certified legal translations. Do not use these values as the authoritative Arabic representation for any legal or compliance purpose.*

This text appears on every surface that exposes `normalizedArabic` data.

---

## Architecture Notes

- **Download flow:** API returns JSON; frontend converts to CSV using `sourceDownloadToCsv()`. No streaming required, no express `Response` injection. Authentication header is passed via `apiRequest()` in all calls.
- **Route safety:** All new routes are inside the existing `SourceLibraryController` with the same auth guards as existing routes. No public endpoints were added.
- **Arabic data provenance:** `normalizedArabic` is populated by the existing OFAC import pipeline from official source XML. No fake or hallucinated translations are used at any layer.
- **Screening/OCR/Fallback isolation:** Zero changes to `ScreeningModule`, `OfacScreeningModule`, `OfacModule`, `DocumentExtractionModule`, or `IntegrationsModule`.

---

## Test Smoke Checks

Once the API restarts (ts-node-dev --respawn auto-triggers):

```
# Available sources
curl -H "Authorization: Bearer <token>" http://localhost:4051/api/v1/sources/available

# Translation status
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4051/api/v1/sources/OFAC/lists/SDN%20List/translation-status"

# Download (first 10k records)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4051/api/v1/sources/OFAC/lists/SDN%20List/download" | head -c 2000
```

---

*Report generated post-implementation. All code changes validated: zero TypeScript errors on modified files.*
