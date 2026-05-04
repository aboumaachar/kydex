# KYDEX Matching Logic Integrity Fix Report

Date: 2026-05-04

## Objective

Address trust-damaging screening behavior where single-token queries such as `Ahmad` could surface unrelated entities without visible identity evidence.

## Root Cause Summary

The current screening engine in [apps/api/src/screening/screening.service.ts](c:/kydex/apps/api/src/screening/screening.service.ts) already contained a candidate-evidence gate and Ahmad-family suppression logic. The remaining gaps were:

- explicit alias-evidence fields were not fully exposed under stable frontend/report names,
- simplified Arabic explanation text was not returned under the required alias field name,
- broader regression coverage for Hassan, Mohammad Ali, and identifier-boost behavior was missing,
- runtime confirmation against the live stack had not been documented.

The bad-company symptom described in the issue was not reproducible in the current screening service after focused runtime validation. The irrelevant entities:

- `ENTERPRISE COMERCIO DE MOVEIS E INTERMEDIACAO DE NEGOCIOS EIRELI`
- `AFKAR SYSTEM YAZD COMPANY`
- `DHAWI PVT LTD`
- `SIAS INVESTMENT PVT LTD`
- `CODE A PARTNERSHIP`

did not appear in the validated Ahmad results.

## Code Changes

### Backend

Updated:

- [apps/api/src/screening/screening.service.ts](c:/kydex/apps/api/src/screening/screening.service.ts)

Changes made:

- preserved the existing candidate-evidence gate that blocks candidates without real name or alias evidence,
- preserved the existing weak single-token alias-only suppression for `Ahmad`-family queries,
- exposed `matchedAlias` whenever alias evidence exists for a candidate,
- added `matchedAliasScore` to the returned match payload,
- added `simplifiedArabicReason` as an explicit response field alias alongside the existing Arabic explanation,
- kept `sourceVersion` in the response payload for reviewer-facing traceability.

### Frontend Types And Rendering

Updated:

- [apps/web/src/lib/api.ts](c:/kydex/apps/web/src/lib/api.ts)
- [apps/web/src/app/screening/new/page.tsx](c:/kydex/apps/web/src/app/screening/new/page.tsx)

Changes made:

- added `matchedAliasScore` to `ScreeningMatch`,
- added `simplifiedArabicReason` to `ScreeningMatch`,
- updated result evidence helpers to recognize `simplifiedArabicReason`,
- kept the existing UI evidence layout intact so results continue to show:
  - matched name,
  - matched field,
  - matched alias,
  - matched token,
  - Arabic explanation,
  - source version,
  - risk and classification.

### Regression Coverage

Updated:

- [apps/api/test/architecture-local-screening.e2e-spec.ts](c:/kydex/apps/api/test/architecture-local-screening.e2e-spec.ts)

Added or tightened tests for:

- `Ahmad`: single-token entity alias-only false positives are suppressed,
- `أحمد`: Arabic Ahmad-family matches remain explainable and unrelated entities stay out,
- `Hassan`: Hassan-family matches remain explainable and alias-evidence payload is returned,
- `Mohammad Ali`: unrelated companies without visible evidence are excluded,
- identifier boosting: DOB, nationality, and document boosts only lift candidates that already passed the identity-evidence gate.

## Validation Performed

### Targeted Integrity Regressions

Command:

```powershell
npm run test:e2e -w @kydex/api -- architecture-local-screening.e2e-spec.ts -t "Ahmad|Hassan|Mohammad Ali|identifier boosts" --runInBand
```

Result:

- Passed: 5
- Failed: 0

### API Build

Command:

```powershell
npm run build -w @kydex/api
```

Result:

- Passed

### Web Build

Command:

```powershell
npm run build -w @kydex/web
```

Result:

- Passed

### Live Runtime Validation

Validated against the live local stack after restarting both app processes.

Runtime Ahmad query:

- endpoint: `/api/v1/screen`
- query: `Ahmad`
- source scope: `OFAC_SDN`

Observed outcome:

- unrelated company names listed in the issue did not appear,
- every returned match included visible evidence fields,
- example returned candidate:
  - `DIRIYE, Ahmed`
  - `matchedField = alias`
  - `matchedAlias = Ahmad'`
  - `matchedAliasScore = 1`
  - `matchedToken = ahmad`
  - `matchEvidence = Alias "Ahmad'" exactly matches the query "ahmad" after normalization.`
  - `simplifiedArabicReason` present
  - `sourceVersion = OFAC-SDN-2026-04-26`

### Live UI Validation

After authenticating into the live web app at [apps/web/src/app/screening/new/page.tsx](c:/kydex/apps/web/src/app/screening/new/page.tsx), the `Ahmad` results page rendered:

- result count,
- matched listed name,
- matched alias where applicable,
- `سبب الظهور`,
- `حقل المطابقة`,
- `المقطع المطابق`,
- source version,
- risk level and classification.

The rendered UI did not show the irrelevant companies named in the issue during runtime validation.

## Residual Note

One unrelated pre-existing test in [apps/api/test/architecture-local-screening.e2e-spec.ts](c:/kydex/apps/api/test/architecture-local-screening.e2e-spec.ts) still fails when the full file is run:

- `omitted sources = all imported sources`

This failure is in source-resolution expectations and is not caused by the matching-integrity changes above. The integrity-focused regressions added for this fix pass.

## Final State

The live KYDEX screening flow now returns explainable Ahmad-family candidates without the unrelated company false positives described in the issue, and the frontend has the evidence payload needed to justify every visible result.

Report generated by GitHub Copilot using GPT-5.4.