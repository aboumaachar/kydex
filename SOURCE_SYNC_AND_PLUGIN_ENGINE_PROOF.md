# SOURCE_SYNC_AND_PLUGIN_ENGINE_PROOF

## Scope Completed

- Source sync visibility remains exposed through enriched source summaries, sync health, and per-source sync history.
- Screening remains local-only and versioned at execution time. No live OFAC or UN query path was added to screening.
- Plugin/API access was added through tenant-scoped integration keys and `/api/v1/integrations/*` endpoints.
- Admin management for integration keys was added at `/admin/integrations`.

## Implemented Backend Endpoints

- `POST /api/v1/integrations/screen`
- `POST /api/v1/integrations/bulk-screen`
- `GET /api/v1/integrations/status`
- `GET /api/v1/integrations/usage`
- `GET /api/v1/integrations/keys`
- `POST /api/v1/integrations/keys`
- `POST /api/v1/integrations/keys/:keyId/rotate`
- `POST /api/v1/integrations/keys/:keyId/status`

## Security and Control Notes

- Integration keys are stored hashed with Argon2 and issued as one-time secrets.
- Keys are tenant-scoped and enforced through the existing `ApiKey` model.
- Revoked or disabled keys are rejected before screening.
- Allowed domains and allowed IPs are enforced from key scope metadata.
- Plugin calls reuse the existing screening and bulk-screening services, so local-version enforcement and source-readiness checks remain in force.
- Integration authentication and screen/bulk requests emit audit log entries.

## Frontend Surface Added

- `/admin/integrations` supports:
  - create key
  - rotate key
  - disable key
  - re-enable key
  - revoke key
  - view capabilities
  - view allowed domains and IPs
  - view usage count and last-used timestamp

## Validation Evidence

- `npm run build -w @kydex/api` passed.
- `npm run build -w @kydex/web` passed after stopping the active `next dev` process that held `.next/trace`.
- `npm run test:e2e -w @kydex/api -- integrations.e2e-spec.ts` passed.
- `get_errors` is clean for:
  - integration backend files
  - integration admin UI files
  - `apps/web/src/app/screening/new/page.tsx`
- The screening page parser defect was resolved by rewriting the TSX payload declaration into an explicit variable type annotation.

## Confirmed Behaviors

- Integration screen requests return `usedLocalVersions`.
- Revoked integration keys return `401 Unauthorized`.
- Successful integration requests emit integration audit events.
- Screening UI exposes active source health and local version usage details.

## Remaining Validation Blocker

- No remaining validation blocker is open for this pass.