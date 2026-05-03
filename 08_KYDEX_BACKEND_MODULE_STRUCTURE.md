# KYDEX Backend Module Structure

## 1. Backend Stack

```txt
NestJS
TypeScript
Prisma
PostgreSQL
Redis
BullMQ
MinIO
JWT
```

## 2. Folder Structure

```txt
apps/api/src
├─ main.ts
├─ app.module.ts
├─ config
│  ├─ env.validation.ts
│  └─ configuration.ts
├─ common
│  ├─ guards
│  ├─ decorators
│  ├─ filters
│  ├─ interceptors
│  └─ utils
├─ auth
├─ users
├─ tenants
├─ api-keys
├─ data-sources
├─ ingestion
├─ watchlists
├─ screening
├─ matching
├─ scoring
├─ cases
├─ audit-logs
├─ files
├─ reports
├─ webhooks
└─ health
```

## 3. Module Responsibilities

### auth

- login
- refresh token
- password hashing
- role guards

### tenants

- tenant creation
- tenant status
- tenant isolation

### users

- users
- roles
- status
- password reset

### api-keys

- create API key
- hash key
- validate key
- scope control

### data-sources

- define OFAC/UN/local sources
- source status
- version history

### ingestion

- fetch lists
- parse files
- normalize
- deduplicate
- store versions

### watchlists

- store watchlist records
- search records
- manage aliases

### screening

- screen endpoint
- query logging
- result aggregation

### matching

- normalization
- fuzzy match
- Arabic name logic

### scoring

- risk score calculation
- risk classification
- explanation builder

### cases

- create cases
- assign reviewers
- case actions
- escalation status

### audit-logs

- immutable logs
- audit export

### files

- MinIO upload/download
- compliance PDFs
- SIC-ready packages

## 4. Worker Processes

Use BullMQ workers for:

- data ingestion
- bulk screening
- PDF generation
- package generation
- webhook delivery

## 5. Development Order

1. health
2. auth
3. tenants/users
4. data-sources
5. ingestion
6. matching/scoring
7. screening
8. audit-logs
9. cases
10. files/reports
