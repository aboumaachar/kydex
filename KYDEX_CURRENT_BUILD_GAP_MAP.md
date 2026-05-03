# KYDEX Current Build → Required Source-Library/Fallback Engine Gap Map

## Purpose

This document maps the current KYDEX build against the required target system so the development team can decide:

- what already exists,
- what should be kept,
- what should be extended,
- what should not be rebuilt,
- what must be added,
- what must be validated before implementation.

The target is to upgrade KYDEX from a basic screening/product interface into a full **Source Library + Local Fallback Screening Engine** that supports OFAC, future data sources, bilingual name normalization, fallback local search, incoming client inquiries, and WordPress notary plugin integration.

---

## 1. Current confirmed build state

### 1.1 Shell separation

| Area | Current state | Decision |
|---|---|---|
| KYDEX core | Lives in `C:\kydex` | Keep as canonical KYDEX engine |
| LCN / Council | Separated in `C:\notary` and served as `/lcn` | Keep separate |
| Individual notary page | Should live separately, e.g. `C:\sandranassif` | Keep separate |
| Old `/kydex` public alias | Redirects to `/` | Keep redirect |
| Legacy donor KYDEX subtree | Should be quarantined/removed if no real imports depend on it | Verify, then quarantine |

### 1.2 KYDEX public product shell

| Area | Current state | Decision |
|---|---|---|
| `/` | Real KYDEX public landing page | Keep |
| `/login` | Real KYDEX login, restyled | Keep |
| `/dashboard` | Real KYDEX dashboard shell, restyled | Keep |
| Auth/session logic | Preserved | Do not replace |
| API routes | Preserved | Do not break |
| Public marketing chrome on authenticated routes | Removed/hidden | Keep |

### 1.3 WordPress plugin direction

| Area | Current state | Decision |
|---|---|---|
| Sandra WordPress plugin concept | Defined | Build as activatable plugin |
| Plugin calls KYDEX only | Required | Keep |
| Plugin calls OFAC directly | Forbidden | Do not implement |
| KYDEX API key in JS | Forbidden | Store server-side only |
| WordPress AJAX proxy | Required | Implement |
| Manual screening | Required | Implement |
| ID/image screening | Required | Implement via KYDEX OCR |
| Audit lookup | Required | Implement |
| KYDEX/OFAC status tools | Admin-only | Implement |

### 1.4 OFAC integration concept

| Area | Current state | Decision |
|---|---|---|
| OFAC API documentation | Provided | Use as source spec |
| OFAC `/alive` | Required | Implement |
| OFAC `/sanctions-lists` | Required | Implement |
| OFAC `/sanctions-programs` | Required | Implement |
| OFAC `/entities` | Required | Implement |
| OFAC downloads | Required | Implement local import |
| OFAC changes/latest/history | Required | Implement sync tracking |
| Local fallback | Required | Implement |
| Bilingual local copies | Required | Implement |

---

## 2. Required target capabilities

### 2.1 Source library

KYDEX must maintain a registry of external and local data sources.

Initial required source:

- OFAC Sanctions List Service

Future-compatible sources:

- UN sanctions
- EU sanctions
- UK sanctions
- Lebanese local datasets
- Custom uploaded CSV/XML datasets
- Internal KYDEX notary/council datasets

Required dashboard route:

```text
/dashboard/sources
```

Required API:

```text
GET  /api/v1/sources
GET  /api/v1/sources/:source/status
POST /api/v1/sources/:source/sync
GET  /api/v1/sources/:source/lists
GET  /api/v1/sources/:source/lists/:listName/preview
```

---

### 2.2 OFAC connection status

KYDEX must show the connection status of OFAC and future sources.

Required checks:

```text
OFAC /alive
OFAC /sanctions-lists
OFAC /sanctions-programs
OFAC /changes/latest
OFAC download endpoints
```

Required status values:

```text
connected
degraded
offline
sync_required
fallback_available
fallback_unavailable
```

Required dashboard route:

```text
/dashboard/sources/ofac/status
```

---

### 2.3 Local copies of OFAC lists

KYDEX must download, parse, normalize, and store local copies of OFAC list data.

Initial required files:

```text
SDN_ADVANCED.XML
CONS_ADVANCED.XML
SDN.CSV
CONSOLIDATED.XML
```

Local copies must include:

- raw source record,
- entity ID,
- primary names,
- aliases,
- programs,
- list names,
- addresses,
- features,
- countries,
- dates,
- original source language,
- normalized English,
- normalized Arabic,
- transliteration variants,
- phonetic keys,
- tokens,
- import timestamp,
- source file name.

Required dashboard route:

```text
/dashboard/sources/ofac/local-lists
```

---

### 2.4 Fallback screening

KYDEX must be able to search even when OFAC or another source is offline.

Required behavior:

1. Log request.
2. Normalize query.
3. Generate Arabic/English variants.
4. Check source status.
5. Search local KYDEX data.
6. If origin source is reachable and verification is enabled, optionally verify source status or refresh.
7. Merge local and live verification metadata.
8. Return result to sender.
9. Save full transaction audit.

Required source modes:

```text
live_verified
local_fallback
local_only
degraded
```

If OFAC is unreachable, response must include:

```text
Screening completed using local KYDEX copy. Original source unavailable at search time.
```

---

### 2.5 Arabic/English normalization and transliteration

KYDEX must always generate bilingual variants.

Required functions:

```text
Arabic → English transliteration
English → Arabic transliteration
Latin normalization
Arabic normalization
tokenization
phonetic key generation
alias expansion
single-name expansion
family-name-only search
```

Examples:

```text
محمد علي حسن
→ Mohammad Ali Hassan
→ Mohammed Ali Hasan
→ Mohamed Aly Hassan
→ M. A. Hassan
```

```text
Hassan Nasrallah
→ حسن نصرالله
→ حسن نصر الله
→ Hasan Nasrallah
→ Hassan Nasralla
```

---

### 2.6 Single-name and partial-name search

KYDEX must allow:

- one first name,
- one family name,
- one Arabic token,
- partial name,
- alias token,
- OCR-extracted partial name.

Scoring must be conservative for single-token searches.

| Query type | Allowed | Confidence treatment |
|---|---:|---|
| Full name | Yes | Normal scoring |
| First + family name | Yes | Normal scoring |
| Single family name | Yes | Lower confidence |
| Single first name | Yes | Lower confidence |
| Arabic single token | Yes | Lower confidence |
| OCR unclear token | Yes | Require review if any meaningful match |

---

### 2.7 Local list preview

KYDEX dashboard must allow a user to preview local imported source lists.

Required filters:

- list name,
- program,
- country,
- entity type,
- imported date,
- language coverage,
- source file,
- search token.

Required endpoint:

```text
GET /api/v1/sources/ofac/lists/:listName/preview
```

---

### 2.8 IP and transaction logs

KYDEX must log every transaction.

Required fields:

- IP address,
- user agent,
- API client,
- WordPress site,
- notary slug,
- user ID if available,
- client reference,
- original query,
- normalized query,
- generated variants,
- source mode,
- used fallback,
- source checked live,
- response time,
- status,
- highest score,
- matches count,
- created timestamp.

Required dashboard routes:

```text
/dashboard/screening/logs
/dashboard/inquiries
/dashboard/inquiries/:id
/dashboard/sources/ofac/logs
```

---

### 2.9 Incoming inquiries

KYDEX must accept incoming inquiries from:

- WordPress plugin,
- notary websites,
- KYDEX dashboard,
- future API clients,
- LCN only if intentionally enabled.

Required flow:

1. Validate API key/client.
2. Log IP and metadata.
3. Normalize and transliterate query.
4. Check source status.
5. Search local data.
6. Optionally verify origin source if available.
7. Return result to original sender.
8. Save audit log.

Required endpoint:

```text
POST /api/v1/inquiries/screen
```

Notary-specific endpoint remains:

```text
POST /api/v1/notaries/:slug/screening/search
```

---

## 3. Keep / extend / add / remove decision map

### 3.1 Keep

| Item | Reason |
|---|---|
| Existing KYDEX shell in `C:\kydex` | Canonical core |
| `/` landing page | Public KYDEX product entry |
| `/login` | Real auth flow |
| `/dashboard` | Real authenticated shell |
| `/kydex -> /` redirect | Prevents legacy collision |
| Existing auth/session logic | Already working |
| Existing API architecture | Extend, do not replace |
| WordPress plugin proxy architecture | Secure design |

---

### 3.2 Extend

| Item | Extension |
|---|---|
| Dashboard | Add source library, logs, local list preview |
| Screening API | Add source mode, query variants, fallback info |
| Notary API | Add incoming inquiry metadata and plugin headers |
| OFAC module | Add sync, local copy, changes, health, preview |
| Audit logs | Add IP, user agent, source mode, fallback, client |
| Matching engine | Add bilingual variants and single-name scoring |
| WordPress plugin response renderer | Show source mode, fallback warning, query variants |

---

### 3.3 Add

| New item | Why |
|---|---|
| `data_sources` table | Source registry |
| `source_connections` table | Health/connection state |
| `source_sync_runs` table | Sync history |
| `source_files` table | Imported source file tracking |
| `source_imported_lists` table | Local list metadata |
| `source_entities` table | Local entity records |
| `source_names` table | Primary names |
| `source_name_variants` table | Bilingual and phonetic variants |
| `screening_transactions` table | Full transaction log |
| `incoming_inquiries` table | External client inquiry tracking |
| `/dashboard/sources` | Source library UI |
| `/dashboard/sources/ofac/local-lists` | Preview local copies |
| `/dashboard/inquiries` | Incoming inquiry operations |
| `/api/v1/inquiries/screen` | Generic client inquiry endpoint |

---

### 3.4 Remove or quarantine

| Item | Action |
|---|---|
| Legacy donor KYDEX subtree | Quarantine if unused |
| Mock donor auth | Remove/quarantine |
| Any direct OFAC call from WordPress | Must not exist |
| Any KYDEX API key exposed in browser | Must not exist |
| Council/LCN content in KYDEX dashboard | Remove if found |
| Individual notary theme code in KYDEX core | Remove if found |

---

## 4. Current build audit checklist

### 4.1 Check legacy donor folders

```powershell
cd C:\kydex

Test-Path "C:\kydex\apps\web\src\app\kydex"
Test-Path "C:\kydex\apps\web\src\components\kydex"
```

Search for imports:

```powershell
Get-ChildItem "C:\kydex\apps\web\src" -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx |
Where-Object {
    $_.FullName -notmatch "\\app\\kydex\\" -and
    $_.FullName -notmatch "\\components\\kydex\\"
} |
Select-String -Pattern "components/kydex","@/components/kydex","app/kydex","KydexAuthProvider","useKydexAuth","KydexLanding","kydex-auth-provider","kydex-landing" -CaseSensitive:$false
```

---

### 4.2 Check existing OFAC module

```powershell
cd C:\kydex

Get-ChildItem "C:\kydex\apps\api\src" -Recurse -Directory |
Where-Object { $_.Name -match "ofac|screening|notary|source|inquiry" } |
Select-Object FullName
```

---

### 4.3 Check existing endpoints

```powershell
Select-String -Path "C:\kydex\apps\api\src\**\*.ts" -Pattern "@Controller","ofac","screening","notaries","inquiries","sources" -CaseSensitive:$false
```

---

### 4.4 Check dashboard files

```powershell
Get-ChildItem "C:\kydex\apps\web\src\app\dashboard" -Recurse
Get-ChildItem "C:\kydex\apps\web\src\components" -Recurse -File |
Where-Object { $_.Name -match "dashboard|nav|shell|source|screening" }
```

---

### 4.5 Check current build health

```powershell
cd C:\kydex

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "C:\kydex\apps\web\.next" -Recurse -Force -ErrorAction SilentlyContinue

npm run build -w @kydex/api
npm run build -w @kydex/web
```

---

## 5. Gap matrix

| Requirement | Current likely state | Needed action |
|---|---|---|
| OFAC health check | Partial or planned | Confirm/create |
| OFAC list fetch | Partial or planned | Confirm/create |
| OFAC programs fetch | Partial or planned | Confirm/create |
| OFAC local file import | Likely missing/partial | Build |
| Source library registry | Likely missing | Build |
| Source connection tracking | Likely missing | Build |
| Local SDN/CONS copy | Likely missing/partial | Build |
| Bilingual local names | Missing | Build |
| Arabic/English variants | Missing | Build |
| Single-name search | Likely limited | Extend |
| Local fallback mode | Missing | Build |
| Local list preview | Missing | Build |
| IP transaction logs | Partial/missing | Build |
| Incoming inquiry relay | Missing | Build |
| WordPress plugin connection contract | Defined | Implement/validate |
| Dashboard source pages | Missing | Build |
| Dashboard screening logs | Missing | Build |
| Fallback warning in response | Missing | Build |
| Live-source verification mode | Missing | Build |

---

## 6. Do-not-rebuild list

Do not rebuild these unless a direct error proves they are broken:

- KYDEX public landing page,
- KYDEX login page,
- KYDEX dashboard shell,
- auth/session management,
- LCN/Council workspace,
- Sandra WordPress theme,
- `/kydex -> /` redirect,
- existing working API bootstrap,
- existing successful build scripts.

---

## 7. Recommended next implementation sequence

```text
Phase 8A — Audit current OFAC/screening/source modules
Phase 8B — Add source registry and connection status tables
Phase 8C — Add OFAC local import and sync-run tracking
Phase 8D — Add bilingual normalization and name-variant index
Phase 8E — Upgrade screening engine to local-first + fallback mode
Phase 8F — Add incoming inquiry endpoint and transaction logs
Phase 8G — Add dashboard source library pages
Phase 8H — Add local-list preview pages and APIs
Phase 8I — Extend WordPress plugin display for sourceMode, fallback, variants
Phase 8J — Full validation and confirmation artifact
```

---

## 8. Validation acceptance criteria

The phase is complete only when all pass:

| Test | Required result |
|---|---|
| `/api/v1/ofac/health` | Returns OFAC status |
| `/api/v1/sources` | Shows OFAC source |
| `/api/v1/sources/ofac/status` | Shows connected/degraded/offline |
| `/api/v1/sources/ofac/lists` | Shows imported local lists |
| `/api/v1/sources/ofac/lists/SDN%20List/preview` | Shows local records |
| English full-name search | Returns scored result |
| Arabic full-name search | Generates English variants |
| English search | Generates Arabic variants |
| Single family-name search | Allowed with lower confidence |
| OFAC offline simulation | Uses local fallback |
| WordPress manual query | Calls KYDEX, not OFAC |
| WordPress image query | Calls KYDEX OCR, then screening |
| Logs | IP, user agent, client, source mode saved |
| Dashboard | Source library and logs visible |
| Build | API and web build pass |

