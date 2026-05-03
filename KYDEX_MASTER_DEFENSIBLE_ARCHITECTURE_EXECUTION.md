# KYDEX — Master Defensible Architecture Execution File

## 0. Purpose
Enforce the complete KYDEX architecture:
official sync only for external sources, local versioned screening only for searches.

## 1. Final System Rule
Screening must be local, versioned, auditable, and reproducible.
External OFAC/UNSEC calls are allowed only during controlled source sync.

## 2. Architecture Rules
- Allowed: source sync → raw snapshot → hash → parse → normalize → version → local DB.
- Forbidden: screening query → live external source call.

## 3. Required Connectors
- OFAC_SDN
- OFAC_CONSOLIDATED
- UNSEC_CONSOLIDATED
- LOCAL_MANUAL

Each connector must fetch, hash, store artifact, parse, normalize, version, report, and insert watchlist records.

## 4. API Requirements
### Sync
POST /api/v1/data-sources/sync-official

Must support:
- sources: ["ALL"]
- sources: ["OFAC_SDN", "OFAC_CONSOLIDATED", "UNSEC_CONSOLIDATED"]

### Screening
POST /api/v1/screen

Must support:
- OFAC only
- OFAC Consolidated only
- UNSEC only
- selected sources
- ALL sources
- omitted sources = all imported enabled sources

## 5. Code Enforcement
Implement:
- resolveScreeningSources()
- getActiveVersionOrFail()
- assertLocalOnlyScreeningContext()

Screening module must not import:
- fetch
- axios
- http/https clients
- official connector functions
- syncOfficialSources

## 6. Failure Rules
Fail if:
- unknown source
- disabled source
- no active version
- external call attempted during screening

## 7. Audit Requirements
Log:
- SOURCE_SYNC_STARTED
- SOURCE_SYNC_COMPLETED
- SOURCE_SYNC_FAILED
- SCREEN_LOCAL_ONLY_ENFORCED
- SCREEN_QUERY_FROM_DOCUMENT

Each screening audit must include:
- searchedSources
- usedLocalVersions
- riskLevel
- matchCount

## 8. Tests Required
Create:
apps/api/test/architecture-local-screening.e2e-spec.ts

Tests:
1. OFAC_SDN sync inserts records
2. OFAC_CONSOLIDATED sync inserts records
3. UNSEC_CONSOLIDATED sync inserts records
4. OFAC-only screening uses local version
5. UNSEC-only screening uses local version
6. selected-source screening uses local versions
7. omitted sources = all imported sources
8. unknown source rejected
9. missing active version rejected
10. screening does not call global.fetch
11. screening does not call syncOfficialSources

## 9. Static Architecture Verification
Create:
scripts/architecture-verify.ts

Add:
npm run architecture:verify

It must fail if screening module contains external-call or connector-sync usage.

## 10. Source Verification CLI
Create:
scripts/source-verify.ts

Add:
npm run source:verify

It must:
1. sync OFAC_SDN
2. sync OFAC_CONSOLIDATED
3. sync UNSEC_CONSOLIDATED
4. run OFAC-only search
5. run UNSEC-only search
6. run selected-source search
7. run ALL search
8. verify usedLocalVersions
9. write SOURCE_CONNECTIVITY_AND_LOCAL_SCREENING_REPORT.md

## 11. Frontend Requirements
Admin/Data Sources page must show:
- source code
- source name
- last sync timestamp
- active versionId
- record count
- file hash
- raw artifact path
- sync status

Screening page must allow:
- OFAC SDN only
- OFAC Consolidated only
- UNSEC only
- selected sources
- ALL imported sources

Results must show:
- searchedSources
- usedLocalVersions
- riskLevel
- matches

## 12. Production Gate Updates
Add to production certification:
- npm run architecture:verify
- npm run source:verify

Update:
- PRODUCTION_GATE.md
- PRODUCTION_DEPLOYMENT_RUNBOOK.md
- BASELINE_v0.8.0-production-certifiable.md

Rule:
Production certification is invalid unless architecture:verify and source:verify pass.

## 13. Validation Commands
Run:
npm run build -w @kydex/api
npm run build -w @kydex/web
npm run test:e2e -w @kydex/api
npm run preflight
npm run smoke
npm run architecture:verify
npm run source:verify
npm run production:certify

## 14. Final Acceptance Criteria
Complete only if:
- OFAC_SDN sync PASS
- OFAC_CONSOLIDATED sync PASS
- UNSEC_CONSOLIDATED sync PASS
- OFAC-only local screening PASS
- UNSEC-only local screening PASS
- selected-source screening PASS
- ALL-source screening PASS
- omitted-source screening PASS
- unknown source rejected PASS
- missing active version rejected PASS
- no external call during screening PASS
- architecture:verify PASS
- source:verify PASS
- build/e2e/preflight/smoke PASS
- production:certify PASS

## 15. Required Return Output
Return:
1. Files changed
2. Code-level enforcement added
3. Connector results
4. Local screening proof
5. Architecture verification result
6. Source verification result
7. Report path
8. Production certification status
9. Remaining limitations