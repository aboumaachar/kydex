# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T07-04-11-167Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: NON_STRICT
Signing Key Source: FALLBACK
Production Valid: false
Started At: 2026-04-26T07:04:11.167Z
Completed At: 2026-04-26T07:04:11.823Z
DurationMs: 656
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

Warning: NON-STRICT SIGNING MODE - NOT VALID FOR PRODUCTION

## Gate Results

### api_build
Status: FAIL
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 1
DurationMs: 652
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-11-167Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-04-11-167Z\api_build.stderr.log

Notes:
- Command timed out after 1ms and was terminated.

## Signature
Payload SHA256: 3548ec6f5e14587b779cd2bc0a659b754af1744eeab90f2ba41563b48b4062b0
HMAC-SHA256 Signature: b5de196870af0dd0f0c1274c108a2cd46b11587594a7d53f33a0438ce11b0968

STATUS: NOT CERTIFIED