# Phase 6 Local Rollout

This sequence applies the existing live-safe OFAC/notary migration, regenerates Prisma, starts the API, and validates the new endpoints without touching the legacy screening engine.

## Apply the schema locally

Run from the repository root:

```powershell
npm run infra:up
npx prisma migrate status --schema prisma/schema.prisma
npx prisma migrate dev --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
```

Expected outcome:

- `20260430211000_ofac_notary_safe_merge` is applied.
- Prisma Client includes `ofacEntity`, `ofacScreeningSearch`, `ofacScreeningMatch`, `notaryProfile`, `notaryApiKey`, and `notaryScreeningUsage` delegates.

Local note:

- The Docker Redis 7 service is expected on `127.0.0.1:6380` for local API/BullMQ health.

## Start and validate the API

```powershell
npm run dev:api
```

In a second terminal:

```powershell
Invoke-WebRequest http://localhost:4000/api/v1/ofac/health | Select-Object -Expand Content
Invoke-WebRequest http://localhost:4000/api/v1/ofac/lists | Select-Object -Expand Content
Invoke-WebRequest http://localhost:4000/api/v1/ofac/programs | Select-Object -Expand Content
Invoke-WebRequest http://localhost:4000/api/v1/ofac/sync/status | Select-Object -Expand Content
```

If the remote OFAC service is reachable, trigger a manual sync:

```powershell
$headers = @{ 'x-kydex-sync-token' = $env:OFAC_SYNC_TOKEN }
$body = @{ files = @('SDN_ADVANCED.XML', 'CONS_ADVANCED.XML'); force = $true; mode = 'manual' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/v1/ofac/sync -Headers $headers -ContentType 'application/json' -Body $body
Invoke-WebRequest http://localhost:4000/api/v1/ofac/sync/status | Select-Object -Expand Content
```

For a full local advanced-file validation, this same sync path can be run with `SDN_ADVANCED.XML` and `CONS_ADVANCED.XML`. The API now downloads the large XML exports through their ZIP variants internally before parsing.

Expected outcome:

- `OfacSyncRun.status` moves to `completed`.
- `entityCount` and `nameCount` increase.

## Create a notary profile and API key

```powershell
npm run notary:key -w @kydex/api -- sandranassif "Sandra Nassif Kallab" dev_sandranassif_key
```

This upserts the notary profile, enables screening for it, and creates a hashed API key record.

## Validate notary routes

```powershell
Invoke-WebRequest http://localhost:4000/api/v1/notaries/sandranassif/screening/config | Select-Object -Expand Content

$headers = @{ 'x-kydex-notary-key' = 'dev_sandranassif_key' }
$body = @{ query = 'Sandra Nassif Kallab'; clientReference = 'phase6-local-test' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/v1/notaries/sandranassif/screening/search -Headers $headers -ContentType 'application/json' -Body $body
```

Expected outcome:

- `/config` returns the notary display name, enabled flag, and header contract.
- `/search` returns an `auditId`, `status`, and a bounded list of OFAC matches.
- `NotaryScreeningUsage` records a usage row referencing the returned `auditId`.

## Validate dashboard API routes

```powershell
$body = @{ query = 'Sandra Nassif Kallab'; source = 'dashboard'; screeningType = 'ofac' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/v1/screening/search -ContentType 'application/json' -Body $body
```

Use the returned `auditId` in:

```powershell
Invoke-WebRequest http://localhost:4000/api/v1/screening/audit/<auditId> | Select-Object -Expand Content
```

Expected outcome:

- New searches are written to `OfacScreeningSearch`.
- Matches are written to `OfacScreeningMatch`.
- Existing KYDEX `ScreeningQuery` and `ScreeningMatch` tables remain untouched by this path.