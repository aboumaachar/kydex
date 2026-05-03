# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-25T09-24-29-645Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: NON_STRICT
Signing Key Source: FALLBACK
Production Valid: false
Started At: 2026-04-25T09:24:29.645Z
Completed At: 2026-04-25T09:25:28.504Z
DurationMs: 58859
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
DurationMs: 8903
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 26371
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 14881
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 2703
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 4099
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\smoke.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 1029
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 863
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-24-29-645Z\backup_test.stderr.log

## Signature
Payload SHA256: 299cd88ad21c080134a1d117bf3228d82a1c44d7ff3b9e803f8013f4aa04676c
HMAC-SHA256 Signature: 3904df0f44a9cfa902e41e43be87977526806b39038740fe98acb129c206c22f

STATUS: CERTIFIED