# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-27T03-10-49-284Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-27T03:10:49.284Z
Completed At: 2026-04-27T03:11:53.413Z
DurationMs: 64129
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 6334
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-10-49-284Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-10-49-284Z\api_build.stderr.log

### web_build
Status: PASS
Command: set NODE_OPTIONS=--max-old-space-size=4096&& npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 25496
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-10-49-284Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-10-49-284Z\web_build.stderr.log

### i18n_verify
Status: PASS
Command: npm run i18n:verify
Attempts: 1
Exit Code: 0
DurationMs: 1236
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-10-49-284Z\i18n_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-10-49-284Z\i18n_verify.stderr.log

### api_e2e
Status: FAIL
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 1
DurationMs: 31048
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-27T03-10-49-284Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-27T03-10-49-284Z\api_e2e.stderr.log

## Signature
Payload SHA256: 65aa7a5cded125d67195e526066da078df1309b3830fb73685d71de8ec6413c6
HMAC-SHA256 Signature: 861e053cafe86be27e03a66da277fe2cc6f7e25b302166e0d76414510d9aac06

STATUS: NOT CERTIFIED