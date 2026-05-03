import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScreeningModule } from './screening/screening.module';
import { MatchingModule } from './matching/matching.module';
import { ScoringModule } from './scoring/scoring.module';
import { CasesModule } from './cases/cases.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { DataSourcesModule } from './data-sources/data-sources.module';
import { UsersModule } from './users/users.module';
import { BulkScreeningModule } from './bulk-screening/bulk-screening.module';
import { DocumentExtractionModule } from './document-extraction/document-extraction.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotariesModule } from './notaries/notaries.module';
import { OfacModule } from './ofac/ofac.module';
import { OfacScreeningModule } from './ofac-screening/ofac-screening.module';
import { SourcesModule } from './sources/sources.module';
import { SourceLibraryModule } from './source-library/source-library.module';
import { NameNormalizationModule } from './name-normalization/name-normalization.module';
import { InquiriesModule } from './inquiries/inquiries.module';

loadEnv({ path: resolve(process.cwd(), '../../.env'), override: true });
loadEnv({ path: resolve(process.cwd(), '../../.env.development'), override: true });
loadEnv({ path: resolve(process.cwd(), '.env'), override: true });

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MatchingModule,
    ScoringModule,
    AuditLogsModule,
    CasesModule,
    DataSourcesModule,
    ScreeningModule,
    BulkScreeningModule,
    DocumentExtractionModule,
    IntegrationsModule,
    OfacModule,
    OfacScreeningModule,
    NotariesModule,
    SourcesModule,
    SourceLibraryModule,
    NameNormalizationModule,
    InquiriesModule,
  ],
})
export class AppModule {}
