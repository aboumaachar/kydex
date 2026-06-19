# PRODUCTION DEPLOYMENT RUNBOOK

## Scope
Deploy KYDEX for Notary Council online production.

## Architecture
- Web frontend container
- API backend container
- PostgreSQL
- Redis queue
- MinIO object storage
- Caddy reverse proxy with HTTPS
- Prometheus and Grafana monitoring
- Backup scripts for database and object storage

## Environment Separation
- Development: .env.development
- Staging: .env.staging
- Production: .env.production (copy from .env.production.example and set secrets)

## Current Host Deployment
- Public routing stays on Apache/Caddy, with the API exposed internally on `127.0.0.1:4000` and the web app on `127.0.0.1:3000`.
- Direct host API deployments use `.deploy/deploy-api.sh` after syncing a built `apps/api/dist` and a populated `.env.production` into the release directory.
- The deploy script provisions the PostgreSQL role and database from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`, rewrites the runtime `.env` with a host-local `DATABASE_URL`, runs `prisma migrate deploy`, verifies Prisma database connectivity, and restarts PM2.
- When the host already has another API on `:4000`, set `PM2_APP_NAME` and point `ENV_SOURCE` at an env file that carries a non-conflicting `API_PORT` before running the direct-host deploy helper.

## Deployment Steps
1. Populate .env.production with real secrets and domain.
   - `DEPLOYMENT_CERT_STRICT_SIGNING=true`
   - `DEPLOYMENT_CERT_SIGNING_KEY=<store in deployment secret manager; minimum 32 characters>`
2. Run database migration:
   - npm run db:migrate:prod
3. Create admin seed data:
   - npm run db:seed:prod
4. Start production stack:
   - npm run deploy:prod:up
5. Verify health:
   - npm run preflight
   - npm run smoke
6. Verify architecture and local-only source behavior:
   - npm run architecture:verify
   - npm run source:verify
   - npm run match:validate
7. Generate production certificate:
   - npm run production:certify
   - Certification is production-valid only when the signing key comes from `DEPLOYMENT_CERT_SIGNING_KEY` in strict mode and the match-validation gate passes.
8. Confirm HTTPS and domain routing through Caddy.

## Direct Host API Release
1. Build the API artifact locally: `pnpm -C apps/api build`
2. Copy `apps/api/dist` and `.env.production` to the host release directory.
3. Run `.deploy/deploy-api.sh` on the host with `ENV_SOURCE` pointed at the release copy of `.env.production` when it is not already at the default path.
4. If `:4000` is already occupied, prepare an alternate env source with a different `API_PORT` and run the helper with a distinct `PM2_APP_NAME`.
5. Validate the deployed database connection and runtime health with `npm run preflight` and the API health endpoint after PM2 restarts.

## Rollback
1. npm run deploy:prod:down
2. Restore from latest tested backup using deploy/backup/restore-test.ps1 workflow.
3. Re-deploy previous known-good image set.
