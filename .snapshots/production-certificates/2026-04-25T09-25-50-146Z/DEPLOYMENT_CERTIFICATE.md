# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-25T09-25-50-146Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: true
Started At: 2026-04-25T09:25:50.146Z
Completed At: 2026-04-25T09:26:38.085Z
DurationMs: 47939
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 4311
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 21390
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 13341
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 2653
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 3851
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\smoke.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 1307
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 1039
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-50-146Z\backup_test.stderr.log

## Signature
Payload SHA256: 16afadc878f37364d224685eda570603fe992d62ecc4b9c9ff7f898c91b7d1f7
HMAC-SHA256 Signature: afb63abaae2172e375eef1e64659fd1cc41693ad160e5295d29a5c21712e31f5

STATUS: CERTIFIED