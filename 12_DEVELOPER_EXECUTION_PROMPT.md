# KYDEX Developer Execution Prompt

You are a senior full-stack engineer. Build the first KYDEX MVP using the following locked stack:

```txt
Frontend: Next.js + TypeScript + Tailwind
Backend: NestJS + TypeScript
Database: PostgreSQL
ORM: Prisma
Queue/Cache: Redis + BullMQ
Storage: MinIO
Deployment: Docker Compose
```

## Product Definition

KYDEX is a compliance workflow system with audit-grade evidence, Arabic-aware matching, and governed escalation.

It is NOT a mobile app.

It is NOT only a search engine.

## Build Order

### Step 1 — Monorepo

Create:

```txt
apps/web
apps/api
packages/shared
docs
```

### Step 2 — Docker

Add:

- PostgreSQL
- Redis
- MinIO
- API
- Web

### Step 3 — Backend

Create NestJS modules:

```txt
auth
users
tenants
api-keys
data-sources
ingestion
watchlists
screening
matching
scoring
cases
audit-logs
files
reports
health
```

### Step 4 — Database

Implement Prisma schema based on `03_KYDEX_DATABASE_SCHEMA_PRISMA.md`.

### Step 5 — Screening API

Implement:

```http
POST /api/v1/screen
```

It must:

- normalize query
- search watchlist records
- score matches
- classify risk
- create screening log
- create case if HIGH or CRITICAL

### Step 6 — Escalation

Implement case statuses:

```txt
NEEDS_REVIEW
ESCALATED_INTERNALLY
PENDING_ADDITIONAL_INFORMATION
CLEARED
SIC_PACKAGE_PREPARED
REPORTED_TO_SIC
REJECTED_BLOCKED
CLOSED
```

### Step 7 — Frontend

Create:

```txt
/login
/dashboard
/screening/new
/screening/history
/cases
/cases/[id]
/admin/data-sources
/admin/users
/admin/audit-logs
```

### Step 8 — Audit

Every sensitive action must write to `AuditLog`.

### Step 9 — Security

Implement:

- password hashing
- JWT auth
- role guards
- API key validation later
- rate limiting

## Acceptance Criteria

- User can log in.
- User can run screening.
- System returns risk score.
- System logs query.
- HIGH/CRITICAL creates case.
- Reviewer can clear or escalate.
- Admin can upload data source.
- Audit logs are visible to authorized roles.

## Rules

Do not add mobile app.
Do not add AI automation.
Do not skip audit logs.
Do not hardcode Council logic into KYDEX Core.
