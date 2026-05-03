# KYDEX Screening UI + Live API Fix Report

Date: 2026-05-03

## Scope Completed

- Fixed screening validation failures by accepting query aliases and returning explicit validation contract.
- Added live verification mode semantics and response metadata in OFAC screening.
- Updated external API-key client guard handling for `x-kydex-client: external-api-client`.
- Added a live verification toggle + source-mode display in screening UI.
- Improved dashboard contrast/readability in targeted source pages/components.
- Fixed local list preview table overflow and long-field wrapping.
- Replaced user-facing local-list wording from records to preview/local-entry terminology.
- Added external API client screening guide and a reusable smoke test command.

## Key Code Changes

### Part A: Validation + Payload Normalization

- `apps/api/src/common/pipes/zod-validation.pipe.ts`
  - Added structured validation response for missing screening query:
    - `status: validation_failed`
    - `message: A screening query is required.`
    - `acceptedFields: [query, fullName, subject, name]`
- `apps/api/src/screening/dto/screen.dto.ts`
  - Legacy `/screen` schema now accepts query aliases and normalizes to `fullName` + `query`.
  - Added payload fields: `screeningType`, `source`, `liveVerify`.
- `apps/api/src/screening/screening.service.ts`
  - Added alias resolver (`query/fullName/subject/name`) and normalization guard.
- `apps/api/src/ofac-screening/dto/ofac-screening-search.dto.ts`
  - Added alias fields and transforms for `query`, `sources`, and `liveVerify`.
- `apps/api/src/ofac-screening/ofac-screening.service.ts`
  - Added backend normalization to canonical query.
  - Added `validation_failed` response when no query alias provided.

### Part B: Live Screening Semantics

- `apps/api/src/ofac-screening/ofac-screening.module.ts`
  - Imported `SourcesModule`.
- `apps/api/src/ofac-screening/ofac-screening.service.ts`
  - Injected `SourcesService` and added live health checks for OFAC.
  - Added/confirmed response fields:
    - `sourceMode`
    - `liveSourceChecked`
    - `sourceStatus`
    - `usedFallback`
    - `warning`
  - Source mode behavior implemented:
    - `local_only`
    - `local_fallback`
    - `live_verified`
    - `degraded`

### Part C: External API-Key Owner Support

- `apps/api/src/notaries/notary-api-key.guard.ts`
  - Allows `x-kydex-client: external-api-client`.
  - Preserves WordPress client validation behavior.
- `apps/api/src/notaries/notary-screening.controller.ts`
  - Uses default source `external_api_client` when external header is used.
  - Accepts optional `x-kydex-client-name` and includes it in api client trace context.
- Added smoke test command:
  - `scripts/test-live-notary-screening.js`
  - `package.json` script: `test:live-screening`
- Added guide:
  - `KYDEX_EXTERNAL_API_CLIENT_SCREENING_GUIDE.md`

### Part D/E/F: Dashboard Readability, Overflow, and Wording

- `apps/web/src/app/dashboard/_components/dashboard-shell.tsx`
  - Improved text contrast for descriptions and metrics.
- `apps/web/src/app/dashboard/sources/ofac/local-lists/page.tsx`
  - Added stronger placeholder/text contrast.
  - Added responsive table container/classes:
    - `max-w-full`, `min-w-0`, `overflow-x-auto`, `min-w-[900px]`
  - Added wrap/truncate behavior for IDs and long text.
  - Arabic column now uses RTL + wrapping (`dir="rtl"`, `whitespace-normal`, `break-words`).
  - Program field rendered as compact chips.
  - Replaced records wording with preview/local-entry wording.
  - Label updates include:
    - `Preview local list (English)`
    - `Arabic-normalized preview`
    - `Bilingual preview`
    - `Download local list`
- `apps/web/src/app/dashboard/sources/ofac/downloads/page.tsx`
  - Updated wording from records to preview/local-list size labels.
  - Improved contrast in supporting text.

### Screening UI Live Indicator

- `apps/web/src/lib/api.ts`
  - Added normalized payload mapping for legacy `runScreening` so query fields are always present.
  - Added `runDashboardScreeningSearch` helper for `/api/v1/screening/search`.
  - Added `OfacScreeningSearchResponse` type.
- `apps/web/src/app/screening/new/page.tsx`
  - Added toggle: `Live verify source before screening`.
  - Added source-mode badge card rendering:
    - Live verified
    - Local only
    - Local fallback
    - Degraded
  - Sends standardized screening payload with query contract fields.

## Build Validation

Executed:

- `npm run build -w @kydex/api` ✅
- `npm run build -w @kydex/web` ✅

## Runtime Validation Results

### Dashboard Screening API (Live Verify = true)

Command:

- `POST http://localhost:4000/api/v1/screening/search`

Result:

- `query: John Smith`
- `sourceMode: live_verified`
- `liveSourceChecked: true`
- `auditId` returned ✅

### Validation Error Contract

Command with missing query aliases:

- `POST /api/v1/screening/search` without `query/fullName/subject/name`

Result:

```json
{
  "status": "validation_failed",
  "message": "A screening query is required.",
  "acceptedFields": ["query", "fullName", "subject", "name"]
}
```

### Alias Input Acceptance

Command with `fullName` only:

- `POST /api/v1/screening/search` body `{ "fullName": "Mohammad Ali", ... }`

Result:

- Search succeeded and response `query` normalized to `Mohammad Ali` ✅

### Fallback Verification

Simulation:

- Set OFAC status offline via `node _set_ofac_offline.js`

Run with `liveVerify: false`:

- `sourceMode: local_fallback`
- `usedFallback: true`
- `warning` present ✅

Note:

- With `liveVerify: true`, backend health check reached OFAC successfully in this environment and returned `live_verified` (expected when live source is reachable).

### External API-Key Owner Validation

Command:

- `npm run test:live-screening`

Headers used:

- `x-kydex-notary-key`
- `x-kydex-client: external-api-client`
- `x-kydex-client-name`

Result summary:

- `httpStatus: 201`
- `sourceMode: live_verified`
- `liveSourceChecked: true`
- `auditId` returned ✅

## Notes on Non-Regression Constraints

- WordPress plugin path remains guarded and supported.
- OCR/image screening flow was not modified.
- Fallback semantics are preserved and now explicit in response contract.
- OFAC raw URLs are not exposed to browser payloads.
