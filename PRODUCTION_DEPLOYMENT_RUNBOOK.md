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

## Rollback
1. npm run deploy:prod:down
2. Restore from latest tested backup using deploy/backup/restore-test.ps1 workflow.
3. Re-deploy previous known-good image set.
