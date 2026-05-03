# KYDEX Phase 9 Commercial Readiness Report

Date: 2026-05-02
Workspace: C:\kydex

## Business-Critical Questions Covered

### Who is allowed to use KYDEX?

- Usage is tied to notary API keys with explicit lifecycle status
- Membership state and billing windows are enforced before screening
- Unauthorized WordPress sites are blocked when allow-list is configured

### How much can each notary use?

- Plan-aware monthly limits are enforced for manual and image screening
- Additional daily controls are applied per key, site, IP, and endpoint type
- Monthly usage counters are maintained per notary profile

### What happens when a client stops paying?

- Membership states support PAST_DUE, SUSPENDED, CANCELLED, EXPIRED
- Blocked states deny screening requests
- Trial and billing expiry are enforced at runtime

### What happens if a key is compromised?

- Key can be suspended immediately
- Key can be revoked immediately
- Key can be rotated without deleting profile/history
- Failed-auth spikes auto-suspend key

## Dashboard Surfaces Added

- /dashboard/admin/notaries
- /dashboard/admin/notaries/:slug
- /dashboard/admin/subscriptions
- /dashboard/admin/usage

## Commercial Data Fields Added

On notary profile:
- membershipStatus
- planName
- planLimitManualSearches
- planLimitImageSearches
- monthlyUsageManual
- monthlyUsageImage
- billingPeriodStart
- billingPeriodEnd
- trialEndsAt
- suspendedAt
- cancelledAt

## Remaining Commercialization Tasks

- Payment-provider integration (future phase)
- Invoice generation and payment reconciliation
- Council plan policy UI for custom quota editing
- Subscription downgrade/upgrade workflows
