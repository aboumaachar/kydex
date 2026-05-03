# KYDEX Build-Ready Assets Pack

## Purpose

This pack converts the KYDEX locked V3 strategy into execution-ready assets for a development team.

KYDEX is defined as:

> A compliance workflow system with audit-grade evidence, locale-aware identity resolution, and governed escalation.

## Included Assets

1. `01_KYDEX_MVP_SCOPE.md` — exact MVP boundaries.
2. `02_KYDEX_SYSTEM_ARCHITECTURE.md` — system layers and architecture.
3. `03_KYDEX_DATABASE_SCHEMA_PRISMA.md` — Prisma-ready schema design.
4. `04_KYDEX_API_SPEC.md` — endpoints, requests, responses.
5. `05_KYDEX_MATCHING_ENGINE_SPEC.md` — matching, scoring, Arabic name handling.
6. `06_KYDEX_ESCALATION_WORKFLOW.md` — escalation workflow and SIC-ready package logic.
7. `07_KYDEX_SECURITY_AND_AUDIT_SPEC.md` — security, logs, tenant isolation.
8. `08_KYDEX_BACKEND_MODULE_STRUCTURE.md` — NestJS module structure.
9. `09_KYDEX_FRONTEND_UI_FLOWS.md` — Next.js screens and flows.
10. `10_DOCKER_COMPOSE_STARTER.yml` — starter Docker Compose.
11. `11_ENV_EXAMPLE.env` — environment variable template.
12. `12_DEVELOPER_EXECUTION_PROMPT.md` — Claude/Codex-ready implementation prompt.

## Locked Technical Stack

```txt
Frontend: Next.js + TypeScript + Tailwind
Backend: NestJS + TypeScript
Database: PostgreSQL
ORM: Prisma
Queue/Cache: Redis + BullMQ
File Storage: MinIO
Deployment: Docker / Docker Compose
Auth: JWT + API Keys
```

## Locked Product Rule

No mobile application for the Council MVP.

The Council deployment is:

> Desktop-first, web-based, office workflow oriented.
