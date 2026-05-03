# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-27T03-19-16-583Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-27T03:19:16.583Z
Completed At: 2026-04-27T03:20:24.027Z
DurationMs: 67444
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 5676
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\api_build.stderr.log

### web_build
Status: PASS
Command: set NODE_OPTIONS=--max-old-space-size=4096&& npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 24341
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\web_build.stderr.log

### i18n_verify
Status: PASS
Command: npm run i18n:verify
Attempts: 1
Exit Code: 0
DurationMs: 1054
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\i18n_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\i18n_verify.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 20092
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\api_e2e.stderr.log

### arabic_validate
Status: PASS
Command: npm run arabic:validate
Attempts: 1
Exit Code: 0
DurationMs: 9219
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\arabic_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\arabic_validate.stderr.log

### match_validate
Status: FAIL
Command: npm run match:validate
Attempts: 1
Exit Code: 1
DurationMs: 7053
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\match_validate.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-19-16-583Z\match_validate.stderr.log

## Signature
Payload SHA256: 7e859ee43b02cb4a5691aa7bedb58b1fc07d008fc19e856257ca9a3f23eecfa2
HMAC-SHA256 Signature: fba77831057bfd92d74b6af14108eb9db1899e4e69d69e9e9d64afbfd89d80b1

STATUS: NOT CERTIFIED