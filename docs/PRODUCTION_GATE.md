# KYDEX Production Release Gate

Before any release, the following commands must pass:

- [ ] npm run build -w @kydex/api
- [ ] npm run build -w @kydex/web
- [ ] npm run test:e2e -w @kydex/api
- [ ] npm run preflight
- [ ] npm run smoke
- [ ] npm run architecture:verify
- [ ] npm run source:verify

A release is blocked if any command fails.

## Release Evidence

For each release, capture:

- API build result
- Web build result
- E2E test result
- Preflight result
- Smoke test result
- Architecture verification result
- Source verification result
- Migration status
- Docker service status
- Known blockers or warnings

## Additional Governance Checks
- [ ] Prisma migrate successful
- [ ] No HIGH severity bugs open

## Required Smoke Endpoints
- POST /auth/login
- POST /data-sources/upload
- POST /screen
- GET /cases
- POST /cases/:id/evidence-package
- POST /bulk-screen
- GET /bulk-screen/:id

## Rollback Plan
1. Disable external traffic.
2. Roll back to previous container images.
3. Revert DB migration if needed.
4. Restore latest verified backup if migration rollback cannot recover.
5. Re-run preflight and smoke before reopening traffic.

## Monitoring Checks
- API availability and error rate
- Postgres connection saturation
- Redis/BullMQ queue depth and failure rate
- MinIO object operation failure rate
- Audit log ingestion continuity

## Final Rule
No feature ships without passing governance.
