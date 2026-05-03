# KYDEX Phase 9 Production Hardening Report

Date: 2026-05-02
Workspace: C:\kydex

## Scope Delivered In This Pass

- Notary API key lifecycle hardening
- Failed auth logging and abuse-trigger suspension
- Membership and billing-period enforcement for notary screening
- Plan-aware usage control and rate-limit response contract
- Admin API surfaces for key operations and usage visibility
- Dashboard admin pages for notary, subscription, and usage management

## Implemented Security Hardening

### API key lifecycle

Implemented endpoints:
- GET /api/v1/admin/notary-keys
- POST /api/v1/admin/notary-keys
- POST /api/v1/admin/notary-keys/:id/rotate
- POST /api/v1/admin/notary-keys/:id/revoke
- POST /api/v1/admin/notary-keys/:id/suspend
- POST /api/v1/admin/notary-keys/:id/activate
- GET /api/v1/admin/notary-keys/:id/usage

Rules enforced:
- Notary keys are stored as SHA-256 hashes only
- Key secrets are returned only at create/rotate time
- Full keys are never returned by listing APIs
- Key rotation does not delete notary profile
- Revocation and suspension apply immediately

### Failed auth and abuse controls

- Every auth failure in notary guard is persisted in NotaryAuthAttempt
- Failure metadata includes slug, key hash, IP, user agent, site, client header
- Failure counters are tracked per key
- Auto-suspend is triggered when failures exceed configured threshold in window

### Membership and access posture

Membership states now supported:
- TRIAL
- ACTIVE
- PAST_DUE
- SUSPENDED
- CANCELLED
- EXPIRED

Blocking behavior:
- PAST_DUE/SUSPENDED/CANCELLED/EXPIRED blocked
- Expired trial blocked
- Expired billing window blocked

### Rate-limit contract

When usage is exceeded, KYDEX returns:

```json
{
  "status": "rate_limit_exceeded",
  "message": "Your KYDEX usage limit has been reached for this billing period.",
  "resetAt": "<ISO timestamp>"
}
```

## Data Model Additions

- MembershipStatus enum
- NotaryApiKeyStatus enum
- NotaryProfile billing and usage fields
- NotaryApiKey lifecycle and auth-failure fields
- NotaryAuthAttempt audit table

## Files Updated

- prisma/schema.prisma
- prisma/migrations/20260502103000_phase9_security_commercial/migration.sql
- apps/api/src/notaries/notary-api-key.guard.ts
- apps/api/src/notaries/notary-screening.controller.ts
- apps/api/src/notaries/notaries.module.ts
- apps/api/src/notaries/notary-admin.controller.ts
- apps/api/src/notaries/notary-admin.service.ts
- apps/api/src/notaries/notary-usage-policy.service.ts
- apps/api/src/notaries/dto/create-notary-key.dto.ts
- apps/api/src/ofac-screening/ofac-screening.service.ts
- apps/web/src/lib/api.ts
- apps/web/src/components/dashboard-nav.tsx
- apps/web/src/app/dashboard/admin/notaries/page.tsx
- apps/web/src/app/dashboard/admin/notaries/[slug]/page.tsx
- apps/web/src/app/dashboard/admin/subscriptions/page.tsx
- apps/web/src/app/dashboard/admin/usage/page.tsx

## Open Production Hardening Items (Next Pass)

- Backup/restore execution drill evidence
- Final production gate script run

## Additional Delivery In This Pass (Phase 9D + 9F)

### Scheduled OFAC sync automation

Implemented scheduled jobs:
- Every 30 minutes: OFAC health check
- Every 6 hours: OFAC changes/latest check
- Daily at midnight: safe local copy refresh (non-destructive)

Safety behavior implemented:
- Daily refresh uses staged list summaries before replace
- Local source entities are never destroyed by scheduled refresh
- Source status updated only after successful completion
- Failures are logged to sync-run history and source error fields

Files:
- apps/api/src/sources/ofac-sync.scheduler.ts
- apps/api/src/sources/sources.service.ts
- apps/api/src/sources/sources.module.ts

### Monitoring and admin alerts surface

Implemented backend summary endpoint:
- GET /api/v1/admin/monitoring

Implemented dashboard route:
- /dashboard/admin/monitoring

Monitoring coverage includes:
- API database health probe
- OFAC source status and sync failures (24h)
- Failed notary auth (1h/24h)
- Fallback activations (24h)
- OCR review-required events (24h)
- WordPress notary screening errors (24h)
- High-risk match events (24h)

Files:
- apps/api/src/notaries/notary-admin.controller.ts
- apps/api/src/notaries/notary-admin.service.ts
- apps/web/src/app/dashboard/admin/monitoring/page.tsx
- apps/web/src/lib/api.ts
- apps/web/src/components/dashboard-nav.tsx

## Additional Delivery In This Pass (Phase 9G)

### Legal and compliance wording hardening

Implemented wording hardening across user-visible compliance surfaces:
- Replaced definitive match and blocking labels with escalation/review-safe wording in i18n labels
- Added persistent decision-support disclaimer banner in dashboard shell
- Added explicit human-review disclaimer on manual screening result card
- Added disclaimer copy in inquiry detail transaction payload screen
- Updated legal and privacy pages with explicit decision-support language
- Updated compliance/demo docs to remove definitive sanctions phrase examples

Files:
- apps/web/src/i18n/en.json
- apps/web/src/i18n/ar.json
- apps/web/src/app/dashboard/_components/dashboard-shell.tsx
- apps/web/src/app/screening/new/page.tsx
- apps/web/src/app/dashboard/inquiries/[id]/page.tsx
- apps/web/src/app/dashboard/screening/logs/page.tsx
- apps/web/src/app/legal/page.tsx
- apps/web/src/app/privacy/page.tsx
- apps/api/src/scoring/match-decision.service.ts
- KYDEX_CLIENT_DEMO_SCRIPT.md
- KYDEX_SECURITY_AND_COMPLIANCE_SUMMARY.md
- KYDEX_COMMERCIAL_FEATURES.md
