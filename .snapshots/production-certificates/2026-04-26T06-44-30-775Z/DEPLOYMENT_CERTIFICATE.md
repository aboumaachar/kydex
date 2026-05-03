# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T06-44-30-775Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: NON_STRICT
Signing Key Source: FALLBACK
Production Valid: false
Started At: 2026-04-26T06:44:30.775Z
Completed At: 2026-04-26T06:46:39.495Z
DurationMs: 128722
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

Warning: NON-STRICT SIGNING MODE - NOT VALID FOR PRODUCTION

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 7110
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 29711
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 23150
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 3398
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 11229
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 910
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 49200
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 1966
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 2024
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-44-30-775Z\backup_test.stderr.log

## Signature
Payload SHA256: bc42bb16a9c9a3fbe9037dcc47a871149c73313186dc1b426e20534caca9f645
HMAC-SHA256 Signature: 2c9c06e4dc5dec4134a8436618adebd6b1a54bfc16476b75a5de303bc3767bba

STATUS: CERTIFIED