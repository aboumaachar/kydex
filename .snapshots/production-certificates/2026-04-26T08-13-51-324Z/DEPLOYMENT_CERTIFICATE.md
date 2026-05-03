# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T08-13-51-324Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-26T08:13:51.324Z
Completed At: 2026-04-26T08:14:40.477Z
DurationMs: 49153
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 8157
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-13-51-324Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-13-51-324Z\api_build.stderr.log

### web_build
Status: FAIL
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 3221226505
DurationMs: 40986
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-13-51-324Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-13-51-324Z\web_build.stderr.log

## Signature
Payload SHA256: df81065a02beaf5b1e1430a08f720be4d21cfe3b1e39a15139e02579736592e1
HMAC-SHA256 Signature: bf38a4e3ad3f9bed2328a192391d19037ab2da6f5fd7b3ad3c38a3b54236300e

STATUS: NOT CERTIFIED