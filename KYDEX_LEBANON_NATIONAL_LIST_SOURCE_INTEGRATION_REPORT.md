# KYDEX Lebanon National List Source Integration Report

## Scope Completed

This implementation adds Lebanon national list support under source code `LEBANON_NATIONAL_LIST` with Arabic label `اللائحة الوطنية` across:

- source-library registration
- XLS download and hash-based change detection
- import into `Source*` tables
- screening-ready `DataSource` / `DataSourceVersion` / `WatchlistRecord` sync
- daily Beirut scheduler
- admin source endpoints
- dashboard source pages
- screening default source ordering
- CSV and JSON exports through existing generic list-download flow

## Backend Changes

### Source registration

Implemented in:
- `prisma/seed.ts`
- `apps/api/src/sources/sources.service.ts`
- `apps/api/src/data-sources/data-sources.service.ts`

Behavior:
- upserts `KydexDataSource` row for `LEBANON_NATIONAL_LIST`
- upserts `DataSource` row for `LEBANON_NATIONAL_LIST`
- auto-bootstraps the source on first status/import lookup even before seed is run

### Import pipeline

Implemented in:
- `apps/api/src/sources/sources.service.ts`

New behavior:
- downloads Lebanon XLS from `LEBANON_NATIONAL_LIST_XLS_URL`
- computes SHA-256 hash
- skips re-import when the latest imported file hash is unchanged and a valid local copy exists
- parses the first worksheet using `xlsx`
- detects flexible headers
- imports into:
  - `SourceFile`
  - `SourceImportedList`
  - `SourceEntity`
  - `SourceName`
  - `SourceNameVariant`
- also mirrors the imported data into screening-side tables:
  - `DataSourceVersion`
  - `WatchlistRecord`
- archives prior active Lebanon screening version before promoting the new one

### Scheduler

Implemented in:
- `apps/api/src/sources/lebanon-national-list.scheduler.ts`
- `apps/api/src/sources/sources.module.ts`

Behavior:
- cron expression: `30 2 * * *`
- timezone: `Asia/Beirut`
- writes success/failure audit events:
  - `LEBANON_SOURCE_SYNC_COMPLETED`
  - `LEBANON_SOURCE_SYNC_FAILED`

### API endpoints

Available endpoints:
- `POST /api/v1/sources/lebanon-national-list/sync`
- `GET /api/v1/sources/LEBANON_NATIONAL_LIST/status`
- `GET /api/v1/sources/LEBANON_NATIONAL_LIST/import-status`
- `GET /api/v1/sources/LEBANON_NATIONAL_LIST/sync-runs`
- `GET /api/v1/sources/LEBANON_NATIONAL_LIST/lists`
- `GET /api/v1/sources/LEBANON_NATIONAL_LIST/lists/:listName/preview`
- `GET /api/v1/sources/LEBANON_NATIONAL_LIST/lists/:listName/download`
- `GET /api/v1/sources/LEBANON_NATIONAL_LIST/lists/:listName/translation-status`

## Frontend Changes

### Dashboard routes

Added routes:
- `apps/web/src/app/dashboard/sources/lebanon-national-list/page.tsx`
- `apps/web/src/app/dashboard/sources/lebanon-national-list/local-lists/page.tsx`
- `apps/web/src/app/dashboard/sources/lebanon-national-list/sync/page.tsx`
- `apps/web/src/app/dashboard/sources/lebanon-national-list/downloads/page.tsx`

Updated route:
- `apps/web/src/app/dashboard/sources/page.tsx`

Behavior:
- Lebanon source card appears on sources dashboard
- source detail page shows health and import metrics
- local-lists page supports preview, search, Arabic/English toggle, and pagination
- sync page supports manual sync trigger and sync-run history
- downloads page supports CSV and JSON export for imported lists

### Screening defaults

Updated in:
- `apps/web/src/app/screening/new/page.tsx`
- `apps/api/src/ofac-screening/ofac-screening.service.ts`
- `apps/api/src/screening/screening.service.ts`
- `apps/api/src/common/pipes/zod-validation.pipe.ts`

Behavior:
- default source order is now:
  - `LEBANON_NATIONAL_LIST`
  - `OFAC`
- `ALL` on the legacy source-check endpoint expands to both Lebanon and OFAC
- Lebanon result/source labels render as `اللائحة الوطنية`

## Non-Regression Notes

The implementation preserves:
- OFAC source routes and dashboard
- existing source-library generic preview/download/translation endpoints
- OCR and WordPress flows
- existing fallback/local-copy behavior

The Lebanon importer is isolated to Lebanon-specific source rows and does not overwrite OFAC logic.

## Validation Status

Validated successfully:
- `npm run build -w @kydex/api`
- `npm run build -w @kydex/web`

Validated web route generation includes:
- `/dashboard/sources/lebanon-national-list`
- `/dashboard/sources/lebanon-national-list/local-lists`
- `/dashboard/sources/lebanon-national-list/sync`
- `/dashboard/sources/lebanon-national-list/downloads`

## Runtime Requirements

Set the following environment variable before using the importer or scheduler:

- `LEBANON_NATIONAL_LIST_XLS_URL=<official XLS or XLSX URL>`

Optional scheduler toggle:

- `LEBANON_NATIONAL_SYNC_ENABLED=true`

## Remaining Operational Step

The feature is code-complete in this workspace. The only remaining deployment/runtime dependency is providing the real official Lebanon XLS URL and then triggering either:

- the manual sync endpoint, or
- the scheduled 02:30 Beirut run.
