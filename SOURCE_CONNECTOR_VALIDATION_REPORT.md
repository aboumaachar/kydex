# SOURCE CONNECTOR VALIDATION REPORT

Date: 2026-04-25
Scope: KYDEX Source Connectivity + Local Screening Verification Pass
Endpoints:
- POST /api/v1/data-sources/sync-official
- POST /api/v1/screen

## Verification Outcome
- status: PASS
- synchronized official connectors: 3
- source mode coverage: single source, selected sources, all sources
- screening mode coverage: single source, selected sources, all sources (local imported records only)

## Official Source Sync Evidence (Mode A)
Command payload: {"sources":["ALL"]}

1. OFAC SDN Connector
- source key: OFAC_SDN
- source URL: https://www.treasury.gov/ofac/downloads/sdn.csv
- parser: csv-native
- insertedRecords: 18863
- rejectedRows: 0
- duplicateRows: 0
- versionId: cmoe6ccoa0006pjmvdivlx5im

2. OFAC Consolidated Connector
- source key: OFAC_CONSOLIDATED
- source URL: https://www.treasury.gov/ofac/downloads/consolidated/consolidated.xml
- parser: xml-regex-mvp
- insertedRecords: 446
- rejectedRows: 0
- duplicateRows: 0
- versionId: cmoe6cwi30ekcpjmv4yby0dzx

3. UNSEC Connector
- source key: UNSEC
- source URL: https://scsanctions.un.org/resources/xml/en/consolidated.xml
- parser: xml-regex-mvp
- insertedRecords: 1712
- rejectedRows: 36
- duplicateRows: 36
- versionId: cmoe6d3s30ewxpjmvfhcdi6ky

All three connector runs performed the required flow:
1. Download official raw file
2. Store raw artifact
3. Compute SHA-256 hash
4. Parse and normalize rows
5. Create DataSourceVersion
6. Create IngestionRunReport
7. Insert WatchlistRecord entries

## Local Screening Evidence (Mode B)
All screening checks executed against local imported watchlist records.

1. Single source
- request: {"sources":["OFAC"]}
- result: risk=CRITICAL, highestScore=0.75, matchCount=3

2. Selected sources
- request: {"sources":["OFAC","UNSEC"]}
- result: risk=CRITICAL, highestScore=0.75, matchCount=3

3. All sources
- request: sources omitted
- result: risk=CRITICAL, highestScore=0.75, matchCount=3

## Operational Regression Checks
- npm run preflight: PASS
- npm run smoke: PASS

## Notes
1. Web production build can intermittently fail on Windows due to .next trace file locking (EPERM); retry after clearing .next.
2. Port 4000 can already be occupied by an existing API process; this is expected when previous dev sessions are still running.
