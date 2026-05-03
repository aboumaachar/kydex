# KYDEX System Architecture

## 1. Architecture Principle

KYDEX must be:

- API-first.
- Web-first.
- Audit-first.
- Locale-aware.
- Connector-based.
- Multi-tenant.
- Security-aware.
- Council-ready but not Council-dependent.

## 2. High-Level Flow

```txt
External List / User Query
   ↓
KYDEX Web or API
   ↓
Auth + Authorization
   ↓
Locale-Aware Identity Resolution Engine
   ↓
Closest-Match Scoring + Uncertainty Classification
   ↓
Supporting Identifier Confirmation
   ↓
Case / Escalation Logic
   ↓
Audit Logs + Evidence Storage
```

## 3. System Layers

### A. Client Layer

- Council web platform.
- KYDEX SaaS dashboard.
- External API clients later.

### B. API Layer

- REST API.
- JWT for web users.
- API keys for external clients.
- Rate limiting.
- Request validation.

### C. Core Engine

- Original-name preservation.
- Arabic normalization.
- Latin normalization.
- Transliteration and alias variant generation.
- Query normalization and cross-script comparison.
- Closest-match scoring.
- Uncertainty classification.
- Supporting-identifier confirmation.
- Explanation generation.
- Result aggregation.

### D. Data Layer

- PostgreSQL for structured data.
- Redis for queues/cache.
- MinIO for documents, PDFs, uploaded lists.
- Dataset version storage.

### E. Audit Layer

- Immutable audit events.
- Query history.
- Decision history.
- Escalation trace.

## 4. Deployment Model

### MVP

```txt
Docker Compose
 ├─ web
 ├─ api
 ├─ postgres
 ├─ redis
 └─ minio
```

### Production Later

```txt
Load Balancer
 ├─ API containers
 ├─ Web containers
 ├─ Worker containers
 ├─ Managed PostgreSQL
 ├─ Redis
 ├─ Object storage
 └─ Monitoring / backups
```

## 5. Core Design Rules

```txt
Council Platform → KYDEX Core
KYDEX Core must never depend on Council-specific workflow.
```

This allows KYDEX to become SaaS later.

```txt
KYDEX does not translate names and assume identity.
KYDEX resolves identity probability across languages, then requires supporting identifiers before escalating confidence.
```

### Locale-Aware Identity Resolution Rule

KYDEX must not rely on direct literal name translation.

The engine must preserve the original imported name and generate searchable identity variants across scripts and spellings:

- original source name
- Arabic normalized name
- Latin normalized name
- transliteration variants
- aliases
- token overlap signals
- fuzzy similarity signals
- supporting identifiers

The governing principle is:

```txt
Names alone produce probability.
Identifiers produce confidence.
```

When a user searches in Arabic, the engine must normalize the query, derive a Latin approximation, compare it against Arabic and Latin variants, rank the closest candidates, then apply identifier boosts and penalties before returning a classification.
