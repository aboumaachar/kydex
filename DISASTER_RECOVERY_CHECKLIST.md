# KYDEX Disaster Recovery Checklist

## Incident Start

- [ ] Declare incident severity and incident owner
- [ ] Freeze non-essential deployments
- [ ] Capture timeline start and impacted systems

## Containment

- [ ] Confirm API/web availability status
- [ ] Confirm database integrity status
- [ ] Confirm source-library availability
- [ ] Revoke compromised notary keys if needed

## Recovery Path

- [ ] Restore database from latest valid backup
- [ ] Restore source-library fallback data
- [ ] Reapply migrations and validate schema
- [ ] Start API and web services

## Verification

- [ ] /api/v1/health/preflight passes
- [ ] /api/v1/sources/OFAC/status reachable
- [ ] Manual notary screening works
- [ ] OCR/image screening works
- [ ] Audit logs and inquiries readable

## Communication

- [ ] Issue internal status update
- [ ] Issue client-facing update (if needed)
- [ ] Record final incident report and actions
