# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T06-59-26-945Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: NON_STRICT
Signing Key Source: FALLBACK
Production Valid: false
Started At: 2026-04-26T06:59:26.945Z
Completed At: 2026-04-26T07:01:23.358Z
DurationMs: 116414
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
DurationMs: 7802
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 23114
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 21652
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 5018
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 9517
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 872
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 46371
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 1063
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 974
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-59-26-945Z\backup_test.stderr.log

## Signature
Payload SHA256: 5779bc522a8477848834c24d589ed06669b535fff7d455f4d2b8ca9fabc002d6
HMAC-SHA256 Signature: 2f4ee849d95b09c08eea808b89ad0e37ac41f1357befdefdcb1ae0a7057c6588

STATUS: CERTIFIED