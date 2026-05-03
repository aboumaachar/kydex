# KYDEX Production Deployment Certificate

Certificate Version: v1
Certificate ID: kydex-prod-2026-04-26T07-13-19-155Z
Workspace: C:\kydex
Node Environment: unknown
Signing Mode: STRICT
Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
Production Valid: true
Started At: 2026-04-26T07:13:19.155Z
Completed At: 2026-04-26T07:15:14.854Z
DurationMs: 115701
Command: npm run production:certify
Overall Status: PASS
Failed Count: 0

## Gate Results

### api_build
Status: PASS
Command: npm run build -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 10001
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\api_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\api_build.stderr.log

### web_build
Status: PASS
Command: npm run build -w @kydex/web
Attempts: 1
Exit Code: 0
DurationMs: 26595
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\web_build.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\web_build.stderr.log

### api_e2e
Status: PASS
Command: npm run test:e2e -w @kydex/api
Attempts: 1
Exit Code: 0
DurationMs: 20003
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\api_e2e.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\api_e2e.stderr.log

### preflight
Status: PASS
Command: npm run preflight
Attempts: 1
Exit Code: 0
DurationMs: 3630
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\preflight.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\preflight.stderr.log

### smoke
Status: PASS
Command: npm run smoke
Attempts: 1
Exit Code: 0
DurationMs: 10897
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\smoke.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\smoke.stderr.log

### architecture_verify
Status: PASS
Command: npm run architecture:verify
Attempts: 1
Exit Code: 0
DurationMs: 977
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\architecture_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\architecture_verify.stderr.log

### source_verify
Status: PASS
Command: npm run source:verify
Attempts: 1
Exit Code: 0
DurationMs: 40986
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\source_verify.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\source_verify.stderr.log

### security_check
Status: PASS
Command: npm run security:check
Attempts: 1
Exit Code: 0
DurationMs: 1274
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\security_check.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\security_check.stderr.log

### backup_test
Status: PASS
Command: npm run backup:test
Attempts: 1
Exit Code: 0
DurationMs: 1318
Stdout: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\backup_test.stdout.log
Stderr: C:\kydex\.snapshots\production-certificates\2026-04-26T07-13-19-155Z\backup_test.stderr.log

## Signature
Payload SHA256: cae794335e2bd1e3befacf3ccbbe6a4239b74cb33513be32811ba72284bd9b9d
HMAC-SHA256 Signature: 422e8c596247dfd5a9d069da4bb110c66b31d198247f6e797260aed0743eb3f5

STATUS: CERTIFIED