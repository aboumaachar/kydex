# KYDEX Phase 8A — Build Audit and Patch Plan

**Date:** 2026-05-01  
**Phase:** 8A — Current Build Audit  
**Purpose:** Map existing modules against Phase 8 requirements and define the precise file-by-file patch plan for Phases 8B–8I.

---

## 1. Existing Module Inventory

### 1.1 API modules (`apps/api/src/`)

| Module folder | Status | Notes |
|---|---|---|
| `ofac/` | ✅ Exists | health, lists, programs, sync, entities, changes — all implemented |
| `ofac-screening/` | ✅ Exists | `POST /screening/search`, `GET /screening/audit/:id`, notary search |
| `matching/` | ✅ Exists | `MatchingService` — Arabic normalization, transliteration, similarity scoring |
| `notaries/` | ✅ Exists | Profile, API key guard, config, search, image screening |
| `screening/` | ✅ Exists | Tenant/user screening with `ScreeningQuery` model |
| `data-sources/` | ✅ Exists | Upload, sync, version, ingestion reports, records |
| `audit-logs/` | ✅ Exists | `AuditLog` model with chain scope |
| `cases/` | ✅ Exists | Full compliance case lifecycle |
| `integrations/` | ✅ Exists | API key management, bulk screening |
| `bulk-screening/` | ✅ Exists | Async bulk job |
| `document-extraction/` | ✅ Exists | OCR extraction and confirmation |
| `auth/` | ✅ Exists | JWT, refresh, password reset |
| `users/` | ✅ Exists | `/users/me` |
| `health/` | ✅ Exists | `/health` |
| `scoring/` | ✅ Exists | Scoring helpers |
| **`sources/`** | ❌ Missing | Phase 8 source-library registry module |
| **`inquiries/`** | ❌ Missing | Phase 8 incoming inquiry relay module |
| **`name-normalization/`** | ❌ Missing | Standalone bilingual normalization (currently embedded in `matching/`) |
| **`ip-logging/`** | ❌ Missing | IP + transaction log middleware |
| **`source-library/`** | ❌ Missing | Local list preview, source entity search |

---

### 1.2 Prisma schema — existing models

| Model | Phase 8 mapping | Status |
|---|---|---|
| `DataSource` | Maps to Phase 8 `DataSource` (partial) | ✅ Exists — missing `status`, `fallbackEnabled`, `localCopyAvailable`, `lastSuccessfulSyncAt`, `lastHealthCheckAt`, `lastLatencyMs`, `lastError` |
| `DataSourceVersion` | Source versioning | ✅ Exists |
| `WatchlistRecord` | Maps to `SourceEntity` (partial) | ✅ Exists — missing `normalizedArabic`, `sourceFileName`, `rawStoragePath` fields; no `SourceName`/`SourceNameVariant` tables |
| `OfacEntity` | OFAC-specific entity | ✅ Exists |
| `OfacName` | OFAC-specific name | ✅ Exists |
| `OfacSyncRun` | Maps to `SourceSyncRun` (partial) | ✅ Exists — missing `sourceId`, `syncType`, `recordsUpdated`, `recordsFailed`, `sourceFileName`, `publicationId` |
| `ScreeningQuery` | Maps to `ScreeningTransaction` (partial) | ✅ Exists — missing `sourceMode`, `usedFallback`, `liveSourceChecked`, `queryVariants`, `ipAddress`, `userAgent`, `apiKeyId`, `wordpressSite`, `wpUserId`, `responseTimeMs` |
| `ScreeningMatch` | Maps to `ScreeningMatch` | ✅ Exists — different shape |
| `AuditLog` | Maps to `ApiAccessLog` (partial) | ✅ Exists |
| `NotaryProfile` | ✅ | ✅ Exists |
| `NotaryApiKey` | ✅ | ✅ Exists |
| `OfacScreeningSearch` | ✅ | ✅ Exists |
| **`SourceConnectionLog`** | ❌ Missing | Phase 8 — source health tracking |
| **`SourceFile`** | ❌ Missing | Phase 8 — imported file metadata |
| **`SourceImportedList`** | ❌ Missing | Phase 8 — per-list import tracking |
| **`SourceEntity`** | ❌ Missing | Phase 8 — normalized entity record |
| **`SourceName`** | ❌ Missing | Phase 8 — primary/alias names |
| **`SourceNameVariant`** | ❌ Missing | Phase 8 — bilingual variant index |
| **`ScreeningTransaction`** | ❌ Missing | Phase 8 — full transaction log with sourceMode |
| **`IncomingInquiry`** | ❌ Missing | Phase 8 — external client inquiry |

---

### 1.3 Dashboard routes

| Route | Status |
|---|---|
| `/dashboard` (page.tsx) | ✅ Exists |
| `/dashboard/sources` | ❌ Missing |
| `/dashboard/sources/ofac` | ❌ Missing |
| `/dashboard/sources/ofac/local-lists` | ❌ Missing |
| `/dashboard/sources/ofac/sync` | ❌ Missing |
| `/dashboard/sources/ofac/logs` | ❌ Missing |
| `/dashboard/screening/logs` | ❌ Missing |
| `/dashboard/inquiries` | ❌ Missing |
| `/dashboard/inquiries/[id]` | ❌ Missing |

---

### 1.4 Legacy donor status

| Item | Status |
|---|---|
| `apps/web/src/app/kydex/` folder | ❌ Does not exist — clean |
| `apps/web/src/components/kydex/` folder | ❌ Does not exist — clean |
| `KydexAuthProvider`, `useKydexAuth`, `KydexLanding` imports | ❌ Not found — clean |
| LCN/Council code in KYDEX core | ❌ Not found — clean |

---

### 1.5 Name normalization — current state

`MatchingService` (`apps/api/src/matching/matching.service.ts`) **already contains:**

- `normalizeArabicName()` — diacritics, Alef variants, Ya/Maqsura, honorifics
- `transliterateArabicToLatin()` — 29-char ARABIC_TO_LATIN_MAP
- `normalizeName()` — Latin normalization, tokenization
- `computeNameSimilarity()` — Jaccard, Dice, bigram, consonant, containment
- `CANONICAL_TOKEN_MAP` — 30+ common variant mappings (mohammad/mohammed, hassan/hasan, etc.)

**Missing for Phase 8:**
- Latin-to-Arabic reverse transliteration
- Full `QueryVariantService` that generates all variant types (arabicToLatin, latinToArabic, phonetic, alias, token)
- Phonetic key generation
- Storage of variants in `SourceNameVariant` table during import
- Use of stored variants during search (currently all normalization is on-the-fly)

---

## 2. Gap Summary

| Gap | Phase |
|---|---|
| Source registry API (`/api/v1/sources`) | 8B |
| Source connection health tracking | 8B |
| `SourceConnectionLog` Prisma model | 8B |
| Extend `DataSource` with fallback/status fields | 8B |
| `SourceFile`, `SourceImportedList` Prisma models | 8C |
| `SourceEntity` Prisma model | 8C |
| OFAC import writer to source tables | 8C |
| `SourceName`, `SourceNameVariant` Prisma models | 8D |
| `QueryVariantService` (bilingual + phonetic + alias variants) | 8D |
| Variant generation during import | 8D |
| Local-first screening (query SourceEntity/SourceName) | 8E |
| `sourceMode`, `usedFallback`, `queryVariants`, `warning` in response | 8E |
| Fallback detection + fallback-mode search | 8E |
| `ScreeningTransaction`, `IncomingInquiry` Prisma models | 8F |
| IP + metadata logging on every request | 8F |
| `POST /api/v1/inquiries/screen` | 8F |
| `GET /api/v1/inquiries`, `GET /api/v1/inquiries/:id` | 8F |
| `/dashboard/sources` UI | 8G |
| `/dashboard/sources/ofac` UI | 8G |
| `/dashboard/sources/ofac/local-lists` UI | 8G |
| `/dashboard/sources/ofac/sync` UI | 8G |
| `/dashboard/screening/logs` UI | 8G |
| `/dashboard/inquiries` UI | 8G |
| WordPress plugin response: sourceMode, fallback, variants | 8H |

---

## 3. File-by-File Patch Plan

### Phase 8B — Source registry

| Action | File |
|---|---|
| ADD model | `prisma/schema.prisma` — add `SourceConnectionLog` model; extend `DataSource` |
| CREATE | `apps/api/src/sources/sources.module.ts` |
| CREATE | `apps/api/src/sources/sources.controller.ts` |
| CREATE | `apps/api/src/sources/sources.service.ts` |
| CREATE | `apps/api/src/sources/dto/source-health-check.dto.ts` |
| EDIT | `apps/api/src/app.module.ts` — register SourcesModule |
| RUN | `npx prisma migrate dev --name phase8b_source_registry` |

---

### Phase 8C — OFAC local import tables

| Action | File |
|---|---|
| ADD models | `prisma/schema.prisma` — add `SourceFile`, `SourceImportedList`, `SourceEntity` |
| CREATE | `apps/api/src/source-library/source-library.module.ts` |
| CREATE | `apps/api/src/source-library/source-library.service.ts` |
| CREATE | `apps/api/src/source-library/source-library.controller.ts` |
| EDIT | `apps/api/src/ofac/ofac.service.ts` — write to `SourceFile`, `SourceImportedList`, `SourceEntity` after import |
| EDIT | `apps/api/src/app.module.ts` — register SourceLibraryModule |
| RUN | `npx prisma migrate dev --name phase8c_source_local_import` |

---

### Phase 8D — Bilingual name index

| Action | File |
|---|---|
| ADD models | `prisma/schema.prisma` — add `SourceName`, `SourceNameVariant` |
| CREATE | `apps/api/src/name-normalization/name-normalization.module.ts` |
| CREATE | `apps/api/src/name-normalization/name-normalization.service.ts` |
| CREATE | `apps/api/src/name-normalization/query-variant.service.ts` |
| EDIT | `apps/api/src/source-library/source-library.service.ts` — call variant generation during entity import |
| EDIT | `apps/api/src/app.module.ts` — register NameNormalizationModule |
| RUN | `npx prisma migrate dev --name phase8d_name_variants` |

---

### Phase 8E — Local-first screening

| Action | File |
|---|---|
| ADD models | `prisma/schema.prisma` — extend `OfacScreeningSearch` with `sourceMode`, `usedFallback`, `queryVariants`, `ipAddress`, `userAgent`, `responseTimeMs` |
| EDIT | `apps/api/src/ofac-screening/ofac-screening.service.ts` — add local-first search path, fallback logic, sourceMode |
| CREATE | `apps/api/src/ofac-screening/dto/ofac-screening-response.dto.ts` |
| EDIT | `apps/api/src/ofac-screening/ofac-screening.controller.ts` — pass IP/userAgent from request |
| RUN | `npx prisma migrate dev --name phase8e_screening_sourcmode` |

---

### Phase 8F — Inquiry endpoint and logs

| Action | File |
|---|---|
| ADD models | `prisma/schema.prisma` — add `ScreeningTransaction`, `IncomingInquiry`, `ApiAccessLog` |
| CREATE | `apps/api/src/inquiries/inquiries.module.ts` |
| CREATE | `apps/api/src/inquiries/inquiries.controller.ts` |
| CREATE | `apps/api/src/inquiries/inquiries.service.ts` |
| CREATE | `apps/api/src/inquiries/dto/inquiry-screen.dto.ts` |
| CREATE | `apps/api/src/ip-logging/ip-logging.middleware.ts` |
| CREATE | `apps/api/src/ip-logging/ip-logging.module.ts` |
| EDIT | `apps/api/src/app.module.ts` — register InquiriesModule, apply IpLoggingMiddleware |
| RUN | `npx prisma migrate dev --name phase8f_inquiries_logs` |

---

### Phase 8G — Dashboard pages

| Action | File |
|---|---|
| CREATE | `apps/web/src/app/dashboard/sources/page.tsx` |
| CREATE | `apps/web/src/app/dashboard/sources/ofac/page.tsx` |
| CREATE | `apps/web/src/app/dashboard/sources/ofac/local-lists/page.tsx` |
| CREATE | `apps/web/src/app/dashboard/sources/ofac/sync/page.tsx` |
| CREATE | `apps/web/src/app/dashboard/sources/ofac/logs/page.tsx` |
| CREATE | `apps/web/src/app/dashboard/screening/logs/page.tsx` |
| CREATE | `apps/web/src/app/dashboard/inquiries/page.tsx` |
| CREATE | `apps/web/src/app/dashboard/inquiries/[id]/page.tsx` |
| EDIT | `apps/web/src/app/dashboard/page.tsx` — add nav links to new routes |

---

### Phase 8H — WordPress response upgrade

| Action | File |
|---|---|
| EDIT | `apps/api/src/notaries/notary-screening.controller.ts` — include `sourceMode`, `usedFallback`, `queryVariants`, `sourceStatus`, `warning` in response |
| EDIT | `apps/api/src/notaries/dto/notary-screening-response.dto.ts` — add new fields |

---

### Phase 8I — Validation

| Action | Description |
|---|---|
| RUN | `npm run build -w @kydex/api` |
| RUN | `npm run build -w @kydex/web` |
| TEST | `GET /api/v1/ofac/health` |
| TEST | `GET /api/v1/sources` |
| TEST | `GET /api/v1/sources/ofac/status` |
| TEST | `GET /api/v1/sources/ofac/lists` |
| TEST | `GET /api/v1/sources/ofac/lists/SDN%20List/preview` |
| TEST | `POST /api/v1/screening/search` (English full name) |
| TEST | `POST /api/v1/screening/search` (Arabic full name) |
| TEST | `POST /api/v1/screening/search` (single family name) |
| TEST | Simulate OFAC offline → verify `sourceMode: local_fallback` |
| TEST | `POST /api/v1/notaries/sandranassif/screening/search` |
| TEST | `GET /api/v1/inquiries` |
| TEST | `POST /api/v1/inquiries/screen` |
| WRITE | `KYDEX_PHASE8_SOURCE_LIBRARY_FALLBACK_CONFIRMED.md` |

---

## 4. Preserved invariants

The following are **not touched** during Phase 8:

- KYDEX landing page (`/`)
- `/login` and auth/session logic
- `/kydex → /` redirect
- Existing case/compliance workflow
- `ComplianceCase`, `ScreeningQuery`, `AuditLog`, `WatchlistRecord`, `DataSource` models (extend only)
- LCN workspace (`C:\notary`)
- Sandra WordPress theme
- Existing API key guard on notary routes

---

## 5. Status

- [x] Phase 8A audit — complete
- [ ] Phase 8B — source registry
- [ ] Phase 8C — OFAC local import
- [ ] Phase 8D — bilingual name index
- [ ] Phase 8E — local-first screening
- [ ] Phase 8F — inquiry endpoint + logs
- [ ] Phase 8G — dashboard pages
- [ ] Phase 8H — WordPress response
- [ ] Phase 8I — validation + confirmation artifact
