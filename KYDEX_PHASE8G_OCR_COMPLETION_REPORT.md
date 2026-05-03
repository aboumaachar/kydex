# KYDEX Phase 8G OCR Completion Report

Date: 2026-05-01
Workspace: C:\kydex

## Scope

Implemented Phase 8G OCR hardening for:

- `POST /api/v1/notaries/:slug/screening/image`
- Internal KYDEX OCR extraction flow (no browser-exposed OFAC/KYDEX keys)
- Query override support
- OCR review-required flow when no reliable name is extracted
- Fallback-state-machine reuse for offline OFAC mode
- Screening transaction OCR metadata attachment

No auth/session logic was replaced.
No manual screening contract was changed.
No existing OFAC fallback state machine was changed.

## Files Changed

### 1) Notary OCR service (new)

Added:
- `apps/api/src/notaries/notary-ocr.service.ts`

Implemented:
- Internal OCR extraction pipeline for uploaded/base64 payloads
- Text cleaning/normalization
- Field extraction:
  - `candidateName`
  - `dateOfBirth`
  - `nationality`
  - `documentNumber`
- Confidence scoring and reliable-name signal
- Runtime HEIC support gate via `KYDEX_ENABLE_HEIC=true`

### 2) Notary image DTO

Updated:
- `apps/api/src/notaries/dto/notary-image-screening.dto.ts`

Implemented/updated fields:
- `imageBase64?` (optional fallback input)
- `mimeType?`
- `queryOverride?`
- `clientReference?`
- `wpUserId?` (string-normalized)
- `wordpressSite?`

### 3) Notary screening controller

Updated:
- `apps/api/src/notaries/notary-screening.controller.ts`

Implemented:
- Multipart upload support via `FileInterceptor('file')` + `memoryStorage`
- Upload validation:
  - MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
  - `image/heic` only when runtime support flag is enabled
  - file size max via `MAX_UPLOAD_BYTES`
- Base64 fallback retained (`imageBase64`) for compatibility
- OCR extraction invocation via `NotaryOcrService`
- Query behavior:
  - `queryOverride` takes precedence when present
  - if no reliable name and no override, returns:
    - `status: ocr_review_required`
    - message: `No reliable name was extracted. Please enter a manual name override.`
    - `ocr.text` and extracted fields
- Screening behavior:
  - Calls existing `OfacScreeningService.search`
  - Reuses bilingual variants, fallback state machine, sourceStatus and warning behavior
- Response shape includes:
  - `status`, `query`, `normalizedQuery`, `queryVariants`, `sourceMode`, `usedFallback`, `sourceStatus`, `highestScore`, `matches`, `auditId`, `warning`
  - `ocr`: `candidateName`, `dateOfBirth`, `nationality`, `documentNumber`, `confidence`, `text`

### 4) Notaries module wiring

Updated:
- `apps/api/src/notaries/notaries.module.ts`

Implemented:
- Registered `NotaryOcrService` provider

### 5) Screening transaction metadata attachment

Updated:
- `apps/api/src/ofac-screening/ofac-screening.service.ts`

Implemented:
- Extended `search()` context with optional `ocrMetadata`
- Attached OCR metadata into persisted `ScreeningTransaction.sourceStatus.ocr` while preserving existing `sourceStatus` contract fields
- Persisted OCR metadata fields include:
  - `fileType`
  - `fileSize`
  - `ocrSuccess`
  - `candidateName`
  - `queryOverrideUsed`
  - `documentNumber`
  - `confidence`
  - `text`

Additionally:
- For `ocr_review_required` (no reliable name), controller now persists a `ScreeningTransaction` with:
  - `status: ocr_review_required`
  - `sourceMode: ocr_only`
  - attribution metadata (`wpUserId`, `wordpressSite`, `clientReference`, `apiClient`, IP, user-agent)
  - OCR metadata under `sourceStatus.ocr`

## Build Validation

Command:

```powershell
npm run build -w @kydex/api
```

Result: Pass.

## Runtime Validation Matrix

### 1) Image endpoint with extracted name

Command (JSON/base64 path):

```powershell
$NK = "kydex_notary_8858c0ca5df5432195bd2189a9f72adbe5d95156b5484c76"
$content = @('Full Name: Mohammad Ali','Date of Birth: 1988-02-11','Nationality: LB','Passport Number: P1234567') -join "`n"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))
$headers = @{"x-kydex-notary-key"=$NK;"x-kydex-client"="wordpress-notary-plugin";"x-kydex-wordpress-site"="local-sandranassif";"Content-Type"="application/json"}
$body = @{ imageBase64=$b64; mimeType='image/png'; clientReference='img-case-1'; wpUserId='1'; wordpressSite='local-sandranassif' } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/notaries/sandranassif/screening/image" -Method POST -Headers $headers -Body $body -UseBasicParsing
```

Observed:
- Success response with live screening rows.
- Returned OCR object includes extracted candidate name, DOB, nationality, document number, confidence, and text.

### 2) queryOverride behavior

Command:

```powershell
$bytes = 1..64
$b64 = [Convert]::ToBase64String([byte[]]$bytes)
$body = @{ imageBase64=$b64; mimeType='image/png'; queryOverride='John Doe'; clientReference='img-case-override'; wpUserId='1'; wordpressSite='local-sandranassif' } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/notaries/sandranassif/screening/image" -Method POST -Headers $headers -Body $body -UseBasicParsing
```

Observed:
- `query` returned as `John Doe`.
- Screening executed despite unreadable OCR input.

### 3) Unreadable/no-name flow

Command:

```powershell
$bytes = 1..64
$b64 = [Convert]::ToBase64String([byte[]]$bytes)
$body = @{ imageBase64=$b64; mimeType='image/png'; clientReference='img-case-unreadable'; wpUserId='1'; wordpressSite='local-sandranassif' } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/notaries/sandranassif/screening/image" -Method POST -Headers $headers -Body $body -UseBasicParsing
```

Observed:
- `status: ocr_review_required`
- message exactly: `No reliable name was extracted. Please enter a manual name override.`
- `ocr.text` returned.

### 4) OFAC offline fallback behavior

Command:

```powershell
node _set_ofac_offline.js
# then call image endpoint with readable sample
```

Observed:
- `sourceMode: local_fallback`
- `usedFallback: true`
- `warning` present:
  - `Screening completed using local KYDEX copy. Original source unavailable at search time.`

### 5) WordPress-style multipart request

Command:

```powershell
curl.exe -s -X POST "http://localhost:4000/api/v1/notaries/sandranassif/screening/image" \
  -H "x-kydex-notary-key: <key>" \
  -H "x-kydex-client: wordpress-notary-plugin" \
  -H "x-kydex-wordpress-site: local-sandranassif" \
  -F "file=@C:/kydex/tmp_phase8g/pixel.png;type=image/png" \
  -F "queryOverride=John Doe" \
  -F "clientReference=img-multipart-1" \
  -F "wpUserId=1" \
  -F "wordpressSite=local-sandranassif"
```

Observed:
- Multipart upload accepted.
- Response contains expected screening and OCR fields.

### 6) ScreeningTransaction metadata verification

Command:

```powershell
node -e '/* prisma findMany on ScreeningTransaction for img-case-* clientReference values */'
```

Observed:
- Persisted attribution fields:
  - `wpUserId`, `wordpressSite`, `clientReference`, `apiClient`, `ipAddress`, `userAgent`
- Persisted OCR metadata under `sourceStatus.ocr`:
  - `fileType`, `fileSize`, `ocrSuccess`, `candidateName`, `queryOverrideUsed`, `documentNumber`, `confidence`, `text`
- `ocr_review_required` transaction persisted with status and OCR metadata.

## Security and Boundary Compliance

Confirmed:
- WordPress continues to call KYDEX API only.
- OFAC URLs/keys are not exposed to WordPress/browser clients.
- No KYDEX API keys are exposed in browser JavaScript.
- Raw uploaded image bytes are processed in memory and not persisted by default.
- Existing auth/session and manual screening contracts remain intact.

## Notes

1. `image/heic` is accepted only when `KYDEX_ENABLE_HEIC=true`; otherwise request is rejected with explicit runtime-support message.
2. For local tests, OFAC status was restored to connected after fallback validation using health-check endpoint.
