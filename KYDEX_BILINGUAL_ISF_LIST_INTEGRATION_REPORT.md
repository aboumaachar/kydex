# KYDEX Bilingual ISF List Integration Report

Date: 2026-05-06
Workspace: c:\\kydex
Target env: https://kydex.me

## Delivered and Deployed
1. Bilingual ingestion/search support was deployed to production API.
2. Final deployed files:
	1. apps/api/src/sources/sources.service.ts
	2. apps/api/src/name-normalization/name-normalization.service.ts
	3. apps/api/src/ofac-screening/ofac-screening.service.ts
3. Deployment marker observed on server run:
	1. API_BILINGUAL_PATCH_DEPLOYED

## Import and Coverage Proof
Live checks returned:
1. importedListCount=1
2. sourceEntityCount=288
3. sourceNameCount=288
4. sourceNameVariantCount=1474
5. localCopyAvailable=true
6. lastSuccessfulSyncAt=2026-05-06T05:10:55.886Z
7. Arabic coverage for entities/names remained 100%

## Searchability Proof After Deploy
From post-fix validation artifact `c:\\kydex\\post_fix_notary_sandra_validation.json`:
1. SCREEN_TOP_LEB=6
2. DIRECT_TOP_LEB=6
3. SANDRA_TOP_LEB=6
4. NOISE_DIRECT=0
5. NOISE_SANDRA=0

## Status Endpoint Observation
Latest `/api/v1/sources/LEBANON_NATIONAL_LIST/status` snapshot saved in:
1. c:\\kydex\\lebanon_status_after_bilingual_patch.json

Observed fields:
1. status=fallback_available
2. localCopyAvailable=true
3. lastSuccessfulSyncAt=2026-05-06T05:10:55.886Z
4. bilingualFeeds.ar=null
5. bilingualFeeds.en=null
6. bilingualFeeds.merged=null

## Environment Variable Observation
`pm2 env 51` output does not show:
1. LEBANON_NATIONAL_LIST_AR_XLS_URL
2. LEBANON_NATIONAL_LIST_EN_XLS_URL
3. LEBANON_NATIONAL_LIST_XLS_URL

## Conclusion
1. Local Lebanon import/search pipeline is operational and searchable in production.
2. Core/notary/Sandra Lebanon matching parity is now proven on known records.
3. If strict bilingual feed URL/status visibility is required, production env/feed metadata still needs final wiring so `bilingualFeeds` is populated.
