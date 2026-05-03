# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T08-34-21-618Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-26T08:34:21.618Z
Completed At: 2026-04-26T08:41:14.591Z
DurationMs: 412989
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 17836
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\api_build.stderr.log

### web_build
Status: PASS
Command: set NODE_OPTIONS=--max-old-space-size=4096&& npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 79269
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 34607
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\api_e2e.stderr.log

### match_validate
Status: PASS
Command: npm run match:validate
Attempts: 1
Exit Code: 0
DurationMs: 214635
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\match_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\match_validate.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 8512
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\preflight.stderr.log

### smoke
Status: FAIL
Command: npm run smoke
Attempts: 1
Exit Code: 1
DurationMs: 57987
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-34-21-618Z\smoke.stderr.log

## Signature
Payload SHA256: 64575d5a84c54dfc8ec29aeaa857c3ac4979f7d397202e7f9aaf749e7ed50f30
HMAC-SHA256 Signature: d8398bbd213bae792ae76a24b0ef1a56e7d8864b4d35c6f8076f2c4ea79f12a7

STATUS: NOT CERTIFIED