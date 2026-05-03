# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T07-01-51-774Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: NON_STRICT
Signing Key Source: FALLBACK
Production Valid: false
Started At: 2026-04-26T07:01:51.774Z
Completed At: 2026-04-26T07:01:57.297Z
DurationMs: 5523
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
DurationMs: 5517
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-01-51-774Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-01-51-774Z\api_build.stderr.log

Notes:
- Command timed out after 1ms and was terminated.

## Signature
Payload SHA256: 3660ab41cdda9e9f31414ebcd490e4b0faaf1da889aedeb3f530c41e235a1b1b
HMAC-SHA256 Signature: 5e42f6bf4f2c264427bb6e106240a8f2691c942121823c0ca7f91d55b54d40b1

STATUS: NOT CERTIFIED