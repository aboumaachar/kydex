# KYDEX National List Search Failure Investigation Report

Date: 2026-05-06
Workspace: c:\\kydex

## Objective
Identify why Lebanon source priority was not producing expected matches in Sandra/notary search flow.

## Confirmed Root Cause
1. Active Sandra flow calls notary endpoint, not dashboard screening UI.
2. Notary endpoint uses OfacScreeningService.
3. Existing notary search candidate retrieval was OFAC legacy-table based (OfacName/OfacEntity), so Lebanon local records in WatchlistRecord were not meaningfully searched.

## Evidence Collected
1. Notary controller delegates search to OfacScreeningService.
2. Sources pipeline imported Lebanon data into source-library models and mirrored to DataSourceVersion/WatchlistRecord.
3. Sandra proxy sourceScope=all behavior already requested Lebanon + OFAC, but response candidate generation remained OFAC-centric.

## Scope Investigated
1. apps/api/src/notaries/notary-screening.controller.ts
2. apps/api/src/ofac-screening/ofac-screening.service.ts
3. apps/api/src/sources/sources.service.ts
4. apps/api/src/source-library/source-library.service.ts
5. apps/api/src/screening/screening.service.ts
6. prisma/schema.prisma

## Risk Assessment (Pre-fix)
1. Functional risk: high (Lebanon source often absent from real candidate set).
2. Compliance risk: high (local source expected as first-class source in Lebanon context).
3. UX trust risk: high (users see configured source priority but not expected source matches).

## Conclusion
Primary failure was endpoint-path mismatch: Sandra/notary requests were source-aware at request level, but the active matching path was still largely OFAC-legacy candidate retrieval. Priority ordering alone could not fix this without expanding the underlying candidate search set.

## Runtime Validation Executed
1. Sandra proxy login/search was executed successfully with office session.
2. Sandra `sourceScope=all` returns `usedSources=LEBANON_NATIONAL_LIST,OFAC`.
3. Query sample (`ahmed`) returned `COUNT=3` with sources in result cards as OFAC for that sample.
4. Multi-query smoke run (`ahmed`, `mohammad`, `محمد`, `ali`, `hassan`, `ibrahim`, `mohamad ali`, `abbas`, `fatima`, `mostafa`) confirmed:
1. request sources are correctly expanded in all-scope mode,
2. returned matches in tested samples were OFAC or empty (no false Lebanon-only injection).
5. Browser UI run confirmed scope mapping behavior:
1. `جميع المصادر` -> used sources shown as `اللائحة الوطنية، OFAC`,
2. `اللائحة الوطنية` -> used source shown as `اللائحة الوطنية` only,
3. `OFAC` -> used source shown as `OFAC` only.
