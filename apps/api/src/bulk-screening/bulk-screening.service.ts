import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ScreenDto } from '../screening/dto/screen.dto';
import { ScreeningService } from '../screening/screening.service';
import { BulkJobData, BulkScreenDto } from './dto/bulk-screen.dto';

const BULK_QUEUE = 'bulk-screening';
const BULK_DEAD_LETTER_QUEUE = 'bulk-screening-dead-letter';

type BulkDeadLetterData = {
  originalJobId: string;
  tenantId: string;
  userId?: string;
  reason: string;
  attemptsMade: number;
  payload: BulkJobData;
  failedAt: string;
};

@Injectable()
export class BulkScreeningService implements OnModuleInit, OnModuleDestroy {
  private readonly queue: Queue<BulkJobData>;
  private readonly deadLetterQueue: Queue<BulkDeadLetterData>;
  private worker?: Worker<BulkJobData>;

  constructor(
    private readonly screeningService: ScreeningService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    const connection = {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    this.queue = new Queue<BulkJobData>(BULK_QUEUE, { connection });
    this.deadLetterQueue = new Queue<BulkDeadLetterData>(BULK_DEAD_LETTER_QUEUE, { connection });
  }

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    this.worker = new Worker<BulkJobData>(
      BULK_QUEUE,
      async (job: Job<BulkJobData>) => {
        const { tenantId, userId, records, sources } = job.data;
        const results: Array<{ index: number; result: unknown }> = [];

        for (let index = 0; index < records.length; index += 1) {
          const record = records[index];
          const dto: ScreenDto = {
            fullName: record.fullName,
            dateOfBirth: record.dateOfBirth,
            nationality: record.nationality,
            documentNumber: record.documentNumber,
            transactionType: record.transactionType,
            clientReference: record.clientReference,
            sources,
          };

          const result = await this.screeningService.screen(tenantId, userId, dto, 'bulk-job');
          results.push({ index, result });
          await job.updateProgress(Math.round(((index + 1) / records.length) * 100));
        }

        await this.auditLogsService.log({
          tenantId,
          userId,
          action: 'BULK_JOB_COMPLETED',
          entityType: 'BULK_JOB',
          entityId: String(job.id),
          metadata: {
            recordCount: records.length,
            sources,
          },
        });

        return {
          total: records.length,
          completedAt: new Date().toISOString(),
          results,
        };
      },
      {
        connection,
        concurrency: 3,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    );

    this.worker.on('failed', async (job, error) => {
      if (!job) {
        return;
      }

      const attemptsConfigured = job.opts.attempts ?? 1;
      const terminalFailure = job.attemptsMade >= attemptsConfigured;

      await this.auditLogsService.log({
        tenantId: job.data.tenantId,
        userId: job.data.userId,
        action: 'BULK_SCREENING_FAILED',
        entityType: 'BULK_JOB',
        entityId: String(job.id),
        metadata: {
          attemptsMade: job.attemptsMade,
          attemptsConfigured,
          terminalFailure,
          error: error.message,
        },
      });

      if (!terminalFailure) {
        return;
      }

      await this.deadLetterQueue.add(
        'bulk-screening-dead-letter',
        {
          originalJobId: String(job.id),
          tenantId: job.data.tenantId,
          userId: job.data.userId,
          reason: error.message,
          attemptsMade: job.attemptsMade,
          payload: job.data,
          failedAt: new Date().toISOString(),
        },
        {
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 1000 },
        },
      );

      await this.auditLogsService.log({
        tenantId: job.data.tenantId,
        userId: job.data.userId,
        action: 'BULK_SCREENING_DEAD_LETTERED',
        entityType: 'BULK_JOB',
        entityId: String(job.id),
        metadata: {
          attemptsMade: job.attemptsMade,
          reason: error.message,
          deadLetterQueue: BULK_DEAD_LETTER_QUEUE,
        },
      });
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    await this.queue.close();
    await this.deadLetterQueue.close();
  }

  async enqueue(tenantId: string, userId: string | undefined, dto: BulkScreenDto) {
    const job = await this.queue.add('bulk-screen', {
      tenantId,
      userId,
      records: dto.records,
      sources: dto.sources,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'BULK_JOB_QUEUED',
      entityType: 'BULK_JOB',
      entityId: String(job.id),
      metadata: {
        recordCount: dto.records.length,
        sources: dto.sources,
      },
    });

    return {
      bulkJobId: String(job.id),
      status: 'QUEUED',
    };
  }

  async getStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Bulk job not found');
    }

    const state = await job.getState();
    return {
      bulkJobId: jobId,
      status: state.toUpperCase(),
      progress: job.progress,
      failedReason: job.failedReason,
      result: job.returnvalue ?? null,
    };
  }
}
