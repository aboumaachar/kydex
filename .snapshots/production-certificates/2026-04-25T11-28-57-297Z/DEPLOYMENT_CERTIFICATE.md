# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-25T11-28-57-297Z
Workspace: C:\kydex
Node Environment: production
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: true
Started At: 2026-04-25T11:28:57.297Z
Completed At: 2026-04-25T11:30:39.326Z
DurationMs: 102029
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 4445
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 17374
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 14302
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 2993
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 3704
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 867
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 55807
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 1635
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 889
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-28-57-297Z\backup_test.stderr.log

## Signature
Payload SHA256: 9893a946e12d5b850a0a615c9db03050046ed74a8526bc4d3e2adc908f986109
HMAC-SHA256 Signature: 825c43fb1e70bfef06d146cdbc417bd1acbd3d7b010c2cbab34237c2153d36ec

STATUS: CERTIFIED