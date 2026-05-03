# KYDEX Final Deployment Runbook

Prepared for: Notary Council UAT and deployment readiness
Latest certified deployment certificate: kydex-prod-2026-04-27T03-32-22-703Z
Certification state: productionValid true
Prepared date: 2026-04-27

## Objective

Deploy and verify the KYDEX certified Arabic production-valid baseline for Notary Council use.

Required final certification result:

- `npm run production:certify`
- `productionValid: true`

## 1. Prerequisites

- Node.js 20 or later
- npm 10 or later
- Docker Desktop with running engine
- Access to `.env.production` secrets
- Access to the deployment signing key
- Access to backup and restore scripts

## 2. Required Environment Variables

Populate `.env.production` from the approved secret source.

Minimum required areas:

- `NODE_ENV=production`
- `API_PORT`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `JWT_SECRET`
- `SMOKE_TEST_EMAIL`
- `SMOKE_TEST_PASSWORD`
- `BACKUP_ENCRYPTION_KEY`
- `CORS_ORIGIN_WHITELIST`

## 3. Strict Signing Key Requirement

Strict signing is mandatory for a production-valid certificate.

Set:

- `DEPLOYMENT_CERT_STRICT_SIGNING=true`
- `DEPLOYMENT_CERT_SIGNING_KEY=<minimum 32 characters from approved secret store>`

If the signing key is missing or short, production certification is not valid.

## 4. Docker and Infrastructure Startup

Start the local or server-side deployment prerequisites first.

For local infrastructure validation:

```bash
npm run infra:up
```

Confirm service status:

```bash
npm run infra:status
```

Expected dependencies:

- PostgreSQL
- Redis
- MinIO

For full production deployment:

```bash
npm run deploy:prod:up
```

## 5. Database Migration

Apply production migrations before starting user testing or go-live.

```bash
npm run db:migrate:prod
```

Expected result:

- migration completes without error
- the schema includes the latest certified baseline changes

## 6. Seed or Admin Creation

Create the admin seed dataset when preparing a fresh environment.

```bash
npm run db:seed:prod
```

Verify that at least one approved admin account exists for UAT and operational verification.

## 7. Health and Readiness Checks

Run readiness verification:

```bash
npm run preflight
```

Expected healthy areas:

- environment configuration present
- PostgreSQL healthy
- Redis healthy
- worker healthy
- MinIO healthy

## 8. Smoke Test

Run the smoke test after deployment and after any major configuration change.

```bash
npm run smoke
```

Expected result:

- login succeeds
- screening flow succeeds
- evidence generation flow succeeds
- bulk screening flow succeeds

## 9. Source and Match Validation

Run the official source and validation checks:

```bash
npm run source:verify
npm run match:validate
```

Expected result:

- official source workflows succeed
- match validation passes against the certified dataset

## 10. Backup Test

Run backup proof before go-live:

```bash
npm run backup:test
```

Expected result:

- backup artifact created
- restore verification succeeds
- evidence of backup readiness is retained

## 11. Production Certification Command

Run the final deployment gate:

```bash
npm run production:certify
```

Acceptance requirement:

- latest certificate shows `productionValid: true`
- latest certificate references strict signing mode
- latest certificate references `DEPLOYMENT_CERT_SIGNING_KEY`

Current certified reference baseline:

- certificate `kydex-prod-2026-04-27T03-32-22-703Z`
- Arabic production-valid baseline

## 12. Rollback Plan

If deployment verification fails:

1. stop the current deployment stack
2. restore the latest validated backup set
3. execute the tested restore workflow
4. redeploy the previous known-good image set
5. rerun preflight and smoke

Relevant commands and references:

- `npm run deploy:prod:down`
- `deploy/backup/restore-test.ps1`
- `BACKUP_RECOVERY_RUNBOOK.md`

## 13. Incident Contact Procedure

When a deployment or live UAT incident occurs:

1. classify severity as Sev1, Sev2, or Sev3
2. preserve audit and evidence artifacts
3. contain impact
4. recover service using the runbook and backup procedure
5. document root cause and corrective actions

Required coordination channels:

- council representative
- technical representative
- KYDEX deployment owner

Minimum evidence to preserve:

- latest deployment certificate
- relevant audit records
- timeline export when applicable
- verification result for exported evidence

## 14. Final Go-Live Readiness Statement

KYDEX is ready for Notary Council UAT or controlled production deployment only when the environment reproduces the certified Arabic production-valid baseline and the final certification result remains `productionValid true`.