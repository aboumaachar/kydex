# KYDEX Phase 8F Dashboard Completion Report

Date: 2026-05-01
Workspace: C:\kydex

## Scope

Implemented Phase 8F dashboard surfaces for:

- Source library and OFAC local-copy visibility
- OFAC status, sync/import operations, and logs
- Screening logs UI wired to live `GET /api/v1/screening/logs`
- Screening logs error classification hardened for auth, not-found, network, and server failures
- Incoming inquiries list and inquiry detail views

No auth/session logic was changed.
No OFAC import logic was changed.
No fallback logic was changed.
No WordPress plugin API contracts were changed.

## Implemented Routes

All required dashboard routes are implemented under `apps/web/src/app`:

- `/dashboard/sources`
- `/dashboard/sources/ofac`
- `/dashboard/sources/ofac/local-lists`
- `/dashboard/sources/ofac/sync`
- `/dashboard/sources/ofac/logs`
- `/dashboard/screening/logs`
- `/dashboard/inquiries`
- `/dashboard/inquiries/[id]`

## Files Changed

### API Client + Types

Updated:
- `apps/web/src/lib/api.ts`

Additional update:
- Introduced `ApiRequestError` to preserve HTTP status and network failure type for deterministic dashboard error handling

### Backend Screening Logs Endpoint

Added/Updated:
- `apps/api/src/ofac-screening/dto/screening-logs-query.dto.ts`
- `apps/api/src/ofac-screening/ofac-screening.controller.ts`
- `apps/api/src/ofac-screening/ofac-screening.service.ts`

Implemented:
- Guarded `GET /api/v1/screening/logs` endpoint with role-based access
- Pagination (`take`, `skip`) and optional filters (`sourceMode`, `usedFallback`, `status`, `requesterSlug`, `apiClient`, `query`, `dateFrom`, `dateTo`)
- Response payload from `ScreeningTransaction` with dashboard-required fields

Added typed API bindings for:
- `GET /api/v1/sources`
- `GET /api/v1/sources/:source/status`
- `POST /api/v1/sources/:source/health-check`
- `GET /api/v1/sources/:source/import-status`
- `POST /api/v1/sources/:source/import-from-legacy`
- `GET /api/v1/sources/:source/lists`
- `GET /api/v1/sources/:source/lists/:listName/preview`
- `GET /api/v1/sources/:source/sync-runs`
- `GET /api/v1/inquiries`
- `GET /api/v1/inquiries/:id`
- `GET /api/v1/screening/logs`

### Dashboard Navigation

Updated:
- `apps/web/src/components/dashboard-nav.tsx`

Added Source Intelligence links:
- Sources
- OFAC Status
- OFAC Local Lists
- OFAC Sync
- OFAC Logs
- Screening Logs
- Inquiries

### Shared Dashboard Shell / States

Added:
- `apps/web/src/app/dashboard/_components/dashboard-shell.tsx`

Provides:
- Dark KYDEX dashboard page shell with sidebar integration
- Reusable cards, action buttons, status pills
- Loading/empty/error state components

### New Dashboard Pages

Added:
- `apps/web/src/app/dashboard/sources/page.tsx`
- `apps/web/src/app/dashboard/sources/ofac/page.tsx`
- `apps/web/src/app/dashboard/sources/ofac/local-lists/page.tsx`
- `apps/web/src/app/dashboard/sources/ofac/sync/page.tsx`
- `apps/web/src/app/dashboard/sources/ofac/logs/page.tsx`
- `apps/web/src/app/dashboard/screening/logs/page.tsx`
- `apps/web/src/app/dashboard/inquiries/page.tsx`
- `apps/web/src/app/dashboard/inquiries/[id]/page.tsx`

## Page Behavior Coverage

### `/dashboard/sources`

Implemented:
- Source cards with OFAC priority card
- OFAC card fields:
  - status
  - local availability
  - fallback enabled
  - last sync/import timestamps
  - record counts from import-status
- Links to OFAC detail, lists, sync, logs
- Loading/empty/error/refresh behavior

### `/dashboard/sources/ofac`

Implemented:
- OFAC health/status detail card
- Local Source* counts card
- Fallback readiness summary
- Last error + latency
- Manual health-check button (`POST /sources/OFAC/health-check`)
- Loading/error/refresh behavior

### `/dashboard/sources/ofac/local-lists`

Implemented:
- List selector (SDN / Consolidated)
- Local search/filter input (client-side filter over preview rows)
- API pagination controls (`take`/`skip`)
- Required columns:
  - entity ID
  - primary name
  - entity type
  - list
  - programs
  - countries
  - alias count
  - imported date
- Loading/empty/error/refresh behavior

### `/dashboard/sources/ofac/sync`

Implemented:
- Import status summary
- Sync runs table
- Import-from-legacy action button
- Warning and confirmation before running import
- No auto import on page load
- Loading/error/refresh behavior

### `/dashboard/sources/ofac/logs`

Implemented:
- Source connection snapshot (status/latency/error/health timestamp)
- Source sync run log table
- Loading/empty/error/refresh behavior

### `/dashboard/screening/logs`

Implemented:
- Attempts to fetch `GET /api/v1/screening/logs`
- Renders table with required columns from real API records
- Error classification now maps to explicit user-facing states:
  - `401/403`: `Session expired or unauthorized. Please sign in again.` + `Go to Login`
  - `404`: `Endpoint unavailable or not yet exposed.`
  - network failure: `KYDEX API is unreachable. Check that the API server is running.`
  - `500`: `Server error while loading screening logs.`
- Loading/error/refresh behavior

### `/dashboard/inquiries`

Implemented:
- Incoming inquiries table using `GET /api/v1/inquiries`
- Inquiry + transaction summary fields
- Links to detail pages
- Loading/empty/error/refresh behavior

### `/dashboard/inquiries/[id]`

Implemented:
- Detailed inquiry surface using `GET /api/v1/inquiries/:id`
- Linked transaction details including fallback/source metadata
- Payload inspectors (`originalPayload`, `responsePayload`)
- Loading/error/refresh behavior

## Build Validation

Command:

```powershell
npm run build -w @kydex/web
```

Result:
- Pass (`next build` succeeded)
- Required Phase 8F routes generated:
  - `/dashboard/sources`
  - `/dashboard/sources/ofac`
  - `/dashboard/sources/ofac/local-lists`
  - `/dashboard/sources/ofac/sync`
  - `/dashboard/sources/ofac/logs`
  - `/dashboard/screening/logs`
  - `/dashboard/inquiries`
  - `/dashboard/inquiries/[id]`

## Runtime Verification Evidence

Using authenticated dashboard session in browser:

1. `/dashboard` renders with shell + updated sidebar links.
2. `/dashboard/sources` renders with OFAC card and source registry data.
3. `/dashboard/sources/ofac` renders with health/fallback/import metrics.
4. `/dashboard/sources/ofac/local-lists` shows SDN records (example total observed: `11241` and visible SDN rows with entity IDs/names).
5. `/dashboard/inquiries` shows inquiry data (observed total > 0, rows rendered with links).
6. `/dashboard/inquiries/:id` renders detailed inquiry and linked transaction payloads.
7. `/dashboard/screening/logs` renders live rows from `GET /api/v1/screening/logs` after re-authentication.
  - Observed rows include queries (`محمد علي`, `Mohammad Ali`), source modes (`local_fallback`, `local_only`), fallback flags, status, score, API client, IP, response time, and timestamps.
8. Logged-out access to `/dashboard/screening/logs` redirects to `/login` (existing auth/session behavior), and `401/403` is no longer interpreted as endpoint missing.

## Constraints Compliance

Validated:
- Current KYDEX dashboard shell used.
- Dark dashboard styling used consistently.
- Auth/session logic untouched.
- OFAC import and fallback logic untouched.
- WordPress API contract untouched.
- Loading/empty/error states added across pages.
- Refresh actions added where relevant.
- No LCN/Council content reintroduced in new pages.
- No individual notary theme code introduced.

## Notes

1. `GET /api/v1/screening/logs` is now implemented and exposed by API controllers and consumed by the dashboard.
2. Existing unavailable-state text is now reserved for `404` only, preventing stale-auth (`401/403`) from being mislabeled as endpoint missing.
3. `/dashboard/sources/ofac/logs` uses available source status + sync-runs data as the operational log surface in current backend capabilities.
