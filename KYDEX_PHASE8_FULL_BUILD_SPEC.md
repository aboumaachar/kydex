# KYDEX Full Build Specification — Source Library, OFAC Local Copies, Fallback Screening, Bilingual Search, and WordPress Inquiry Relay

## Document status

This is the complete build specification for the required KYDEX upgrade.

Target phase name:

```text
Phase 8 — Source Library and Local Fallback Screening Engine
```

The purpose is to make KYDEX a central compliance screening engine that can:

- connect to OFAC and future data sources,
- import and store local copies of sanctions data,
- show source connection status,
- search local data even when origin sources are unavailable,
- normalize and transliterate Arabic/English search inputs,
- support single-name and partial-name queries,
- preview local imported lists,
- log IP addresses and all transactions,
- accept incoming inquiries from WordPress plugins and external API clients,
- return results to the original sender with audit IDs.

---

## 1. Product principle

KYDEX is the engine.

WordPress notary pages, LCN, and future external clients are only access points.

```text
OFAC / external data source
        ↓
KYDEX source connector
        ↓
KYDEX source library
        ↓
KYDEX bilingual local index
        ↓
KYDEX screening engine
        ↓
KYDEX dashboard + WordPress plugin + API clients
```

Hard rule:

```text
No WordPress site or notary webpage calls OFAC directly.
All screening requests go through KYDEX.
```

---

## 2. External OFAC source coverage

KYDEX must support the OFAC Sanctions List Service API endpoints listed in the uploaded OFAC documentation.

Required OFAC endpoints:

```text
GET /alive
GET /entities
GET /entities/{entity-id}
GET /entities?list={list-name}
GET /entities?program={program-name}
GET /entities?list={list-name}&program={program-name}
GET /api/download/{filename}
GET /changes/latest
GET /changes/{publication-id}
GET /changes/history/{year}
GET /changes/history/{year}/{month}
GET /changes/history/{year}/{month}/{day}
GET /sanctions-lists
GET /sanctions-programs
GET /api/Customize/GetCustomizeList
```

Required OFAC downloadable files to support initially:

```text
SDN_ADVANCED.XML
CONS_ADVANCED.XML
SDN_ENHANCED.XML
CONS_ENHANCED.XML
SDN.CSV
CONSOLIDATED.XML
SDN.XML
CONSOLIDATED.ZIP
ALT.CSV
ADD.CSV
CONS_ALT.CSV
CONS_ADD.CSV
```

---

## 3. Backend modules to build or extend

Recommended NestJS module structure:

```text
apps/api/src/modules/sources
apps/api/src/modules/ofac
apps/api/src/modules/source-library
apps/api/src/modules/name-normalization
apps/api/src/modules/screening
apps/api/src/modules/inquiries
apps/api/src/modules/notaries
apps/api/src/modules/audit
apps/api/src/modules/ip-logging
```

### 3.1 Sources module

Responsible for:

- source registry,
- connection status,
- source health checks,
- fallback availability,
- source metadata.

APIs:

```text
GET  /api/v1/sources
GET  /api/v1/sources/:source/status
POST /api/v1/sources/:source/health-check
POST /api/v1/sources/:source/sync
GET  /api/v1/sources/:source/sync-runs
```

---

### 3.2 OFAC module

Responsible for:

- OFAC HTTP client,
- `/alive`,
- `/sanctions-lists`,
- `/sanctions-programs`,
- `/entities`,
- downloads,
- changes,
- local import.

APIs:

```text
GET  /api/v1/ofac/health
GET  /api/v1/ofac/lists
GET  /api/v1/ofac/programs
GET  /api/v1/ofac/changes/latest
GET  /api/v1/ofac/entities/:entityId
POST /api/v1/ofac/sync
GET  /api/v1/ofac/sync/status
```

---

### 3.3 Source library module

Responsible for:

- imported local lists,
- local preview,
- local source files,
- local source entities,
- source record counts.

APIs:

```text
GET /api/v1/sources/:source/lists
GET /api/v1/sources/:source/lists/:listName/preview
GET /api/v1/sources/:source/entities/:entityId
GET /api/v1/sources/:source/files
```

---

### 3.4 Name normalization module

Responsible for:

- Arabic normalization,
- Latin normalization,
- transliteration,
- reverse transliteration,
- tokenization,
- phonetic keys,
- alias expansion,
- single-name handling.

Internal services:

```text
NameNormalizerService
ArabicNameNormalizerService
LatinNameNormalizerService
TransliterationService
QueryVariantService
PhoneticKeyService
```

---

### 3.5 Screening module

Responsible for:

- local-first screening,
- fallback behavior,
- scoring,
- match ranking,
- local/source merge,
- audit creation.

APIs:

```text
POST /api/v1/screening/search
POST /api/v1/screening/search/live-verify
GET  /api/v1/screening/audit/:id
GET  /api/v1/screening/logs
```

---

### 3.6 Inquiries module

Responsible for:

- accepting incoming external inquiries,
- validating API keys,
- logging request metadata,
- returning results to sender,
- tracking transaction lifecycle.

APIs:

```text
POST /api/v1/inquiries/screen
GET  /api/v1/inquiries
GET  /api/v1/inquiries/:id
```

---

### 3.7 Notaries module

Responsible for:

- notary plugin/API client validation,
- API key hashing,
- membership/feature access,
- notary-specific screening,
- notary audit access.

APIs:

```text
GET  /api/v1/notaries/:slug/screening/config
POST /api/v1/notaries/:slug/screening/search
POST /api/v1/notaries/:slug/screening/image
```

---

## 4. Database schema requirements

Implement these as Prisma models or equivalent database tables.

### 4.1 DataSource

```text
id
code
name
baseUrl
status
fallbackEnabled
localCopyAvailable
lastSuccessfulSyncAt
lastAttemptedSyncAt
lastHealthCheckAt
lastError
lastLatencyMs
createdAt
updatedAt
```

### 4.2 SourceConnectionLog

```text
id
sourceId
status
endpoint
latencyMs
httpStatus
error
checkedAt
```

### 4.3 SourceSyncRun

```text
id
sourceId
status
syncType
startedAt
finishedAt
recordsImported
recordsUpdated
recordsFailed
sourceFileName
publicationId
error
```

### 4.4 SourceFile

```text
id
sourceId
fileName
fileType
downloadUrl
sha256
sizeBytes
downloadedAt
importedAt
status
rawStoragePath
```

### 4.5 SourceImportedList

```text
id
sourceId
listName
programName
recordCount
languageCoverage
localAvailable
lastImportedAt
sourceFileId
```

### 4.6 SourceEntity

```text
id
sourceId
externalEntityId
entityType
primaryName
normalizedLatin
normalizedArabic
listName
programs
countries
rawRecord
datePublished
sourceFileId
importedAt
updatedAt
```

### 4.7 SourceName

```text
id
entityId
sourceId
originalName
isPrimary
isAlias
aliasType
language
script
normalizedLatin
normalizedArabic
tokens
createdAt
```

### 4.8 SourceNameVariant

```text
id
sourceNameId
entityId
variant
variantType
language
phoneticKey
tokens
quality
createdAt
```

Variant types:

```text
original
normalized_latin
normalized_arabic
arabic_to_latin
latin_to_arabic
phonetic
alias
token
single_name
```

### 4.9 ScreeningTransaction

```text
id
query
normalizedQuery
queryVariants
requesterType
requesterSlug
sourceMode
usedFallback
liveSourceChecked
ipAddress
userAgent
apiClient
apiKeyId
wordpressSite
wpUserId
clientReference
status
highestScore
matchCount
responseTimeMs
createdAt
```

### 4.10 ScreeningMatch

```text
id
transactionId
sourceId
entityId
primaryName
matchedName
listName
programs
score
riskLevel
matchReason
sourceMode
rawMatch
createdAt
```

### 4.11 IncomingInquiry

```text
id
transactionId
clientType
clientId
notarySlug
wordpressSite
originalPayload
responsePayload
status
createdAt
```

### 4.12 ApiAccessLog

```text
id
apiKeyId
notarySlug
ipAddress
userAgent
path
method
statusCode
responseTimeMs
createdAt
```

---

## 5. Screening behavior

### 5.1 Standard screening flow

```text
1. Receive request.
2. Validate API key/auth.
3. Log IP, user agent, client metadata.
4. Normalize original query.
5. Generate bilingual variants.
6. Identify whether query is full-name, single-token, family-name-only, or partial.
7. Check source connection status.
8. Search local source library.
9. If live verification is enabled and source is reachable, verify status or refresh metadata.
10. Score matches.
11. Apply risk band.
12. Save transaction and matches.
13. Return response.
```

### 5.2 Fallback screening flow

If origin source is unavailable:

```text
1. Mark source status as offline/degraded.
2. Confirm local copy availability.
3. Search local copy.
4. Return result with sourceMode = local_fallback.
5. Add fallback warning.
6. Log usedFallback = true.
```

Fallback warning:

```text
Screening completed using local KYDEX copy. Original source unavailable at search time.
```

---

## 6. Name normalization and bilingual search

### 6.1 Arabic normalization rules

Normalize:

- Arabic diacritics,
- Alef variants,
- Ya/Maqsura variants,
- Ta marbuta,
- Hamza variants,
- tatweel,
- spacing,
- punctuation,
- common family-name spacing variants.

Examples:

```text
نصرالله → نصر الله
عبدالله → عبد الله
إحمد / أحمد / احمد → احمد
على / علي → علي
```

### 6.2 Latin normalization rules

Normalize:

- lowercase/uppercase,
- punctuation,
- repeated spaces,
- hyphens,
- apostrophes,
- accents,
- common transliteration variants.

Examples:

```text
Mohammad / Mohammed / Mohamed
Hassan / Hasan / Hassen
Ali / Aly
Nasrallah / Nasralla / Nasr Allah
```

### 6.3 Query variants

Every query should produce:

```text
original
normalizedLatin
normalizedArabic
arabicToLatin variants
latinToArabic variants
token variants
phonetic variants
single-name variants
alias variants
```

### 6.4 Single-name scoring rule

Single-token searches are allowed but must be scored conservatively.

| Query type | Max score without extra identifiers |
|---|---:|
| Full exact name | 100 |
| Full fuzzy name | 95 |
| Alias exact | 92 |
| Single family name exact | 74 |
| Single first name exact | 65 |
| Single Arabic token | 70 |
| OCR unclear single token | 60 |

If DOB/nationality/address also matches, score may increase.

---

## 7. API response contracts

### 7.1 Screening response

```json
{
  "status": "review_required",
  "query": "حسن",
  "normalizedQuery": "حسن",
  "queryVariants": ["حسن", "Hassan", "Hasan"],
  "sourceMode": "local_fallback",
  "usedFallback": true,
  "sourceStatus": {
    "ofac": "offline",
    "lastSuccessfulSyncAt": "2026-05-01T10:00:00Z"
  },
  "highestScore": 78,
  "matches": [],
  "auditId": "scr_123",
  "warning": "Screening completed using local KYDEX copy. Original source unavailable at search time."
}
```

### 7.2 Source status response

```json
{
  "source": "OFAC",
  "status": "connected",
  "fallbackEnabled": true,
  "localCopyAvailable": true,
  "lastSuccessfulSyncAt": "2026-05-01T10:00:00Z",
  "lastAttemptedSyncAt": "2026-05-01T12:00:00Z",
  "latencyMs": 240,
  "lists": [
    {
      "listName": "SDN List",
      "recordCount": 12000,
      "lastImportedAt": "2026-05-01T10:00:00Z"
    }
  ]
}
```

### 7.3 Local list preview response

```json
{
  "source": "OFAC",
  "listName": "SDN List",
  "page": 1,
  "pageSize": 25,
  "total": 12000,
  "records": [
    {
      "entityId": "30629",
      "primaryName": "Example Entity",
      "entityType": "Entity",
      "programs": ["LEBANON"],
      "countries": ["Lebanon"],
      "aliases": [],
      "lastImportedAt": "2026-05-01T10:00:00Z"
    }
  ]
}
```

---

## 8. Dashboard build requirements

### 8.1 `/dashboard/sources`

Show cards:

- OFAC,
- future source placeholder,
- connection status,
- fallback availability,
- local record count,
- last sync,
- actions.

Actions:

- View status,
- Preview lists,
- Run sync,
- View logs.

### 8.2 `/dashboard/sources/ofac`

Show:

- OFAC health,
- list status,
- program status,
- latest changes,
- download status,
- last sync run,
- fallback status.

### 8.3 `/dashboard/sources/ofac/local-lists`

Show:

- list selector,
- program filter,
- country filter,
- entity type filter,
- search token,
- paginated local preview.

### 8.4 `/dashboard/sources/ofac/sync`

Show:

- manual sync button,
- latest sync run,
- import counts,
- errors,
- source file names.

### 8.5 `/dashboard/screening/logs`

Show:

- query,
- source mode,
- fallback used,
- notary/client,
- IP,
- status,
- highest score,
- created date.

### 8.6 `/dashboard/inquiries`

Show:

- incoming client,
- source,
- query,
- response status,
- audit ID,
- timestamp.

---

## 9. WordPress plugin compatibility

The WordPress plugin should continue calling:

```text
POST /api/v1/notaries/:slug/screening/search
POST /api/v1/notaries/:slug/screening/image
GET  /api/v1/screening/audit/:id
```

The plugin should render these new fields if present:

```text
sourceMode
usedFallback
queryVariants
sourceStatus
warning
auditId
```

No change to the security model:

```text
WordPress AJAX → WordPress server → KYDEX API
```

Never:

```text
Browser → OFAC
Browser → KYDEX with exposed API key
```

---

## 10. Implementation phases

### Phase 8A — Current build audit

Deliverables:

- report of existing modules,
- route inventory,
- Prisma schema inventory,
- dashboard route inventory,
- legacy donor status.

### Phase 8B — Source registry

Deliverables:

- data source tables,
- source status service,
- OFAC source seeded,
- source status endpoint.

### Phase 8C — OFAC local import

Deliverables:

- file download service,
- XML/CSV parsing,
- source files table,
- imported lists table,
- entities/names/aliases import.

### Phase 8D — Bilingual name index

Deliverables:

- normalization services,
- transliteration services,
- name variants table,
- variant generation during import,
- variant generation during search.

### Phase 8E — Local-first screening

Deliverables:

- local screening service,
- fallback mode,
- source mode response,
- conservative single-name scoring.

### Phase 8F — Incoming inquiries and transaction logs

Deliverables:

- inquiry endpoint,
- transaction logs,
- IP logging,
- API client logs,
- notary metadata logging.

### Phase 8G — Dashboard pages

Deliverables:

- source library UI,
- OFAC status UI,
- local list preview UI,
- screening logs UI,
- inquiries UI.

### Phase 8H — WordPress response upgrade

Deliverables:

- plugin displays sourceMode,
- plugin displays fallback warning,
- plugin displays query variants,
- plugin displays source status.

### Phase 8I — Validation and confirmation

Deliverables:

- API build passes,
- web build passes,
- local import verified,
- fallback verified,
- WordPress query verified,
- confirmation markdown artifact.

---

## 11. Claude/Codex full implementation prompt

Use this prompt inside `C:\kydex`.

```text
You are working inside C:\kydex.

Objective:
Upgrade KYDEX into a full Source Library + Local Fallback Screening Engine.

Current known build:
- KYDEX core lives in C:\kydex.
- / is the real KYDEX landing page.
- /login is the real login page.
- /dashboard is the real dashboard shell.
- /kydex redirects to /.
- LCN is separate and must not be mixed into KYDEX.
- Individual notary WordPress pages are separate and must call KYDEX only.

Target features:
1. Source library for OFAC and future data sources.
2. OFAC connection status tracking.
3. Local copies of SDN and consolidated lists.
4. Local-first search with fallback when OFAC is unavailable.
5. Arabic/English normalization and transliteration.
6. Single-name and family-name-only search.
7. Local list preview.
8. IP logging and transaction logging.
9. Incoming inquiry endpoint.
10. WordPress plugin compatibility.

OFAC endpoints to support:
- GET /alive
- GET /entities
- GET /entities/{entity-id}
- GET /entities?list={list-name}
- GET /entities?program={program-name}
- GET /api/download/{filename}
- GET /changes/latest
- GET /changes/{publication-id}
- GET /changes/history/{year}/{month}/{day}
- GET /sanctions-lists
- GET /sanctions-programs
- GET /api/Customize/GetCustomizeList

Required KYDEX endpoints:
- GET  /api/v1/sources
- GET  /api/v1/sources/:source/status
- POST /api/v1/sources/:source/sync
- GET  /api/v1/sources/:source/lists
- GET  /api/v1/sources/:source/lists/:listName/preview
- GET  /api/v1/ofac/health
- GET  /api/v1/ofac/lists
- GET  /api/v1/ofac/programs
- GET  /api/v1/ofac/changes/latest
- POST /api/v1/ofac/sync
- GET  /api/v1/ofac/sync/status
- POST /api/v1/screening/search
- POST /api/v1/screening/search/live-verify
- GET  /api/v1/screening/audit/:id
- GET  /api/v1/screening/logs
- POST /api/v1/inquiries/screen
- GET  /api/v1/inquiries
- GET  /api/v1/inquiries/:id
- GET  /api/v1/notaries/:slug/screening/config
- POST /api/v1/notaries/:slug/screening/search
- POST /api/v1/notaries/:slug/screening/image

Required dashboard routes:
- /dashboard/sources
- /dashboard/sources/ofac
- /dashboard/sources/ofac/local-lists
- /dashboard/sources/ofac/sync
- /dashboard/sources/ofac/logs
- /dashboard/screening/logs
- /dashboard/inquiries
- /dashboard/inquiries/:id

Database models to add:
- DataSource
- SourceConnectionLog
- SourceSyncRun
- SourceFile
- SourceImportedList
- SourceEntity
- SourceName
- SourceNameVariant
- ScreeningTransaction
- ScreeningMatch
- IncomingInquiry
- ApiAccessLog

Screening behavior:
- Log every request.
- Normalize query.
- Generate Arabic/English variants.
- Allow full-name and single-name searches.
- Use local KYDEX data first.
- If OFAC is reachable, optionally verify/refresh.
- If OFAC is unreachable, use local fallback.
- Return sourceMode, usedFallback, sourceStatus, queryVariants, auditId, warning if needed.
- Never automatically state that a person is sanctioned.
- Use safe status values:
  clear
  weak_possible_match
  review_required
  strong_potential_match

Strict boundaries:
- Do not make WordPress call OFAC.
- Do not expose OFAC raw URLs to frontend users.
- Do not expose KYDEX API keys in browser JavaScript.
- Do not replace existing auth/session logic.
- Do not remove /kydex -> / redirect.
- Do not reintroduce LCN code.
- Do not reintroduce individual WordPress theme code into KYDEX core.

Before editing:
1. Inspect existing API modules.
2. Inspect existing Prisma/database schema.
3. Inspect existing dashboard routes and components.
4. Inspect existing OFAC/screening/notary modules if any.
5. Produce a file-by-file patch plan.
6. Do not edit until the plan is shown.

After editing:
1. Run npm run build -w @kydex/api.
2. Run npm run build -w @kydex/web.
3. Verify /api/v1/ofac/health.
4. Verify /api/v1/sources.
5. Verify /api/v1/sources/ofac/status.
6. Import OFAC local list.
7. Verify local list preview.
8. Search English full name.
9. Search Arabic full name.
10. Search single family name.
11. Simulate OFAC unavailable and verify local_fallback.
12. Verify WordPress plugin manual search.
13. Verify WordPress plugin image search.
14. Verify transaction logs include IP/user agent/client/sourceMode.
15. Produce final implementation report.
```

---

## 12. Confirmation artifact template

After successful implementation, create:

```text
C:\kydex\KYDEX_PHASE8_SOURCE_LIBRARY_FALLBACK_CONFIRMED.md
```

Content:

```text
# KYDEX PHASE 8 SOURCE LIBRARY AND FALLBACK ENGINE CONFIRMED

Date: [date]

Status:
- Source library implemented
- OFAC source registered
- OFAC connection status implemented
- Local OFAC list import implemented
- Local list preview implemented
- Local-first screening implemented
- Local fallback mode implemented
- Arabic/English query variant generation implemented
- Single-name search supported
- IP and transaction logs implemented
- Incoming inquiry endpoint implemented
- WordPress plugin compatibility verified
- API build passes
- Web build passes

Validated endpoints:
- /api/v1/ofac/health
- /api/v1/sources
- /api/v1/sources/ofac/status
- /api/v1/sources/ofac/lists
- /api/v1/sources/ofac/lists/:listName/preview
- /api/v1/screening/search
- /api/v1/inquiries/screen
- /api/v1/notaries/:slug/screening/search
- /api/v1/notaries/:slug/screening/image

Guardrails:
- WordPress does not call OFAC directly.
- KYDEX API keys are not exposed in browser JavaScript.
- OFAC source URLs are not exposed to frontend users.
- Auth/session logic preserved.
- /kydex redirect preserved.
```
