# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-25T09-25-34-642Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-25T09:25:34.642Z
Completed At: 2026-04-25T09:25:34.645Z
DurationMs: 3
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### signing_precheck
Status: FAIL
Command: pre-gate signing policy validation
Attempts: 1
Exit Code: 1
DurationMs: 0
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-34-642Z\signing-precheck.stderr.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-25T09-25-34-642Z\signing-precheck.stderr.log

Notes:
- Strict signing enabled: DEPLOYMENT_CERT_SIGNING_KEY is required and must be at least 32 characters.

## Signature
Payload SHA256: afeeea8f63c563673cde5a9d93b85b6421f924614f58dca54928f2fe2b907846
HMAC-SHA256 Signature: UNSIGNED_PRECHECK_FAILED

STATUS: NOT CERTIFIED