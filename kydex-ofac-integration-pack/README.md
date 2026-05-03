# KYDEX Phase 6 — OFAC Integration + Notary Screening API

This pack implements the architecture:

OFAC official Sanctions List Service → KYDEX API sync/import → local KYDEX screening engine → notary webpages call KYDEX only.

## Main folders

```txt
apps/api/src/modules/ofac
apps/api/src/modules/screening
apps/api/src/modules/notaries
apps/api/src/modules/prisma
apps/web/src/components/kydex-screening
wordpress-plugin/kydex-screening-widget
prisma/ofac-screening-models.prisma
prisma/migrations/20260430_ofac_screening/migration.sql
```

## Required npm packages

```bash
cd C:\kydex

npm install -w @kydex/api fast-xml-parser
npm install -w @kydex/api @nestjs/schedule @nestjs/throttler
```

If your repo already has `@nestjs/schedule`, `@nestjs/throttler`, or Prisma helpers, keep the existing ones and only copy the module code.

## Environment variables

Add to your API `.env`:

```env
OFAC_BASE_URL=https://sanctionslistservice.ofac.treas.gov
OFAC_SYNC_TOKEN=change-this-admin-sync-token
OFAC_SYNC_FILES=SDN_ADVANCED.XML,CONS_ADVANCED.XML
OFAC_HTTP_TIMEOUT_MS=30000
NOTARY_WIDGET_ALLOWED_ORIGINS=http://localhost:3000,https://kydex.me
```

## Prisma

1. Merge `prisma/ofac-screening-models.prisma` into your real `schema.prisma`.
2. Run:

```bash
npx prisma migrate dev --name ofac_screening
npx prisma generate
```

If your repo does not use Prisma, use the included SQL migration directly.

## Register modules

In your API `app.module.ts`, import:

```ts
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { OfacModule } from './modules/ofac/ofac.module';
import { ScreeningModule } from './modules/screening/screening.module';
import { NotariesModule } from './modules/notaries/notaries.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    OfacModule,
    ScreeningModule,
    NotariesModule,
  ],
})
export class AppModule {}
```

## Test

```bash
curl http://localhost:4000/api/v1/ofac/health
curl http://localhost:4000/api/v1/ofac/lists
curl http://localhost:4000/api/v1/ofac/programs

curl -X POST http://localhost:4000/api/v1/ofac/sync ^
  -H "x-kydex-sync-token: change-this-admin-sync-token"

curl -X POST http://localhost:4000/api/v1/screening/search ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"KAVE COFFEE S.A.\",\"source\":\"dashboard\"}"

curl -X POST http://localhost:4000/api/v1/notaries/sandranassif/screening/search ^
  -H "Content-Type: application/json" ^
  -H "x-kydex-notary-key: dev_sandranassif_key" ^
  -d "{\"query\":\"KAVE COFFEE S.A.\",\"source\":\"notary_webpage\"}"
```
