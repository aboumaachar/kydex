# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T08-15-04-265Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-26T08:15:04.265Z
Completed At: 2026-04-26T08:15:43.345Z
DurationMs: 39080
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 12655
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-15-04-265Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-15-04-265Z\api_build.stderr.log

### web_build
Status: FAIL
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 134
DurationMs: 26415
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-15-04-265Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-15-04-265Z\web_build.stderr.log

## Signature
Payload SHA256: a29ec3b8f0e9de8a10af0675b904e927e7818ff72b4ac00548245c9d2c34e81a
HMAC-SHA256 Signature: accaf3b35f424d7f9b671e91d79d67134334b54c0f3a1abd821c0796352efaaa

STATUS: NOT CERTIFIED