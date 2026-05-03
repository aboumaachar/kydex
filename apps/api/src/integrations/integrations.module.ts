import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BulkScreeningModule } from '../bulk-screening/bulk-screening.module';
import { DataSourcesModule } from '../data-sources/data-sources.module';
import { ScreeningModule } from '../screening/screening.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationApiKeyGuard } from './integration-api-key.guard';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [AuditLogsModule, BulkScreeningModule, DataSourcesModule, ScreeningModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationApiKeyGuard],
  exports: [IntegrationsService, IntegrationApiKeyGuard],
})
export class IntegrationsModule {}