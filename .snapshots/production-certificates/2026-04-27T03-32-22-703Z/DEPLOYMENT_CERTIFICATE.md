# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-27T03-32-22-703Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: true
Started At: 2026-04-27T03:32:22.703Z
Completed At: 2026-04-27T03:42:14.528Z
DurationMs: 591826
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 7109
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\api_build.stderr.log

### web_build
Status: PASS
Command: set NODE_OPTIONS=--max-old-space-size=4096&& npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 26181
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\web_build.stderr.log

### i18n_verify
Status: PASS
Command: npm run i18n:verify
Attempts: 1
Exit Code: 0
DurationMs: 1113
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\i18n_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\i18n_verify.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 20416
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\api_e2e.stderr.log

### arabic_validate
Status: PASS
Command: npm run arabic:validate
Attempts: 1
Exit Code: 0
DurationMs: 10441
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\arabic_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\arabic_validate.stderr.log

### match_validate
Status: PASS
Command: npm run match:validate
Attempts: 1
Exit Code: 0
DurationMs: 311296
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\match_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\match_validate.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 2724
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 31167
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\smoke.stderr.log

Notes:
- Started local API runtime at http://localhost:4000 for HTTP-based certification gates.
- API runtime stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\api_runtime.stdout.log
- API runtime stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\api_runtime.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 1101
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 174497
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\source_verify.stderr.log

Notes:
- Started local API runtime at http://localhost:4000 for HTTP-based certification gates.
- API runtime stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\api_runtime.stdout.log
- API runtime stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\api_runtime.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 1107
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 1086
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-32-22-703Z\backup_test.stderr.log

## Signature
Payload SHA256: 72fcd82ae69d6bbbdcb8bd85d3b9cf85d2e992a2f5100711f997d6afdfb9ccaa
HMAC-SHA256 Signature: c6fd4f7889d67f3d189e8b546c18a5eff73e30094f64cfcacf17d3734c85b5eb

STATUS: CERTIFIED