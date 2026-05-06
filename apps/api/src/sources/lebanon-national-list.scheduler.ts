import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SourcesService } from './sources.service';

@Injectable()
export class LebanonNationalListScheduler {
  private readonly logger = new Logger(LebanonNationalListScheduler.name);

  constructor(
    private readonly sourcesService: SourcesService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private isEnabled() {
    return (process.env.LEBANON_NATIONAL_SYNC_ENABLED ?? 'true').toLowerCase() === 'true';
  }

  @Cron('30 2 * * *', { timeZone: 'Asia/Beirut' })
  async runDailySync() {
    if (!this.isEnabled()) return;

    try {
      const result = await this.sourcesService.syncLebanonNationalList();
      await this.auditLogs.log({
        tenantId: null,
        userId: null,
        action: 'LEBANON_SOURCE_SYNC_COMPLETED',
        entityType: 'SOURCE',
        entityId: 'LEBANON_NATIONAL_LIST',
        metadata: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scheduled Lebanon source sync failed: ${message}`);
      await this.auditLogs.log({
        tenantId: null,
        userId: null,
        action: 'LEBANON_SOURCE_SYNC_FAILED',
        entityType: 'SOURCE',
        entityId: 'LEBANON_NATIONAL_LIST',
        metadata: { error: message },
      });
    }
  }
}
