# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T07-04-19-921Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: NON_STRICT
Signing Key Source: FALLBACK
Production Valid: false
Started At: 2026-04-26T07:04:19.921Z
Completed At: 2026-04-26T07:06:11.312Z
DurationMs: 111392
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
DurationMs: 6400
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 23319
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 20499
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 3604
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 7160
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 1019
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 44013
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 2996
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 2361
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-19-921Z\backup_test.stderr.log

## Signature
Payload SHA256: c9349a69ec65491f790d9e5901df47aae44891d2f44d90fc833e9481cc9a89f6
HMAC-SHA256 Signature: 520413c45143c571e8fb17229abacdd69b740e21e4c374c3a03d8fd8d6fc58b7

STATUS: CERTIFIED