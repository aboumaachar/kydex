# KYDEX Security and Audit Specification

## 1. Security Philosophy

KYDEX handles sensitive compliance data.

The system must assume:

- users can be compromised
- networks are unsafe
- insiders can misuse access
- logs may be legally reviewed

Design principle:

> verify, restrict, log, and preserve evidence.

## 2. Data Security

### At rest

- PostgreSQL disk encryption.
- MinIO encrypted storage.
- Sensitive documents encrypted.
- No database public access.

### In transit

- HTTPS only.
- TLS 1.2 minimum, TLS 1.3 preferred.
- Internal services isolated via Docker network.

## 3. Authentication

### Web

- Email/password.
- bcrypt or argon2 password hashing.
- JWT access token.
- Refresh token rotation.
- 2FA for admin/reviewer roles.

### API

- API keys hashed in database.
- API key scopes.
- Rate limiting.
- Optional IP allowlist.

## 4. Authorization

Role-based access control:

```txt
SUPER_ADMIN
COUNCIL_ADMIN
COMPLIANCE_OFFICER
REVIEW_COMMITTEE_MEMBER
NOTARY
AUDITOR
API_CLIENT
```

Case visibility must be restricted by role.

## 5. Audit Logging

Log every:

- login
- failed login
- screening query
- result display
- PDF generation
- case creation
- case review action
- escalation package creation
- data source upload
- data ingestion failure
- admin action

Audit logs must include:

```txt
user_id
tenant_id
action
entity_type
entity_id
timestamp
ip_address
user_agent
metadata
```

## 6. Immutability Rules

- Audit logs are append-only.
- High-risk cases cannot be deleted.
- Dataset versions cannot be overwritten.
- Corrections must be added as new records/actions.

## 7. Backups

Minimum:

- daily database backup
- daily MinIO backup
- encrypted backups
- 30-day retention for MVP
- test restore monthly

## 8. Abuse Prevention

- rate limiting
- suspicious API usage detection
- login attempt limits
- no unlimited free screening
- blocked users cannot access case records

## 9. Security Milestones

### MVP

- HTTPS
- hashed passwords
- role access
- audit logs
- backups

### Phase 2

- 2FA
- IP allowlist
- field-level encryption
- audit export

### Enterprise Phase

- penetration test
- ISO 27001 plan
- SOC 2 readiness
- external security review
