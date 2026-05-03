# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T08-11-27-694Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-26T08:11:27.694Z
Completed At: 2026-04-26T08:12:32.838Z
DurationMs: 65146
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 6639
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-11-27-694Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-11-27-694Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 22031
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-11-27-694Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-11-27-694Z\web_build.stderr.log

### api_e2e
Status: FAIL
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 1
DurationMs: 36449
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-11-27-694Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-11-27-694Z\api_e2e.stderr.log

## Signature
Payload SHA256: 1dafee253711ee58f0a074645d8939c606f656296250b4cf10e8d45d3295739b
HMAC-SHA256 Signature: 0ce84d977c7556aea13b25c139d5d3f77d51c4d0267b4f25e12ef653629c1d6e

STATUS: NOT CERTIFIED