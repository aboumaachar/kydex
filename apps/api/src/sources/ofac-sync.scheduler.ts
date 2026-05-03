import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SourcesService } from './sources.service';

@Injectable()
export class OfacSyncScheduler {
  private readonly logger = new Logger(OfacSyncScheduler.name);

  constructor(
    private readonly sourcesService: SourcesService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private isEnabled() {
    return (process.env.OFAC_SYNC_SCHEDULER_ENABLED ?? 'true').toLowerCase() === 'true';
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runHealthCheck() {
    if (!this.isEnabled()) return;

    try {
      const result = await this.sourcesService.healthCheck('OFAC');
      if (result.status !== 'connected') {
        await this.auditLogs.log({
          tenantId: null,
          userId: null,
          action: 'OFAC_HEALTH_WARNING',
          entityType: 'SOURCE',
          entityId: 'OFAC',
          metadata: result,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scheduled OFAC health check failed: ${message}`);
      await this.auditLogs.log({
        tenantId: null,
        userId: null,
        action: 'OFAC_HEALTH_FAILURE',
        entityType: 'SOURCE',
        entityId: 'OFAC',
        metadata: { error: message },
      });
    }
  }

  @Cron('0 */6 * * *')
  async runChangesLatestCheck() {
    if (!this.isEnabled()) return;

    try {
      const result = await this.sourcesService.checkOfacChangesLatest();
      if (result.status !== 'ok') {
        await this.auditLogs.log({
          tenantId: null,
          userId: null,
          action: 'OFAC_CHANGES_WARNING',
          entityType: 'SOURCE',
          entityId: 'OFAC',
          metadata: result,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scheduled OFAC changes/latest check failed: ${message}`);
      await this.auditLogs.log({
        tenantId: null,
        userId: null,
        action: 'OFAC_CHANGES_FAILURE',
        entityType: 'SOURCE',
        entityId: 'OFAC',
        metadata: { error: message },
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyLocalRefresh() {
    if (!this.isEnabled()) return;

    try {
      const result = await this.sourcesService.refreshOfacLocalCopySafe();
      if (result.status !== 'completed') {
        await this.auditLogs.log({
          tenantId: null,
          userId: null,
          action: 'OFAC_DAILY_REFRESH_WARNING',
          entityType: 'SOURCE',
          entityId: 'OFAC',
          metadata: result,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scheduled OFAC daily local refresh failed: ${message}`);
      await this.auditLogs.log({
        tenantId: null,
        userId: null,
        action: 'OFAC_DAILY_REFRESH_FAILURE',
        entityType: 'SOURCE',
        entityId: 'OFAC',
        metadata: { error: message },
      });
    }
  }
}
