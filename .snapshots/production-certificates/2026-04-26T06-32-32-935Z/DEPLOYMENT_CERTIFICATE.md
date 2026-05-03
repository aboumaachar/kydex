# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T06-32-32-935Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: NON_STRICT
Signing Key Source: FALLBACK
Production Valid: false
Started At: 2026-04-26T06:32:32.935Z
Completed At: 2026-04-26T06:33:59.680Z
DurationMs: 86745
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
DurationMs: 4944
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 18387
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 16061
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 2696
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 3759
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 903
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 38194
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 862
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 805
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T06-32-32-935Z\backup_test.stderr.log

## Signature
Payload SHA256: 28188eae28b62ad894419bce9788c5150df54270cdec68f5e3b092f61b572d61
HMAC-SHA256 Signature: ad182517b322b65f01c094ef0fac913676e774437d614579c7fd4d26f8d18241

STATUS: CERTIFIED