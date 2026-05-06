# KYDEX Sandra National List Search Fix Report

Date: 2026-05-06
Workspace: c:\\kydex

## Objective
Ensure Sandra and notary local searches use the same working Lebanon engine path as core screening and return Lebanon matches when evidence exists.

## Implemented Fix

### 1) Notary local path unified with core engine
`/api/v1/notaries/:slug/screening/search` was updated so local-only requests (`sources=['LEBANON_NATIONAL_LIST']`) are handled via core `ScreeningService` logic already proven in `/api/v1/screen`.

### 2) Module wiring for DI
`NotariesModule` imports `ScreeningModule` so controller can inject and use core screening path.

### 3) Response compatibility preserved
Notary/Sandra response shape remains compatible (`matches`, `source`, `sourceDisplayNameAr`, `auditId`, etc.) while using unified matching internals.

## Files Updated and Deployed
1. apps/api/src/notaries/notary-screening.controller.ts
2. apps/api/src/notaries/notaries.module.ts
3. apps/api/src/ofac-screening/ofac-screening.service.ts
4. apps/api/src/name-normalization/name-normalization.service.ts
5. apps/api/src/sources/sources.service.ts

## Runtime Validation (Final)
Evidence file:
1. c:\\kydex\\post_fix_notary_sandra_validation.json

Final metrics:
1. KNOWN_COUNT=6
2. SCREEN_TOP_LEB=6
3. DIRECT_TOP_LEB=6
4. SANDRA_TOP_LEB=6
5. NOISE_DIRECT=0
6. NOISE_SANDRA=0

## Scope Mapping Validation
Sandra `sourceScope` behavior verified:
1. all -> `LEBANON_NATIONAL_LIST,OFAC`
2. local -> `LEBANON_NATIONAL_LIST`
3. ofac -> `OFAC`

## Rate-Limit Validation Window
1. Notary plan was temporarily set to ENTERPRISE for validation run.
2. After validation completion, plan restored to BASIC.

## Conclusion
1. Sandra/notary local-runtime mismatch is resolved in production.
2. Known-record acceptance criteria are met end-to-end without artificial score inflation.
