# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T08-09-58-880Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: NON_STRICT
Signing Key Source: FALLBACK
Production Valid: false
Started At: 2026-04-26T08:09:58.880Z
Completed At: 2026-04-26T08:11:03.806Z
DurationMs: 64927
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

Warning: NON-STRICT SIGNING MODE - NOT VALID FOR PRODUCTION

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 9096
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-09-58-880Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-09-58-880Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 24799
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-09-58-880Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-09-58-880Z\web_build.stderr.log

### api_e2e
Status: FAIL
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 1
DurationMs: 31019
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-09-58-880Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-09-58-880Z\api_e2e.stderr.log

## Signature
Payload SHA256: 9c132d6af4ee9c2236e8279e3aac70cc424dcae585803310a1d7415602b0f53b
HMAC-SHA256 Signature: f43165fc499c464d1670c10057eb7122711493689921f55d769c2b7c6aa15031

STATUS: NOT CERTIFIED