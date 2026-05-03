# KYDEX Production Deployment Checklist

Status date: 2026-05-02

## Environment and Network

- [ ] HTTPS certificate installed and valid
- [ ] Production domain routed to web and API correctly
- [ ] API reverse-proxy path for /api/v1 verified
- [ ] CORS allow-list restricted to approved origins

## Secrets and Credentials

- [ ] Production JWT secret rotated and stored in secret manager
- [ ] Production notary keys rotated post-deploy
- [ ] Demo/test keys revoked
- [ ] Admin password changed from seeded values

## Database and Migrations

- [ ] Latest Prisma migrations applied
- [ ] Seed data reviewed for production safety
- [ ] Backup snapshot taken before rollout

## Runtime Controls

- [ ] Notary key lifecycle endpoints reachable for admins
- [ ] Membership enforcement enabled
- [ ] Rate limits enabled
- [ ] Failed-auth logging enabled
- [ ] Abuse auto-suspend threshold configured

## Source and Sync

- [ ] OFAC status endpoint healthy
- [ ] Local fallback copy available
- [x] Scheduled health/sync/import jobs implemented in API (enable via env in production)
- [ ] Manual sync control validated

## Monitoring and Alerts

- [x] API health monitor endpoint and admin summary implemented
- [ ] Web health monitor enabled
- [x] Auth-failure counters and admin monitoring visibility implemented
- [ ] Rate-limit spike alert channel configured
- [x] OFAC sync-failure auditing and admin monitoring visibility implemented

## Legal and Wording Controls

- [x] Decision-support disclaimer shown on dashboard and screening surfaces
- [x] Result labels use escalation/review-safe language (no definitive sanctions declarations)
- [x] Legal/privacy pages include explicit human-review requirement

## Backup and Recovery

- [ ] Database backup job configured
- [ ] Source-library backup job configured
- [ ] Restore tested in staging
- [ ] Disaster recovery checklist reviewed

## WordPress Plugin

- [ ] Allowed WordPress site list updated for production domains
- [ ] Plugin version tagged for release
- [ ] E2E manual + OCR screening pass

## Rollback

- [ ] Rollback image/tag prepared
- [ ] DB rollback strategy documented
- [ ] Feature rollback owner assigned
