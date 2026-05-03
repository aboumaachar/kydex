# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T08-16-08-872Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: false
Started At: 2026-04-26T08:16:08.872Z
Completed At: 2026-04-26T08:17:16.466Z
DurationMs: 67594
Command: npm run production:certify
Overall Status: FAIL
Failed Count: 1

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 6368
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\api_build.stderr.log

### web_build
Status: PASS
Command: set NODE_OPTIONS=--max-old-space-size=4096&& npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 20575
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 17001
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 3345
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\preflight.stderr.log

### smoke
Status: FAIL
Command: npm run smoke
Attempts: 1
Exit Code: 1
DurationMs: 20295
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T08-16-08-872Z\smoke.stderr.log

## Signature
Payload SHA256: 405ef79b8b9c642bc7fbda6bb7f74075567b47e3b3885d1c9ed21197ad891d2b
HMAC-SHA256 Signature: b1497c494d5dab6abc975ce451c91517245232da31fbd1061e67289a1e1c8720

STATUS: NOT CERTIFIED