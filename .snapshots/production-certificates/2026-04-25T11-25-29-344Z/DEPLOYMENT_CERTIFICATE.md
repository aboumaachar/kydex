# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-25T11-25-29-344Z
Workspace: C:\kydex
Node Environment: production
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: true
Started At: 2026-04-25T11:25:29.344Z
Completed At: 2026-04-25T11:27:02.495Z
DurationMs: 93152
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 4752
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 19101
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 15204
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 3475
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 4349
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 826
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 43616
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 903
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 908
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T11-25-29-344Z\backup_test.stderr.log

## Signature
Payload SHA256: 39c0953af25c7f759891d1c3cdf83258de6c6fc8b39a94bd9d535e14ab086a60
HMAC-SHA256 Signature: e82b06d167d7db8e72d57d7759dbcb9e0a1b15a9c9681037778accf0be81a8ac

STATUS: CERTIFIED