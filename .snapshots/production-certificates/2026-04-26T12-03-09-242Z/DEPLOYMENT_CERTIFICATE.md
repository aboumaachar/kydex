# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T12-03-09-242Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: true
Started At: 2026-04-26T12:03:09.242Z
Completed At: 2026-04-26T12:08:06.311Z
DurationMs: 297070
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 7354
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\api_build.stderr.log

### web_build
Status: PASS
Command: set NODE_OPTIONS=--max-old-space-size=4096&& npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 24282
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 17941
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\api_e2e.stderr.log

### match_validate
Status: PASS
Command: npm run match:validate
Attempts: 1
Exit Code: 0
DurationMs: 87438
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\match_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\match_validate.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 2654
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 15301
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 996
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 138614
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 1247
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 1220
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T12-03-09-242Z\backup_test.stderr.log

## Signature
Payload SHA256: 357edc02266b15a7cc7209120c8858d4cbceb24f93b7901a72afbb08eb8cc4d8
HMAC-SHA256 Signature: 2a22c07b75bda5e9ebf6b486706432fe65dbaba0314d2c6f2e4bd8f1c3ec25b0

STATUS: CERTIFIED