import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NameNormalizationModule } from '../name-normalization/name-normalization.module';
import { OfacSyncScheduler } from './ofac-sync.scheduler';
import { LebanonNationalListScheduler } from './lebanon-national-list.scheduler';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
  imports: [PrismaModule, NameNormalizationModule, AuditLogsModule],
  controllers: [SourcesController],
  providers: [SourcesService, OfacSyncScheduler, LebanonNationalListScheduler],
  exports: [SourcesService],
})
export class SourcesModule {}
