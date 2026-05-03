# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-27T03-23-15-268Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-27T03:23:15.268Z
Completed At: 2026-04-27T03:29:07.034Z
DurationMs: 351766
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 5988
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\api_build.stderr.log

### web_build
Status: PASS
Command: set NODE_OPTIONS=--max-old-space-size=4096&& npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 23677
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\web_build.stderr.log

### i18n_verify
Status: PASS
Command: npm run i18n:verify
Attempts: 1
Exit Code: 0
DurationMs: 1016
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\i18n_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\i18n_verify.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 19763
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\api_e2e.stderr.log

### arabic_validate
Status: PASS
Command: npm run arabic:validate
Attempts: 1
Exit Code: 0
DurationMs: 9855
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\arabic_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\arabic_validate.stderr.log

### match_validate
Status: PASS
Command: npm run match:validate
Attempts: 1
Exit Code: 0
DurationMs: 286314
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\match_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\match_validate.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 2889
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\preflight.stderr.log

### smoke
Status: FAIL
Command: npm run smoke
Attempts: 1
Exit Code: 1
DurationMs: 2248
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-23-15-268Z\smoke.stderr.log

## Signature
Payload SHA256: eb65fde166722c583ff84fb267b37bf90a010b0f701883a1d6168f00a00f0dfa
HMAC-SHA256 Signature: d97b01db3402945686f3ddd2fbc9c0b35196142958c634b3bf663aab6f6b4136

STATUS: NOT CERTIFIED