# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-25T21-43-57-333Z
Workspace: C:\kydex
Node Environment: production
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: true
Started At: 2026-04-25T21:43:57.333Z
Completed At: 2026-04-25T21:46:04.443Z
DurationMs: 127116
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 11141
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 29201
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 19452
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 2500
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 7424
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 1023
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 53945
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 911
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 1488
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T21-43-57-333Z\backup_test.stderr.log

## Signature
Payload SHA256: adccc32e34ff8ffae07cc792602d59c959602b8c22885828e5fbe569c0e66185
HMAC-SHA256 Signature: 0c695d0409467f75483a644e3aad3bbcbbb083fe785b42b51944773e8aecd226

STATUS: CERTIFIED