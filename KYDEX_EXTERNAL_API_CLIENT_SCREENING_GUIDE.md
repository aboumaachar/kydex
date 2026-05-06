# KYDEX External API Client Screening Guide

## Endpoint

`POST /api/v1/notaries/:slug/screening/search`

Example:

`POST /api/v1/notaries/sandranassif/screening/search`

## KYDEX-Side Provisioning (Required)

Before any external client can connect, KYDEX must issue an active notary API key.

1. Login to KYDEX admin as `SUPER_ADMIN`, `COUNCIL_ADMIN`, or `COMPLIANCE_OFFICER`.
2. Create (or verify) the notary key:

```http
POST /api/v1/admin/notary-keys
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "notarySlug": "sandranassif",
  "displayName": "Sandra Nassif Kallab",
  "label": "Sandra office portal"
}
```

3. Save the returned `rawKey` securely on the Sandra server only.
4. Do not expose `rawKey` in frontend JavaScript or public HTML.
5. For key rotation, call:

```http
POST /api/v1/admin/notary-keys/:id/rotate
Authorization: Bearer <admin-jwt>
```

6. Update Sandra server config immediately after rotation.

Minimum KYDEX profile requirements for successful requests:

- `isScreeningEnabled = true`
- `featureManualScreening = true`
- membership in an active state (`ACTIVE`, valid billing/trial)
- key status `ACTIVE` and `isActive = true`

## Required Headers

- `Content-Type: application/json`
- `x-kydex-notary-key: <active-notary-api-key>`
- `x-kydex-client: external-api-client`

## Optional Headers

- `x-kydex-client-name: <your-app-name>`
- `x-kydex-wordpress-site: <site-url>` (only if your integration is WordPress)

Recommended for Sandra:

- `x-kydex-client: external-api-client`
- `x-kydex-client-name: sandra-office-portal`

## Request Body

```json
{
  "query": "Mohammad Ali",
  "screeningType": "ofac",
  "sources": ["OFAC"],
  "liveVerify": true,
  "clientReference": "client-system-reference"
}
```

Aliases accepted for the query field:

- `query`
- `fullName`
- `subject`
- `name`

KYDEX normalizes these aliases internally to `query`.

## Response Contract

Successful response includes:

- `status`
- `query`
- `normalizedQuery`
- `queryVariants`
- `sourceMode`
- `liveSourceChecked`
- `usedFallback`
- `sourceStatus`
- `highestScore`
- `matches`
- `auditId`
- `warning` (when applicable)

Example (live verified):

```json
{
  "status": "strong_potential_match",
  "query": "Mohammad Ali",
  "normalizedQuery": "mohammad ali",
  "queryVariants": ["Mohammad Ali", "mohammad ali", "محمد علي"],
  "sourceMode": "live_verified",
  "liveSourceChecked": true,
  "usedFallback": false,
  "sourceStatus": {
    "ofac": "connected",
    "httpStatus": 200,
    "latencyMs": 903,
    "liveVerifyRequested": true,
    "requestedSources": ["OFAC"],
    "localCopyAvailable": true
  },
  "highestScore": 92,
  "matches": [],
  "auditId": "cmop9l058000dm1dnaqzof8pm",
  "warning": null
}
```

Example (fallback):

```json
{
  "sourceMode": "local_fallback",
  "liveSourceChecked": false,
  "usedFallback": true,
  "warning": "Screening completed using local KYDEX copy. Original source unavailable at search time."
}
```

## Validation Error Contract

If the query is missing:

```json
{
  "status": "validation_failed",
  "message": "A screening query is required.",
  "acceptedFields": ["query", "fullName", "subject", "name"]
}
```

## Source Modes

- `local_only`: local KYDEX source-library data was used.
- `local_fallback`: live source unavailable/degraded; local KYDEX source-library fallback used.
- `live_verified`: KYDEX performed live source health verification and screened with local auditable index.
- `degraded`: source reachable but incomplete/slow/partially unavailable.

## Smoke Test Command

Run:

`npm run test:live-screening`

Environment overrides:

- `KYDEX_API_BASE_URL` (default `http://localhost:4000/api/v1`)
- `KYDEX_NOTARY_SLUG` (default `sandranassif`)
- `KYDEX_NOTARY_KEY` (default `dev_sandranassif_key`)
- `KYDEX_CLIENT_NAME` (default `local-live-smoke`)

## Security and Audit Notes

- OFAC raw URLs are never exposed to browser clients.
- API key guard enforces active key state and active membership.
- Manual screening feature gate is enforced before search execution.
- Rate limits and usage counters are enforced.
- IP address and user-agent are logged in screening transactions.
- WordPress flow remains unchanged (`x-kydex-client: wordpress-notary-plugin`).
