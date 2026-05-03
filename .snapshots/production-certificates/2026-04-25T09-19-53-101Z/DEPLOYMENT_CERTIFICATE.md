# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-25T09-19-53-101Z
Workspace: C:\kydex
Node Environment: unknown
Started At: 2026-04-25T09:19:53.101Z
Completed At: 2026-04-25T09:20:52.882Z
DurationMs: 59781
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 8171
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 24574
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 16868
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 4522
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 3742
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\smoke.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 813
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 1048
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-19-53-101Z\backup_test.stderr.log

## Signature
Payload SHA256: 25112c953c68965a10a55ff5ec01c1707850f362c06f61c32be4b55472cdb88f
HMAC-SHA256 Signature: f55b0e5f8b50fefa1feb78a6be0c93890c9e0efed135fec78a64241cc5651730

STATUS: CERTIFIED