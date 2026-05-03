# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T08-20-07-956Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-26T08:20:07.956Z
Completed At: 2026-04-26T08:25:17.029Z
DurationMs: 309075
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 7490
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-20-07-956Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-20-07-956Z\api_build.stderr.log

### web_build
Status: PASS
Command: set NODE_OPTIONS=--max-old-space-size=4096&& npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 22667
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-20-07-956Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-20-07-956Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 37446
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-20-07-956Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-20-07-956Z\api_e2e.stderr.log

### match_validate
Status: FAIL
Command: npm run match:validate
Attempts: 1
Exit Code: 1
DurationMs: 241434
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-20-07-956Z\match_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-20-07-956Z\match_validate.stderr.log

Notes:
- Command timed out after 240000ms and was terminated.

## Signature
Payload SHA256: 99e1f18c8e8af05751d5e28f75df12705b96cd202f2b033a8c471380cd9be505
HMAC-SHA256 Signature: cb8085ac477ed0506b7bd92cd1dc28b92659fd4acdac72d7d8bc1753cbb9d139

STATUS: NOT CERTIFIED