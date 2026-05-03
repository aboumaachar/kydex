# KYDEX Source Library Dashboard Gap Report

**Date:** 2026-05-02  
**Status:** Pre-implementation audit  
**Scope:** Source Library product surface — backend API + dashboard UI

---

## 1. Schema Audit

All required Prisma models exist and are populated:

| Model | Status | Key fields |
|---|---|---|
| `KydexDataSource` | ✅ Exists | `code`, `status`, `localCopyAvailable`, `fallbackEnabled` |
| `SourceImportedList` | ✅ Exists | `listName`, `recordCount`, `languageCoverage`, `localAvailable` |
| `SourceEntity` | ✅ Exists | `primaryName`, `normalizedArabic`, `normalizedLatin`, `listName`, `programs`, `countries` |
| `SourceName` | ✅ Exists | `originalName`, `normalizedArabic`, `language`, `script`, `isPrimary`, `isAlias` |
| `SourceNameVariant` | ✅ Exists | `variant`, `variantType`, `language`, `phoneticKey` |

Arabic fields (`normalizedArabic`) exist on both `SourceEntity` and `SourceName`. These are **machine-transliterated/normalized** — not certified legal translations. Must be labeled as such.

---

## 2. Backend API Gap Analysis

| Endpoint | Status | Notes |
|---|---|---|
| `GET /sources` | ✅ EXISTS | Returns all registered sources |
| `GET /sources/:source/status` | ✅ EXISTS | Single source status |
| `GET /sources/:source/lists` | ✅ EXISTS | List all imported lists for a source |
| `GET /sources/:source/lists/:listName/preview` | ✅ EXISTS | Paginated entity preview (take/skip); includes `normalizedArabic` in DB payload but TypeScript type doesn't expose it |
| `GET /sources/:source/entities/:entityId` | ✅ EXISTS | Full entity detail |
| `GET /sources/:source/stats` | ✅ EXISTS | Entity/name/list counts |
| `GET /sources/available` | ❌ MISSING | No endpoint to list sources with local copy available |
| `GET /sources/:source/lists/:listName/download` | ❌ MISSING | No download endpoint (CSV or JSON) |
| `GET /sources/:source/lists/:listName/translation-status` | ❌ MISSING | No Arabic coverage endpoint; `languageCoverage[]` stored but unexposed |
| Arabic fields in preview response | ⚠️ PARTIAL | Backend includes them but TypeScript types hide them from frontend |
| Bilingual preview mode (`?lang=`) | ❌ MISSING | No language filter/mode parameter |
| Source selector in screening | ✅ EXISTS | `/screening/new` has full source selector; sources are passed as `sources[]` array |

---

## 3. Dashboard UI Gap Analysis

| Feature | Status | Location | Notes |
|---|---|---|---|
| List selector | ✅ EXISTS | `/dashboard/sources/ofac/local-lists` | Dropdown populated from API |
| Search/filter | ✅ EXISTS | `/dashboard/sources/ofac/local-lists` | Client-side filter on current page |
| Pagination | ✅ EXISTS | `/dashboard/sources/ofac/local-lists` | Prev/Next with skip |
| Language selector (EN/AR/Bilingual) | ❌ MISSING | — | No toggle anywhere in sources dashboard |
| Arabic column in preview table | ❌ MISSING | — | `normalizedArabic` data exists in API response but not rendered |
| Download CSV button | ❌ MISSING | — | No download UI anywhere in dashboard/sources |
| Download JSON button | ❌ MISSING | — | No download UI anywhere in dashboard/sources |
| Translation/Arabic coverage status | ❌ MISSING | — | `languageCoverage` field fetched but never rendered |
| `/dashboard/sources/ofac/downloads` page | ❌ MISSING | — | Route does not exist |
| Source registry with active/inactive badges | ⚠️ PARTIAL | `/dashboard/sources` | `StatusPill` shows raw enum values; no semantic "ACTIVE / NOT CONFIGURED" label |
| Multi-source selector (interactive) | ✅ EXISTS | `/screening/new` (not in dashboard shell) | Full source selection UI exists |

---

## 4. Critical Gaps Summary

### Priority 1 — Missing backend endpoints
1. `GET /sources/available` — needed for source availability display
2. `GET /sources/:source/lists/:listName/download` — needed for CSV/JSON export
3. `GET /sources/:source/lists/:listName/translation-status` — needed for Arabic coverage display

### Priority 2 — Missing frontend features
4. Language selector (EN / Arabic-normalized / Bilingual) with Arabic table column
5. Download CSV / Download JSON buttons on local-lists and downloads page
6. Translation coverage status display (% entities with Arabic)
7. `/dashboard/sources/ofac/downloads` page (new route)

### Priority 3 — Display improvements
8. Source registry semantic badges (ACTIVE / FALLBACK ONLY / NOT CONFIGURED)
9. "Downloads" nav link on OFAC source card

---

## 5. Safety Constraints

- **Do not** expose OFAC source URLs to the browser
- **Do not** claim human/legal Arabic translation — label as "Arabic-normalized (machine transliterated)"
- **Do not** break existing screening, OCR, fallback, or WordPress plugin flows
- Download endpoints must require the same JWT auth as other source library endpoints

---

## 6. Implementation Plan

See completion report after implementation: `KYDEX_SOURCE_LIBRARY_PRODUCT_COMPLETION_REPORT.md`
