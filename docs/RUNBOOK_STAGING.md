# RUNBOOK_STAGING

## Purpose
Controlled staging deployment and verification flow before production release.

## 1. Deploy Build
- Deploy API, web, worker, and infrastructure with immutable image tags.
- Inject `.env.production` from secret manager.
- `UPLOAD_DEBUG_LOGS` may only be enabled temporarily in local or staging troubleshooting.
- It must remain disabled in production unless explicitly approved for a short diagnostic window.
- Do not log full uploaded files, sensitive names, identity documents, or case evidence payloads.

## 2. Apply Migrations
```bash
npm run prisma:migrate -- --name staging_release
```

## 3. Run Readiness Gate
```bash
npm run preflight
```

Expected checks:
- env present
- PostgreSQL healthy
- Redis >= 6
- BullMQ worker connected
- MinIO read/write/delete healthy

## 4. Run Smoke Flow
```bash
npm run smoke
```

## 5. Release Evidence
Record:
- commit SHA
- migration ID
- preflight JSON output
- smoke JSON output
- approver names and timestamp

## 6. Failure Handling
- API down: restart service and inspect app logs.
- DB issue: rollback migration and restore backup.
- Redis issue: restart worker and requeue failed jobs.
- Security issue: disable access, inspect audit events, notify stakeholders.
