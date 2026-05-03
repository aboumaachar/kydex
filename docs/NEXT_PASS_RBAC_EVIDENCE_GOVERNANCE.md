# KYDEX RBAC + Evidence Governance Pass

Do not add new product features.

Use the current baseline: KYDEX v0.2.0-runtime-green.

Implement controlled security and evidence governance.

## Tasks

1. Add route-level RBAC without restoring the previous global RolesGuard issue.

2. Protect sensitive routes:

| Route | Required Access |
|------|-----------------|
| POST /api/v1/data-sources/upload | ADMIN / COMPLIANCE_ADMIN |
| POST /api/v1/bulk-screen | ADMIN / COMPLIANCE_OFFICER |
| GET /api/v1/bulk-screen/:jobId | ADMIN / COMPLIANCE_OFFICER |
| POST /api/v1/cases/:caseId/evidence-package | COMPLIANCE_OFFICER / ADMIN |
| GET /api/v1/cases/:caseId/evidence-package | COMPLIANCE_OFFICER / ADMIN |
| GET /api/v1/audit-logs | ADMIN only |
| GET /api/v1/health/preflight | ADMIN only |

3. Add immutable audit protections:

- audit logs cannot be edited
- audit logs cannot be deleted through the API
- audit log creation must be append-only

4. Add evidence package access restrictions:

- notaries may see case summary only
- compliance officers may generate/view evidence packages
- admins may view all evidence packages
- API clients may not access council evidence packages

5. Add HIGH / CRITICAL case governance:

- HIGH cases require compliance officer review
- CRITICAL cases require escalation status
- case clearance must require reviewer identity and justification

6. Add tests for:

- unauthorized evidence access returns 403
- notary cannot generate evidence package
- compliance officer can generate evidence package
- audit logs cannot be deleted
- admin can access preflight
- non-admin cannot access preflight

## Validation Commands

Run:

npm run build -w @kydex/api
npm run build -w @kydex/web
npm run test:e2e -w @kydex/api
npm run preflight
npm run smoke

## Required Output

Return:

1. Files changed
2. RBAC rules implemented
3. Evidence restrictions implemented
4. Audit immutability rules implemented
5. Tests added
6. Validation results
7. Remaining blockers
