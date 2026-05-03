# RUNBOOK_LOCAL_DEV

## Purpose
Standard local startup path for KYDEX with reproducible security and governance checks.

## Prerequisites
- Node.js 20+
- Docker Desktop
- npm 10+

## 1. Install Dependencies
```bash
npm install
```

## 2. Configure Environment
- Copy values from `11_ENV_EXAMPLE.env` into `.env.local` for local-only overrides.
- Keep `.env.production` out of source control and inject it from deployment secrets.
- `UPLOAD_DEBUG_LOGS` may only be enabled temporarily in local or staging troubleshooting.
- It must remain disabled in production unless explicitly approved for a short diagnostic window.
- Do not log full uploaded files, sensitive names, identity documents, or case evidence payloads.

## 3. Start Local Infrastructure
```bash
npm run infra:up
npm run infra:status
```

## 4. Database Setup
```bash
npm run prisma:generate
npm run prisma:migrate -- --name local_init
npm run prisma:seed
```

## 5. Start Services
```bash
npm run dev:api
npm run dev:web
```

## 6. Mandatory Verification
```bash
npm run preflight
npm run test:e2e -w @kydex/api
npm run smoke
```

## 7. Troubleshooting
- API down: restart `npm run dev:api`, then check API logs.
- DB errors: validate `DATABASE_URL`, rerun migrate, restore backup if needed.
- Redis errors: check `REDIS_PORT`, restart infra, rerun preflight.
- MinIO errors: validate bucket credentials and endpoint.
