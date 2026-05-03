# KYDEX v0.2.0-runtime-green

This baseline confirms that KYDEX has passed:

- API build
- Web build
- API E2E tests
- Infrastructure preflight
- Live smoke test

Validated runtime flows:

- Login
- Data-source upload
- Screening
- Case listing
- Evidence package generation
- Bulk screening queue and status

## Release Gate Commands

- npm run build -w @kydex/api
- npm run build -w @kydex/web
- npm run test:e2e -w @kydex/api
- npm run preflight
- npm run smoke

## Baseline Status

- Baseline name: KYDEX v0.2.0-runtime-green
- Git tag: not created in this workspace because the folder is not a Git repository
- Next pass: RBAC + Evidence Governance only
