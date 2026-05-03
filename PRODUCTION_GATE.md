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

## Certification Rule

Production certification is invalid unless both commands below pass:

- npm run architecture:verify
- npm run source:verify

## Required Smoke Endpoints

- POST /auth/login
- POST /data-sources/upload
- POST /screen
- GET /cases
- POST /cases/:id/evidence-package
- POST /bulk-screen
- GET /bulk-screen/:id

## Final Rule

No feature ships without passing governance.
