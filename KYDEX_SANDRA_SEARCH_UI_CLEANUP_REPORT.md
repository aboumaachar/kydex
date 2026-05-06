# KYDEX Sandra Search UI Cleanup Report

Date: 2026-05-06
Target: https://kydex.me/sandra
Scope: Sandra single-notary search UI and Sandra proxy integration with KYDEX notary endpoint.

## Summary

Implemented a full cleanup of the search experience after login on Sandra page:
- Removed raw JSON/script-like output from normal user view.
- Introduced clean Arabic result cards, summary box, filters, and expandable details panel.
- Preserved secure architecture (browser -> Sandra proxy -> KYDEX notary endpoint).
- Enforced default source set at proxy level: LEBANON_NATIONAL_LIST + OFAC.
- Added source-priority tie-break logic favoring Lebanese source only when match quality is similar.

## Files Updated

1. C:\Users\User\Desktop\sandra\index.html
- Reworked search UI controls and labels in Arabic.
- Added required buttons: "بحث" and "مسح النتائج".
- Added summary panel with query/result count/sources/audit ID.
- Added filters:
  - بحث داخل النتائج
  - المصدر (جميع المصادر / اللائحة الوطنية / OFAC)
  - مستوى المخاطر (الكل / منخفض / متوسط / مرتفع)
  - درجة التشابه الأدنى
  - ترتيب النتائج (اللائحة الوطنية أولاً / الأعلى تشابهاً / الأعلى خطورة)
- Added clean cards with:
  - الاسم المدرج
  - المصدر
  - اللائحة
  - درجة التشابه
  - مستوى المخاطر
  - سبب الظهور
  - الاسم البديل المطابق
- Added details toggle "عرض التفاصيل" with allowed fields only.
- Added compliance disclaimer below results.
- Removed `<pre>`/raw JSON rendering from normal display.

2. C:\Users\User\Desktop\sandra\api\kydex-search.php
- Kept proxy-only secure design; no browser direct KYDEX call.
- Default source behavior now sends:
  - ["LEBANON_NATIONAL_LIST", "OFAC"] for sourceScope=all.
- Preserved scoped calls:
  - sourceScope=lebanon/local -> ["LEBANON_NATIONAL_LIST"]
  - sourceScope=ofac -> ["OFAC"]
- Proxy call remains:
  - https://kydex.me/api/v1/notaries/sandranassif/screening/search
- Normalized response match fields to include:
  - matchedName
  - matchedAlias
  - matchedField
  - source
  - sourceDisplayNameAr
  - listName
  - score
  - riskLevel
  - classification
  - matchEvidence
  - simplifiedArabicReason
  - entityId
  - sourceVersion
  - programs
  - categories
  - sourcePriority
  - sourcePriorityBoost
  - finalSortScore
- Added response-level fields:
  - auditId
  - usedSources
  - usedSourcesAr
  - resultCount

## Sorting and Source Priority Logic

Implemented in proxy and UI sorting behavior:
- sourcePriority:
  - LEBANON_NATIONAL_LIST = 100
  - OFAC = 50
- Similarity-first principle maintained:
  - Primary ordering by score.
  - If score difference <= 5, Lebanese source is prioritized.
- This avoids inflating weak local records while favoring local source in near-tie quality situations.

## Security Requirements Verification

Verified:
- Browser calls Sandra proxy endpoint only for search:
  - /sandra/api/kydex-search.php
- Browser does not call KYDEX notary endpoint directly.
- No KYDEX key literal or notary key header appears in HTML source.
- Header `x-kydex-notary-key` remains server-side in proxy only.

## Deployment

Deployed to production:
- /home/kydex/public_html/sandra/index.html
- /home/kydex/public_html/sandra/api/kydex-search.php

Post-deploy check:
- PHP lint passed on server for proxy file.

## Live Validation Results

1. Login to Sandra page: PASS
2. Search `ahmed`: PASS
- No raw JSON or black script/pre/code blocks.
- Clean result cards displayed.
- Summary displayed with audit ID.

3. Filters: PASS
- Source filter updates displayed results.
- Empty-state text shown correctly when no records match selected filter.

4. Clear button behavior: PASS
- Clears search input.
- Clears displayed results and summary.
- Clears filter values.
- Resets source selector to "جميع المصادر".
- Hides previous audit/result messages and disclaimer.

5. Network model: PASS
- Resource entries show Sandra API endpoints, including /sandra/api/kydex-search.php.
- No direct browser call observed to KYDEX notary endpoint during UI flow.

6. Key exposure checks: PASS
- `KYDEX_NOTARY_API_KEY` not present in page HTML.
- `x-kydex-notary-key` not present in page HTML.
- `kydex_notary_` token pattern not present in page HTML.

## Notes

- Tested query `Mohammad Ali` returned OFAC results with both sources requested. In this sample, no Lebanese records were returned by upstream matching; tie-break logic is implemented and active for mixed-source result sets when score quality is comparable.
- Classification/risk Arabic labels are implemented in UI mapping and displayed when values are present.

## Additional Proceed Validation

- Ran a broader live probe against `/sandra/api/kydex-search.php` with multiple queries (`ahmed`, `mohammad`, `hassan`, `ibrahim`, etc.).
- Confirmed proxy response consistently includes `usedSources=LEBANON_NATIONAL_LIST,OFAC` in `sourceScope=all`.
- In current upstream result samples, returned matches were OFAC-only for tested names (Lebanese source queried but no matching records returned for these terms).
- Verified front-end tie-break comparator behavior with synthetic mixed-source test data in browser runtime:
  - Near-tie scores (`OFAC=80`, `Lebanon=78`) -> Lebanon result sorted first.
  - Large score gap (`OFAC=95`, `Lebanon=80`) -> OFAC stronger result remains first.

## Final Status

Completed and deployed.
