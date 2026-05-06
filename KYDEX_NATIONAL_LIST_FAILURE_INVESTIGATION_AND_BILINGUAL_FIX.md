# KYDEX National List Search Failure Investigation + Bilingual ISF Integration Fix

## Purpose

This document remaps the current KYDEX/Sandra build and explains why previous instructions to prioritize `LEBANON_NATIONAL_LIST` / `اللائحة الوطنية` may still fail to produce proper search matches. It then defines a full investigation and implementation plan to integrate both ISF files into one bilingual national source and make the search results authentic, explainable, and source-prioritized.

---

## 1. Current Required Source Model

KYDEX must treat the Lebanese ISF list as an official local source.

### Source display name

```text
اللائحة الوطنية
```

### Technical source code

```text
LEBANON_NATIONAL_LIST
```

### Required source files

```text
Arabic / local file:
https://isf.gov.lb/wp-content/uploads/2024/12/file.xls

English file:
https://isf.gov.lb/wp-content/uploads/2025/04/en_file.xls
```

### Required priority

```text
1. LEBANON_NATIONAL_LIST / اللائحة الوطنية
2. OFAC
```

When the user selects:

```text
جميع المصادر
```

KYDEX must internally resolve this to:

```json
["LEBANON_NATIONAL_LIST", "OFAC"]
```

The source priority must affect ordering only **after** a real name/token/alias/identifier match exists. Priority must not generate false positives.

---

## 2. What the Current Build Appears to Have

Based on the existing implementation logs, KYDEX already has some national-list work in place:

```text
- LEBANON_NATIONAL_LIST registration / auto-bootstrap
- XLS download/hash path
- flexible XLS parsing using xlsx
- import into source-library tables
- mirroring into DataSourceVersion and WatchlistRecord
- dashboard pages for overview, local lists, sync, and downloads
- screening default changed in one web screening page to prioritize Lebanon before OFAC
- API client gained manual sync action
- API and web builds passed
```

The logs also show that one runtime dependency was required for the first version:

```text
LEBANON_NATIONAL_LIST_XLS_URL
```

and that the first implementation only referenced the Arabic/local XLS file.

---

## 3. Why Search May Still Fail Despite “Priority” Being Implemented

The failure is likely caused by a combination of source-ingestion, request-payload, matching-engine, and UI-rendering issues.

### 3.1 Only one ISF file was integrated

The initial implementation was built around:

```text
https://isf.gov.lb/wp-content/uploads/2024/12/file.xls
```

But KYDEX must now integrate both:

```text
https://isf.gov.lb/wp-content/uploads/2024/12/file.xls
https://isf.gov.lb/wp-content/uploads/2025/04/en_file.xls
```

If the English file is not imported, English searches may not match the local national source. If the Arabic file is imported without proper Arabic normalization and Latin transliteration, English or transliterated searches may also fail.

### 3.2 “Priority” may be implemented only in the web UI, not in the backend endpoint

The logs indicate that screening defaults were updated in:

```text
apps/web/src/app/screening/new/page.tsx
```

But Sandra does not use that page directly. Sandra calls:

```text
/sandra/api/kydex-search.php
```

which then calls:

```text
/api/v1/notaries/sandranassif/screening/search
```

Therefore, the priority might exist in the KYDEX dashboard screening UI but not in:

```text
POST /api/v1/notaries/:slug/screening/search
```

This must be investigated.

### 3.3 Sandra may be sending `OFAC` only

One earlier smoke test used:

```json
{
  "sources": ["OFAC"]
}
```

If Sandra’s `sourceScope` mapping still sends only `OFAC`, then `LEBANON_NATIONAL_LIST` will never be searched from Sandra, even if KYDEX supports it.

Sandra must map source scopes as follows:

```text
sourceScope=all   → ["LEBANON_NATIONAL_LIST", "OFAC"]
sourceScope=local → ["LEBANON_NATIONAL_LIST"]
sourceScope=ofac  → ["OFAC"]
```

### 3.4 National-list records may be imported but not searched by the active screening service

The import path reportedly mirrors into:

```text
DataSourceVersion
WatchlistRecord
```

But previous Phase 8 work also created:

```text
SourceImportedList
SourceEntity
SourceName
SourceNameVariant
```

The active notary screening endpoint may still be searching one model while the national-list import populated another.

This must be checked carefully:

```text
Does /api/v1/notaries/:slug/screening/search search WatchlistRecord?
Does it search SourceNameVariant?
Does it search legacy OfacEntity only?
Does it search DataSourceVersion records?
Does it search LEBANON_NATIONAL_LIST at all?
```

### 3.5 The XLS parser may have imported the wrong column as the primary name

If the parser guessed the wrong header or stored names only inside `rawSourceRecord`, search will not match.

The integration must prove:

```text
primaryName exists
primaryNameAr exists where available
primaryNameEn exists where available
normalizedArabic exists
normalizedLatin exists
tokens exist
SourceNameVariant rows exist
WatchlistRecord name fields exist
```

### 3.6 Arabic / English / transliteration variants may not be generated

For the local list to feel authentic, each source record needs searchable variants:

```text
Arabic original
Arabic normalized
Latin transliteration
English original
Arabic transliteration of English
family-name tokens
single-name tokens
alias tokens
phonetic variants
```

Without this, searches like:

```text
Ahmad
Ahmed
أحمد
احمد
Mohammad
محمد
Hassan
حسن
```

may fail or return irrelevant matches.

### 3.7 Wrong keyboard-layout input is not being handled

The user example contains Arabic-looking text that appears to be English typed while Arabic keyboard layout was active. KYDEX should detect wrong-keyboard input and generate corrected variants.

Example concept:

```text
قثسعمفثي → resulted
صهفا → with
هىرثسفهلشفث → investigate
```

For names, if a user types a Latin name while the Arabic keyboard is active, KYDEX should generate a corrected Latin query variant and search with it.

### 3.8 Candidate evidence gate may be missing or too weak

KYDEX must not return records only because they are local.

Correct matching order:

```text
1. Generate query variants.
2. Find real name/alias/token/identifier evidence.
3. Score the candidate.
4. Apply source priority boost only after evidence exists.
5. Sort national-list results ahead of OFAC when match quality is similar.
```

Incorrect behavior:

```text
1. Source is local.
2. Give priority.
3. Return unrelated record.
```

This degrades trust.

---

## 4. Required Investigation Map

Run this investigation before patching.

### 4.1 Inspect source environment

Check production and local env:

```bash
printenv | grep LEBANON_NATIONAL_LIST
```

Expected:

```text
LEBANON_NATIONAL_LIST_AR_XLS_URL=https://isf.gov.lb/wp-content/uploads/2024/12/file.xls
LEBANON_NATIONAL_LIST_EN_XLS_URL=https://isf.gov.lb/wp-content/uploads/2025/04/en_file.xls
```

Backward compatibility:

```text
LEBANON_NATIONAL_LIST_XLS_URL=https://isf.gov.lb/wp-content/uploads/2024/12/file.xls
```

### 4.2 Inspect source status

```bash
curl -i https://kydex.me/api/v1/sources/LEBANON_NATIONAL_LIST/status
curl -i https://kydex.me/api/v1/sources/LEBANON_NATIONAL_LIST/lists
```

Required status response must show:

```text
Arabic file URL
English file URL
Arabic file hash
English file hash
Arabic row count
English row count
merged entity count
localCopyAvailable=true
lastSuccessfulSyncAt
```

### 4.3 Inspect database counts

Check whether national-list records exist in all expected tables:

```sql
SELECT COUNT(*) FROM "KydexDataSource" WHERE code='LEBANON_NATIONAL_LIST';
SELECT COUNT(*) FROM "SourceImportedList" WHERE "sourceCode"='LEBANON_NATIONAL_LIST';
SELECT COUNT(*) FROM "SourceEntity" WHERE "sourceCode"='LEBANON_NATIONAL_LIST';
SELECT COUNT(*) FROM "SourceName" WHERE "sourceCode"='LEBANON_NATIONAL_LIST';
SELECT COUNT(*) FROM "SourceNameVariant" WHERE "sourceCode"='LEBANON_NATIONAL_LIST';
SELECT COUNT(*) FROM "WatchlistRecord" WHERE "sourceCode"='LEBANON_NATIONAL_LIST';
```

If `WatchlistRecord` is populated but `SourceNameVariant` is empty, or vice versa, the screening service may be searching the wrong table.

### 4.4 Inspect imported field quality

Sample 20 records:

```sql
SELECT id, "sourceEntityId", "primaryName", "primaryNameAr", "primaryNameEn", "rawSourceRecord"
FROM "SourceEntity"
WHERE "sourceCode"='LEBANON_NATIONAL_LIST'
LIMIT 20;
```

Check:

```text
Are names real?
Are Arabic names present?
Are English names present?
Did the parser pick the correct column?
Are rows only stored as raw JSON?
```

### 4.5 Inspect variants

```sql
SELECT "originalName", "normalizedArabic", "normalizedLatin", "tokens", "variantType"
FROM "SourceNameVariant"
WHERE "sourceCode"='LEBANON_NATIONAL_LIST'
LIMIT 50;
```

Confirm:

```text
Arabic variants exist
Latin variants exist
single-name tokens exist
family-name tokens exist
transliteration variants exist
keyboard-corrected variants exist where relevant
```

### 4.6 Inspect the active screening service

Search the codebase for:

```text
LEBANON_NATIONAL_LIST
WatchlistRecord
SourceEntity
SourceName
SourceNameVariant
sources
sourceScope
OFAC
```

Files to inspect:

```text
apps/api/src/screening/screening.service.ts
apps/api/src/ofac-screening/ofac-screening.service.ts
apps/api/src/notaries/notary-screening.controller.ts
apps/api/src/notaries/notary-api-key.guard.ts
apps/api/src/data-sources/data-sources.service.ts
apps/api/src/sources/sources.service.ts
apps/web/src/app/screening/new/page.tsx
Sandra: api/kydex-search.php
Sandra: kydex-search.html
```

Answer:

```text
Does the notary endpoint search national list?
Does generic KYDEX dashboard search national list?
Does Sandra proxy send the national list source?
Are all sources being normalized to uppercase?
Does the backend reject unknown source casing?
```

### 4.7 Inspect Sandra source mapping

In Sandra:

```text
api/kydex-search.php
```

Confirm:

```php
sourceScope=all   -> ['LEBANON_NATIONAL_LIST', 'OFAC']
sourceScope=local -> ['LEBANON_NATIONAL_LIST']
sourceScope=ofac  -> ['OFAC']
```

If it sends only `OFAC`, Sandra will never show local list matches.

---

## 5. Required Implementation Fix

### 5.1 Environment variables

Add support for:

```text
LEBANON_NATIONAL_LIST_AR_XLS_URL
LEBANON_NATIONAL_LIST_EN_XLS_URL
```

Default values:

```text
LEBANON_NATIONAL_LIST_AR_XLS_URL=https://isf.gov.lb/wp-content/uploads/2024/12/file.xls
LEBANON_NATIONAL_LIST_EN_XLS_URL=https://isf.gov.lb/wp-content/uploads/2025/04/en_file.xls
```

Keep support for:

```text
LEBANON_NATIONAL_LIST_XLS_URL
```

as a backward-compatible alias for the Arabic file.

### 5.2 Source-file model

Do not treat the national list as a single file. Treat it as one source with two feed files:

```text
sourceCode: LEBANON_NATIONAL_LIST
displayNameAr: اللائحة الوطنية

files:
- language: ar
  url: https://isf.gov.lb/wp-content/uploads/2024/12/file.xls

- language: en
  url: https://isf.gov.lb/wp-content/uploads/2025/04/en_file.xls
```

Each file must store:

```text
language
url
fileHash
rowCount
downloadedAt
parsedAt
activeVersion
importStatus
error
```

### 5.3 Safe bilingual import

Import flow:

```text
download AR file
download EN file
hash both
parse both into staging
detect headers
validate row count
map name columns
link AR/EN rows
generate SourceEntity rows
generate SourceName rows
generate SourceNameVariant rows
mirror into WatchlistRecord / DataSourceVersion if needed
mark new version active
keep old active version if new import fails
```

Never delete the current working local list until the new bilingual import is validated.

### 5.4 AR/EN row merge strategy

Link Arabic and English rows using:

```text
1. official ID/document number if present
2. shared identifier if present
3. same row order only if both files have matching row count and structure
4. normalized name similarity
5. otherwise keep separate but related records
```

Each entity should support:

```text
primaryNameAr
primaryNameEn
aliasesAr
aliasesEn
rawArabicRow
rawEnglishRow
languageCoverage: ar / en / bilingual
```

### 5.5 Name variant generation

For every name, generate:

```text
original
normalizedArabic
normalizedLatin
Arabic without diacritics
Latin lowercase normalized
Arabic → Latin transliteration
Latin → Arabic transliteration
common Lebanese spelling variants
first-name token
family-name token
single-name token
phonetic key if available
wrong-keyboard corrected token
```

Examples:

```text
أحمد → Ahmad, Ahmed, Ahmet
محمد → Mohammad, Mohamed, Mohammed, Muhammad
حسن → Hassan, Hasan, Hassen
علي → Ali, Aly
```

### 5.6 Wrong-keyboard correction

Add a utility:

```text
KeyboardLayoutNormalizer
```

It should detect and generate variants for:

```text
English typed while Arabic keyboard is active
Arabic typed while English keyboard is active where applicable
```

Example:

```text
قثسعمفثي → resulted
```

For search:

```text
queryVariants should include:
original
keyboardCorrected
normalizedKeyboardCorrected
tokens from corrected form
```

If a result is matched through keyboard correction, show:

```text
سبب الظهور:
تمت مطابقة النتيجة بعد تصحيح تخطيط لوحة المفاتيح.
```

### 5.7 Matching gate

Before scoring any candidate, require one of:

```text
exact name match
near name match
alias match
token match
transliteration match
keyboard-corrected token match
identifier/document match
```

If none exists, exclude candidate.

### 5.8 Scoring and source priority

Implement:

```text
baseMatchScore = actual name/token/alias/identifier similarity
sourcePriorityBoost = only after candidate passes evidence gate
```

Suggested sorting:

```text
if source == LEBANON_NATIONAL_LIST:
  sourcePriority = 100
else if source == OFAC:
  sourcePriority = 50
else:
  sourcePriority = 0
```

Do not add source priority to `score` shown to the user.

Use it only in:

```text
finalSortScore
```

The user-visible `score` must represent actual match quality.

### 5.9 API response fields

Each match must include:

```text
matchedName
matchedNameAr
matchedNameEn
matchedAlias
matchedField
matchedToken
source
sourceDisplayNameAr
listName
score
riskLevel
classification
matchEvidence
simplifiedArabicReason
languageCoverage
sourceVersion
sourceFileLanguage
```

Response-level fields:

```text
query
normalizedQuery
queryVariants
keyboardCorrectedQuery
sourceMode
usedFallback
sourceStatus
highestScore
matches
auditId
warning
```

### 5.10 Sandra UI display

Sandra must show:

```text
المصدر: اللائحة الوطنية
```

for national-list matches.

Do not show raw JSON or black script blocks.

Show a clean list:

```text
الاسم المدرج
الاسم البديل المطابق
المصدر
اللائحة
درجة التشابه
مستوى المخاطر
سبب الظهور
رقم التدقيق
```

---

## 6. Claude/Codex Implementation Prompt

```text
You are working inside C:\\kydex and the Sandra page workspace.

Problem:
Previous instructions asked KYDEX to prioritize LEBANON_NATIONAL_LIST / اللائحة الوطنية, but the search still fails to produce proper national-list matches. The current build appears to have a one-file Lebanon source integration and dashboard routes, but the active Sandra search and notary endpoint may not actually be using the local national list properly.

Required source files:
Arabic file:
https://isf.gov.lb/wp-content/uploads/2024/12/file.xls

English file:
https://isf.gov.lb/wp-content/uploads/2025/04/en_file.xls

Objective:
Reinvestigate the current build, identify exactly why national-list priority is not producing matches, and fully integrate both ISF files as one bilingual source.

Investigation tasks:
1. Inspect env handling for:
   - LEBANON_NATIONAL_LIST_XLS_URL
   - LEBANON_NATIONAL_LIST_AR_XLS_URL
   - LEBANON_NATIONAL_LIST_EN_XLS_URL

2. Inspect source records:
   - KydexDataSource
   - SourceImportedList
   - SourceEntity
   - SourceName
   - SourceNameVariant
   - DataSourceVersion
   - WatchlistRecord

3. Determine where national-list data is actually imported:
   - Source* tables
   - WatchlistRecord
   - both
   - neither

4. Determine what the active screening endpoint actually searches:
   - POST /api/v1/screening/search
   - POST /api/v1/notaries/:slug/screening/search
   - Sandra proxy /sandra/api/kydex-search.php

5. Determine whether Sandra sends:
   - sources: ["LEBANON_NATIONAL_LIST", "OFAC"]
   or only:
   - sources: ["OFAC"]

6. Inspect the parser:
   - Does it detect correct name columns?
   - Does it import Arabic names?
   - Does it import English names?
   - Does it store raw row only?
   - Does it generate variants?

7. Inspect the matching engine:
   - Does it generate Arabic/English variants?
   - Does it generate single-name variants?
   - Does it generate keyboard-layout corrected variants?
   - Does it evidence-gate candidates before source-priority boost?
   - Does it search national list before OFAC?

Implementation tasks:
1. Add support for two feed URLs:
   - LEBANON_NATIONAL_LIST_AR_XLS_URL
   - LEBANON_NATIONAL_LIST_EN_XLS_URL

2. Keep backward compatibility:
   - LEBANON_NATIONAL_LIST_XLS_URL

3. Implement bilingual downloader:
   - download both XLS files
   - hash both
   - version both
   - preserve old version on failure

4. Implement bilingual XLS parser:
   - detect sheet/header/name columns
   - parse AR file
   - parse EN file
   - generate mapping report

5. Implement bilingual merge:
   - link rows by ID/document if available
   - then row order if safe
   - then normalized similarity
   - otherwise keep separate but related

6. Populate:
   - SourceImportedList
   - SourceEntity
   - SourceName
   - SourceNameVariant
   - DataSourceVersion / WatchlistRecord if active screening uses them

7. Generate variants:
   - Arabic normalized
   - Latin normalized
   - Arabic-to-Latin transliteration
   - Latin-to-Arabic transliteration
   - single-name tokens
   - family-name tokens
   - phonetic variants
   - keyboard-layout corrected variants

8. Update search:
   - search LEBANON_NATIONAL_LIST first
   - search OFAC second
   - require evidence gate before scoring
   - source priority affects finalSortScore only
   - never return local record only because source is local

9. Update Sandra proxy:
   - sourceScope=all -> ["LEBANON_NATIONAL_LIST", "OFAC"]
   - sourceScope=local -> ["LEBANON_NATIONAL_LIST"]
   - sourceScope=ofac -> ["OFAC"]

10. Update response:
   - include sourceDisplayNameAr
   - include matchedNameAr / matchedNameEn
   - include matchEvidence
   - include simplifiedArabicReason
   - include keyboardCorrectedQuery if used

11. Update Sandra UI:
   - show clean cards/list
   - show اللائحة الوطنية clearly
   - hide raw JSON
   - add filters
   - clear button resets input/results/filters

Validation:
1. Run:
   npm run build -w @kydex/api
   npm run build -w @kydex/web

2. Run:
   POST /api/v1/sources/lebanon-national-list/sync

3. Confirm status shows both AR and EN files.

4. Confirm preview shows:
   - Arabic records
   - English records
   - bilingual merged records

5. Search known Arabic name from file.xls.
   Expected source: اللائحة الوطنية.

6. Search known English name from en_file.xls.
   Expected source: اللائحة الوطنية.

7. Search transliterated name.
   Expected source: اللائحة الوطنية if match exists.

8. Search wrong-keyboard input.
   Expected queryVariants include keyboard-corrected form.

9. Search random sentence.
   Expected no false local matches.

10. Search from Sandra:
   sourceScope=all.
   Expected request includes LEBANON_NATIONAL_LIST first.

Deliverables:
Create:
C:\\kydex\\KYDEX_NATIONAL_LIST_SEARCH_FAILURE_INVESTIGATION_REPORT.md
C:\\kydex\\KYDEX_BILINGUAL_ISF_LIST_INTEGRATION_REPORT.md
C:\\kydex\\KYDEX_SANDRA_NATIONAL_LIST_SEARCH_FIX_REPORT.md
```

---

## 7. Manual Validation Commands

### 7.1 Sync national list

```powershell
$H = @{
  Authorization = "Bearer YOUR_ADMIN_TOKEN"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "https://kydex.me/api/v1/sources/lebanon-national-list/sync" `
  -Headers $H
```

### 7.2 Check status

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "https://kydex.me/api/v1/sources/LEBANON_NATIONAL_LIST/status" `
  -Headers $H |
ConvertTo-Json -Depth 8
```

Status must show both:

```text
Arabic file
English file
```

### 7.3 Check lists

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "https://kydex.me/api/v1/sources/LEBANON_NATIONAL_LIST/lists" `
  -Headers $H |
ConvertTo-Json -Depth 8
```

### 7.4 Direct notary screening test

```powershell
$K = "YOUR_NOTARY_KEY"

$H = @{
  "x-kydex-notary-key" = $K
  "x-kydex-client" = "external-api-client"
  "x-kydex-client-name" = "sandra-office-portal"
  "Content-Type" = "application/json"
}

$B = @{
  query = "TEST_NAME_FROM_ISF_FILE"
  screeningType = "ofac"
  sources = @("LEBANON_NATIONAL_LIST", "OFAC")
  liveVerify = $true
  clientReference = "national-list-direct-test"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://kydex.me/api/v1/notaries/sandranassif/screening/search" `
  -Headers $H `
  -Body $B |
ConvertTo-Json -Depth 8
```

Expected:

```text
sourceDisplayNameAr: اللائحة الوطنية
source: LEBANON_NATIONAL_LIST
matchedName: actual listed name
auditId: present
```

### 7.5 Sandra proxy test

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginBody = @{
  username = "office"
  password = "YOUR_OFFICE_PASSWORD"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://kydex.me/sandra/api/auth.php" `
  -WebSession $session `
  -ContentType "application/json" `
  -Body $loginBody

$searchBody = @{
  query = "TEST_NAME_FROM_ISF_FILE"
  searchType = "mixed"
  sourceScope = "all"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://kydex.me/sandra/api/kydex-search.php" `
  -WebSession $session `
  -ContentType "application/json" `
  -Body $searchBody |
ConvertTo-Json -Depth 8
```

Expected:

```text
ok: true
source: LEBANON_NATIONAL_LIST
sourceDisplayNameAr: اللائحة الوطنية
auditId present
```

---

## 8. Acceptance Criteria

This fix is complete only when:

```text
[ ] Both ISF files are downloaded and hashed.
[ ] Both files have active local source versions.
[ ] Arabic and English records are imported.
[ ] Bilingual merged entity count is visible.
[ ] SourceNameVariant includes Arabic, Latin, transliteration, token, and keyboard-corrected variants.
[ ] Search from KYDEX direct endpoint finds known Arabic-list names.
[ ] Search from KYDEX direct endpoint finds known English-list names.
[ ] Search from Sandra sourceScope=all includes LEBANON_NATIONAL_LIST first.
[ ] Result cards show المصدر: اللائحة الوطنية.
[ ] Random long text does not produce false local matches.
[ ] Raw JSON is not displayed in Sandra UI.
[ ] Clear button resets input, filters, and result data.
[ ] OFAC remains available as secondary source.
[ ] Builds pass.
[ ] Reports are created.
```

---

## 9. Final Product Rule

The national list must not merely exist in the database. It must be the first visible, explainable source in the screening result when there is real evidence.

```text
Evidence first.
Then source priority.
Never false matches.
```
