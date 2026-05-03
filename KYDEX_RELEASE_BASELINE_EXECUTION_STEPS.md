# KYDEX Release Baseline Execution Steps
## v0.2.0-runtime-green

## Objective
Execute the four post-smoke-gate steps required to lock KYDEX as a stable runtime baseline before moving into RBAC and Evidence Governance.

---

# Step 1 — Keep Upload Debug Logs Gated

## Goal
Ensure upload diagnostics remain available for troubleshooting but are disabled by default and never expose sensitive upload contents in production.

## Actions

1. Confirm the upload diagnostics are controlled by:

```env
UPLOAD_DEBUG_LOGS=false
```

2. Ensure production `.env` files do not enable upload debug logging.

3. Add this note to the relevant runbook:

```md
UPLOAD_DEBUG_LOGS may only be enabled temporarily in local/staging troubleshooting.
It must remain disabled in production unless explicitly approved for a short diagnostic window.
Do not log full uploaded files, sensitive names, identity documents, or case evidence payloads.
```

4. Confirm debug logs are conditional only:

```ts
if (process.env.UPLOAD_DEBUG_LOGS === 'true') {
  // diagnostic logging only
}
```

## Acceptance Criteria

- `UPLOAD_DEBUG_LOGS=false` by default.
- No sensitive upload contents are logged in normal operation.
- Debug logging is documented as temporary and restricted.

---

# Step 2 — Update PRODUCTION_GATE.md

## Goal
Make the green release gate explicit and mandatory before any release.

## Required Commands

Add the following checklist to `PRODUCTION_GATE.md`:

```md
# KYDEX Production Release Gate

Before any release, the following commands must pass:

- [ ] npm run build -w @kydex/api
- [ ] npm run build -w @kydex/web
- [ ] npm run test:e2e -w @kydex/api
- [ ] npm run preflight
- [ ] npm run smoke

A release is blocked if any command fails.
```

## Required Release Evidence

Add this section:

```md
## Release Evidence

For each release, capture:

- API build result
- Web build result
- E2E test result
- Preflight result
- Smoke test result
- Migration status
- Docker service status
- Known blockers or warnings
```

## Acceptance Criteria

- `PRODUCTION_GATE.md` includes all five required validation commands.
- The document clearly states that failure of any command blocks release.
- Release evidence requirements are documented.

---

# Step 3 — Freeze Stable Runtime Baseline

## Goal
Mark the current state as the first stable runtime-validated baseline.

## Baseline Name

```txt
KYDEX v0.2.0-runtime-green
```

## Actions

1. Confirm the following are green:

```bash
npm run build -w @kydex/api
npm run build -w @kydex/web
npm run test:e2e -w @kydex/api
npm run preflight
npm run smoke
```

2. Create a baseline note:

```md
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
```

3. If using Git, create a tag:

```bash
git add .
git commit -m "chore: lock KYDEX v0.2.0 runtime-green baseline"
git tag v0.2.0-runtime-green
```

4. Optional push:

```bash
git push origin main
git push origin v0.2.0-runtime-green
```

## Acceptance Criteria

- Baseline name is documented.
- All release gate commands pass.
- Git tag is created if repository is under version control.

---

# Step 4 — Prepare Next Pass: RBAC + Evidence Governance

## Goal
Start the next controlled security pass without adding unrelated product features.

## Scope

The next pass must focus only on:

1. Route-level RBAC
2. Immutable audit rules
3. Evidence package access restrictions
4. HIGH / CRITICAL case permissions
5. Prevention of unauthorized evidence download

## Claude / Codex Execution Prompt

Use the following prompt for the next implementation pass:

```md
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
```

## Acceptance Criteria

- RBAC is route-level, not global.
- Evidence packages are protected.
- Audit logs are immutable.
- HIGH / CRITICAL case handling is governed.
- Full release gate remains green after the pass.

---

# Final Rule

No new feature development should begin until:

```txt
KYDEX v0.2.0-runtime-green is documented, tagged, and protected by the release gate.
```

