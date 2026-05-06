import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSourceType, Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataSourceDto } from './dto/create-data-source.dto';

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  path?: string;
  size?: number;
};

type ParsedRow = {
  rowNumber: number;
  data: Record<string, unknown>;
};

type RejectedRow = {
  rowNumber: number;
  reason: string;
  row: Record<string, unknown>;
};

type ValidationError = {
  rowNumber: number;
  field: string;
  message: string;
};

type OfficialSourceSyncResult = {
  source: string;
  sourceUrl: string;
  fetchTimestamp: string;
  fileHash: string;
  parserResult: {
    parsedRows: number;
    parser: string;
    warnings: string[];
  };
  ingestionResult: {
    ingestionRunReportId: string;
    versionId: string;
    insertedRecords: number;
    rejectedRows: number;
    duplicateRows: number;
  };
  rawArtifactPath: string;
  errors: string[];
};

type SyncAuditEvent = {
  id: string;
  action: string;
  createdAt: Date;
  userId: string | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  metadata?: Prisma.JsonValue;
};

type DataSourceWithSyncRelations = Prisma.DataSourceGetPayload<{
  include: {
    versions: true;
    ingestionReports: true;
  };
}>;

type RecordQueryFilters = {
  q?: string;
  alias?: string;
  nationality?: string;
  entityType?: string;
  documentNumber?: string;
  program?: string;
  versionId?: string;
  page?: number;
  limit?: number;
  sort?: string;
  createdFrom?: string;
  createdTo?: string;
};

const CANONICAL_SOURCE_CODES = new Set(['OFAC_SDN', 'OFAC_CONSOLIDATED', 'UNSEC_CONSOLIDATED', 'LOCAL_MANUAL', 'LEBANON_NATIONAL_LIST']);
const LEGACY_SOURCE_ALIASES: Record<string, string> = {
  OFAC: 'OFAC_SDN',
  UNSEC: 'UNSEC_CONSOLIDATED',
  UN: 'UNSEC_CONSOLIDATED',
  LEBANON: 'LEBANON_NATIONAL_LIST',
  LEBANON_NATIONAL: 'LEBANON_NATIONAL_LIST',
};
const SOURCE_STALE_DAYS = Number(process.env.SOURCE_STALE_DAYS ?? 14);

@Injectable()
export class DataSourcesService {
  private readonly logger = new Logger(DataSourcesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly matchingService: MatchingService = new MatchingService(),
  ) {}

  async list() {
    const sources = await this.prisma.dataSource.findMany({
      where: {
        code: {
          in: [...CANONICAL_SOURCE_CODES],
        },
      },
      include: {
        versions: {
          orderBy: [{ status: 'asc' }, { importedAt: 'desc' }],
        },
        ingestionReports: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sourceCodes = sources.map((source) => source.code);
    const syncAuditEvents = sourceCodes.length > 0
      ? await this.prisma.auditLog.findMany({
          where: {
            entityType: 'DATA_SOURCE',
            entityId: {
              in: sourceCodes,
            },
            action: {
              in: ['SOURCE_SYNC_STARTED', 'SOURCE_SYNC_COMPLETED', 'SOURCE_SYNC_FAILED'],
            },
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
      : [];

    const eventsBySource = syncAuditEvents.reduce<Record<string, SyncAuditEvent[]>>((accumulator, event) => {
      const sourceCode = event.entityId ?? '';
      if (!accumulator[sourceCode]) {
        accumulator[sourceCode] = [];
      }
      accumulator[sourceCode].push(event as SyncAuditEvent);
      return accumulator;
    }, {});

    return sources.map((source) => this.buildDataSourceSummary(source, eventsBySource[source.code] ?? []));
  }

  async syncOfficialSources(
    sources: string[] | undefined,
    tenantId: string | undefined,
    importedBy?: string,
  ) {
    const targetSources = (sources && sources.length > 0 ? sources : ['ALL'])
      .flatMap((entry) => this.expandOfficialSourceSelection(entry))
      .filter(Boolean);

    const uniqueSources = [...new Set(targetSources)];
    const results: OfficialSourceSyncResult[] = [];

    for (const source of uniqueSources) {
      await this.auditLogsService.log({
        tenantId,
        userId: importedBy,
        action: 'SOURCE_SYNC_STARTED',
        entityType: 'DATA_SOURCE',
        entityId: source,
        metadata: {
          source,
        },
      });

      try {
        let result: OfficialSourceSyncResult;

        if (source === 'OFAC_SDN') {
          result = await this.syncOfacSdn(tenantId, importedBy);
        } else if (source === 'OFAC_CONSOLIDATED') {
          result = await this.syncOfacConsolidated(tenantId, importedBy);
        } else if (source === 'UNSEC_CONSOLIDATED') {
          result = await this.syncUnsecConsolidated(tenantId, importedBy);
        } else {
          throw new BadRequestException(`Unsupported source: ${source}`);
        }

        results.push(result);

        await this.auditLogsService.log({
          tenantId,
          userId: importedBy,
          action: 'SOURCE_SYNC_COMPLETED',
          entityType: 'DATA_SOURCE',
          entityId: source,
          metadata: {
            source,
            sourceUrl: result.sourceUrl,
            versionId: result.ingestionResult.versionId,
            ingestionRunReportId: result.ingestionResult.ingestionRunReportId,
            insertedRecords: result.ingestionResult.insertedRecords,
            fileHash: result.fileHash,
            rawArtifactPath: result.rawArtifactPath,
          },
        });
      } catch (error) {
        await this.auditLogsService.log({
          tenantId,
          userId: importedBy,
          action: 'SOURCE_SYNC_FAILED',
          entityType: 'DATA_SOURCE',
          entityId: source,
          metadata: {
            source,
            error: error instanceof Error ? error.message : 'unknown error',
          },
        });
        throw error;
      }
    }

    return {
      synchronized: results.length,
      results,
    };
  }

  private expandOfficialSourceSelection(source: string) {
    const normalized = source.trim().toUpperCase();

    if (!normalized || normalized === 'ALL' || normalized === '*' || normalized === 'OFFICIAL') {
      return ['OFAC_SDN', 'OFAC_CONSOLIDATED', 'UNSEC_CONSOLIDATED'];
    }

    if (normalized === 'OFAC') {
      return ['OFAC_SDN', 'OFAC_CONSOLIDATED'];
    }

    if (normalized === 'OFAC_SDN') {
      return ['OFAC_SDN'];
    }

    if (normalized === 'OFAC_CONSOLIDATED' || normalized === 'OFAC_NON_SDN') {
      return ['OFAC_CONSOLIDATED'];
    }

    if (normalized === 'UNSEC' || normalized === 'UN' || normalized === 'UNSEC_CONSOLIDATED') {
      return ['UNSEC_CONSOLIDATED'];
    }

    return [normalized];
  }

  create(dto: CreateDataSourceDto) {
    return this.prisma.dataSource.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        country: dto.country,
      },
    });
  }

  async ingestUpload(
    dto: CreateDataSourceDto,
    file: UploadedFile | undefined,
    tenantId: string | undefined,
    importedBy?: string,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const uploadBuffer = this.getUploadBuffer(file);
    const rows = this.parseRows({ ...file, buffer: uploadBuffer });
    if (process.env.UPLOAD_DEBUG_LOGS === 'true') {
      this.logger.log(
        JSON.stringify({
          event: 'upload_parsed',
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size ?? uploadBuffer.length,
          preview: uploadBuffer.toString('utf-8', 0, 200),
          parsedRowCount: rows.length,
        }),
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException('uploaded file contains no records');
    }

    const totalRows = rows.length;
    const rejectedReport: RejectedRow[] = [];
    const validationErrors: ValidationError[] = [];
    let duplicateRows = 0;

    const dataSource = await this.prisma.dataSource.upsert({
      where: { code: dto.code },
      update: {
        name: dto.name,
        type: dto.type,
        country: dto.country,
      },
      create: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        country: dto.country,
      },
    });

    const candidateRows = rows
      .map((parsed) => {
        const primaryName = this.getFirstString(
          parsed.data.primaryName,
          parsed.data.name,
          parsed.data.fullName,
        );

        if (!primaryName) {
          validationErrors.push({
            rowNumber: parsed.rowNumber,
            field: 'primaryName',
            message: 'primaryName/name/fullName is required',
          });
          rejectedReport.push({
            rowNumber: parsed.rowNumber,
            reason: 'missing_required_primary_name',
            row: parsed.data,
          });
          return null;
        }

        const aliases = this.toArray(parsed.data.aliases ?? parsed.data.alias ?? parsed.data.otherNames);
        const documentNumbers = this.toArray(
          parsed.data.documentNumbers ??
            parsed.data.documentNumber ??
            parsed.data.passport ??
            parsed.data.idNumber,
        );
        const normalizedName = this.normalizeName(primaryName);
        const arabicNormalizedName = this.matchingService.containsArabicScript(primaryName)
          ? this.matchingService.normalizeArabicName(primaryName)
          : null;
        const latinTransliteratedName = this.matchingService.toLatinSearchKey(primaryName);
        const normalizedAliases = aliases
          .map((alias) => this.normalizeName(alias))
          .filter((alias) => alias.length > 0);
        const arabicNormalizedAliases = aliases
          .filter((alias) => this.matchingService.containsArabicScript(alias))
          .map((alias) => this.matchingService.normalizeArabicName(alias))
          .filter((alias) => alias.length > 0);
        const dateOfBirth = this.toOptionalString(parsed.data.dateOfBirth);
        const nationality = this.toOptionalString(parsed.data.nationality);
        const country = this.toOptionalString(parsed.data.country);
        const entityType =
          this.toOptionalString(parsed.data.entityType)?.toUpperCase() ?? 'PERSON';

        return {
          rowNumber: parsed.rowNumber,
          raw: parsed.data,
          record: {
            externalReference: this.toOptionalString(
              parsed.data.externalReference ?? parsed.data.id ?? parsed.data.reference,
            ),
            entityType,
            primaryName,
            normalizedName,
            arabicNormalizedName,
            latinTransliteratedName,
            aliases,
            normalizedAliases,
            arabicNormalizedAliases,
            dateOfBirth,
            nationality,
            country,
            documentNumbers,
            rawPayload: structuredClone(parsed.data) as Prisma.InputJsonValue,
          },
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const seenInFile = new Set<string>();
    const insertableRows: typeof candidateRows = [];

    candidateRows.forEach((entry) => {
      const duplicateKey = this.computeDuplicateKey(entry.record);
      if (seenInFile.has(duplicateKey)) {
        duplicateRows += 1;
        rejectedReport.push({
          rowNumber: entry.rowNumber,
          reason: 'duplicate_in_uploaded_file',
          row: entry.raw,
        });
        return;
      }

      seenInFile.add(duplicateKey);
      insertableRows.push(entry);
    });

    const insertedRecords = insertableRows.length;
    const rejectedRows = totalRows - insertedRecords;

    const fileHash = createHash('sha256').update(uploadBuffer).digest('hex');
    const hasActiveVersion = await this.prisma.dataSourceVersion.count({
      where: {
        dataSourceId: dataSource.id,
        status: 'ACTIVE',
      },
    });

    const version = await this.prisma.dataSourceVersion.create({
      data: {
        dataSourceId: dataSource.id,
        versionLabel: dto.versionLabel ?? `${dto.code}-${new Date().toISOString().slice(0, 10)}`,
        fileHash,
        importedBy,
        recordCount: insertedRecords,
        status: hasActiveVersion === 0 ? 'ACTIVE' : 'IMPORTED',
      },
    });

    if (insertableRows.length > 0) {
      await this.prisma.watchlistRecord.createMany({
        data: insertableRows.map((entry) => ({
          dataSourceId: dataSource.id,
          versionId: version.id,
          ...entry.record,
        })),
        skipDuplicates: false,
      });
    }

    const report = await this.prisma.ingestionRunReport.create({
      data: {
        tenantId,
        dataSourceId: dataSource.id,
        versionId: version.id,
        sourceCode: dataSource.code,
        totalRows,
        insertedRecords,
        rejectedRows,
        duplicateRows,
        validationErrors: structuredClone(validationErrors) as Prisma.InputJsonValue,
        rejectedReport: structuredClone(rejectedReport) as Prisma.InputJsonValue,
        createdBy: importedBy,
      },
    });

    await this.auditLogsService.log({
      tenantId,
      userId: importedBy,
      action: 'UPLOAD_INGESTION',
      entityType: 'DATA_SOURCE_VERSION',
      entityId: version.id,
      metadata: {
        sourceCode: dataSource.code,
        totalRows,
        insertedRecords,
        rejectedRows,
        duplicateRows,
        ingestionRunReportId: report.id,
      },
    });

    return {
      ingestionRunReportId: report.id,
      versionId: version.id,
      sourceCode: dataSource.code,
      totalRows,
      insertedRecords,
      rejectedRows,
      duplicateRows,
      validationErrors,
      rejectedReport,
    };
  }

  async versions(sourceCode: string) {
    const source = await this.requireSourceByCode(sourceCode);

    return this.prisma.dataSourceVersion.findMany({
      where: { dataSourceId: source.id },
      orderBy: [{ status: 'asc' }, { importedAt: 'desc' }],
    });
  }

  async ingestionRuns(sourceCode: string) {
    const source = await this.requireSourceByCode(sourceCode);

    return this.prisma.ingestionRunReport.findMany({
      where: { dataSourceId: source.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async syncHistory(sourceCode: string) {
    const source = await this.requireSourceByCode(sourceCode);
    const [runs, auditEvents] = await Promise.all([
      this.prisma.ingestionRunReport.findMany({
        where: { dataSourceId: source.id },
        include: {
          version: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: {
          entityType: 'DATA_SOURCE',
          entityId: source.code,
          action: {
            in: ['SOURCE_SYNC_STARTED', 'SOURCE_SYNC_COMPLETED', 'SOURCE_SYNC_FAILED'],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const completedEvents = auditEvents
      .filter((event) => event.action === 'SOURCE_SYNC_COMPLETED')
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()) as SyncAuditEvent[];
    const startedEvents = auditEvents
      .filter((event) => event.action === 'SOURCE_SYNC_STARTED')
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()) as SyncAuditEvent[];
    const failedEvents = auditEvents
      .filter((event) => event.action === 'SOURCE_SYNC_FAILED')
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()) as SyncAuditEvent[];

    const history = runs.map((run) => {
      const completedEvent = completedEvents.find((event) => this.extractMetadataString(event.metadata, 'versionId') === run.versionId);
      const startedEvent = completedEvent
        ? this.findLatestStartedBefore(startedEvents, completedEvent.createdAt)
        : this.findLatestStartedBefore(startedEvents, run.createdAt);

      return {
        runId: run.id,
        source: source.code,
        startedAt: startedEvent?.createdAt ?? run.createdAt,
        completedAt: completedEvent?.createdAt ?? run.createdAt,
        status: 'COMPLETED',
        parsedRows: run.totalRows,
        insertedRecords: run.insertedRecords,
        rejectedRows: run.rejectedRows,
        fileHash: run.version.fileHash,
        triggeredBy: completedEvent?.user?.fullName ?? completedEvent?.user?.email ?? run.createdBy ?? null,
        syncDurationMs:
          startedEvent && completedEvent
            ? Math.max(completedEvent.createdAt.getTime() - startedEvent.createdAt.getTime(), 0)
            : null,
        versionId: run.versionId,
        versionLabel: run.version.versionLabel,
        reportPath: `/admin/data-sources/${source.code}/versions/${run.versionId}/report`,
        metadataPath: `/api/v1/data-sources/${source.code}/versions/${run.versionId}/report`,
        retrySourceCode: source.code,
      };
    });

    const failedOnlyRows = failedEvents
      .filter((failedEvent) => !history.some((row) => row.completedAt.getTime() === failedEvent.createdAt.getTime()))
      .map((failedEvent) => {
        const startedEvent = this.findLatestStartedBefore(startedEvents, failedEvent.createdAt);

        return {
          runId: failedEvent.id,
          source: source.code,
          startedAt: startedEvent?.createdAt ?? failedEvent.createdAt,
          completedAt: failedEvent.createdAt,
          status: 'FAILED',
          parsedRows: 0,
          insertedRecords: 0,
          rejectedRows: 0,
          fileHash: this.extractMetadataString(failedEvent.metadata, 'fileHash'),
          triggeredBy: failedEvent.user?.fullName ?? failedEvent.user?.email ?? null,
          syncDurationMs:
            startedEvent ? Math.max(failedEvent.createdAt.getTime() - startedEvent.createdAt.getTime(), 0) : null,
          versionId: this.extractMetadataString(failedEvent.metadata, 'versionId'),
          versionLabel: null,
          reportPath: null,
          metadataPath: null,
          retrySourceCode: source.code,
          error: this.extractMetadataString(failedEvent.metadata, 'error'),
        };
      });

    return [...history, ...failedOnlyRows].sort(
      (left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime(),
    );
  }

  async report(sourceCode: string, versionId: string) {
    const source = await this.requireSourceByCode(sourceCode);

    const version = await this.prisma.dataSourceVersion.findFirst({
      where: {
        id: versionId,
        dataSourceId: source.id,
      },
    });

    if (!version) {
      throw new BadRequestException(`Unknown version: ${versionId}`);
    }

    const ingestionRun = await this.prisma.ingestionRunReport.findFirst({
      where: {
        dataSourceId: source.id,
        versionId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      source: {
        id: source.id,
        code: source.code,
        name: source.name,
      },
      version,
      ingestionRun,
    };
  }

  private buildDataSourceSummary(
    source: DataSourceWithSyncRelations,
    auditEvents: SyncAuditEvent[],
  ) {
    const activeVersion = source.versions.find((version) => version.status === 'ACTIVE') ?? null;
    const latestVersion = source.versions[0] ?? null;
    const latestRun = source.ingestionReports[0] ?? null;
    const completedEvent = auditEvents.find((event) => event.action === 'SOURCE_SYNC_COMPLETED') ?? null;
    const failedEvent = auditEvents.find((event) => event.action === 'SOURCE_SYNC_FAILED') ?? null;
    const lastStarted = auditEvents.find((event) => event.action === 'SOURCE_SYNC_STARTED') ?? null;
    const lastStartedBeforeCompletion = completedEvent
      ? this.findLatestStartedBefore(auditEvents, completedEvent.createdAt)
      : null;
    const referenceSyncTime = completedEvent?.createdAt ?? activeVersion?.importedAt ?? latestVersion?.importedAt ?? null;
    const stale = referenceSyncTime ? this.isStale(referenceSyncTime) : true;
    const syncHealth = this.deriveSyncHealth(source.status, !!activeVersion, stale, completedEvent, failedEvent);

    return {
      id: source.id,
      code: source.code,
      name: source.name,
      type: source.type,
      country: source.country,
      status: source.status,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      versions: source.versions,
      currentActiveVersion: activeVersion
        ? {
            id: activeVersion.id,
            versionLabel: activeVersion.versionLabel,
            importedAt: activeVersion.importedAt,
            importedBy: activeVersion.importedBy,
            recordCount: activeVersion.recordCount,
            status: activeVersion.status,
            fileHash: activeVersion.fileHash,
          }
        : null,
      latestIngestionRun: latestRun
        ? {
            id: latestRun.id,
            createdAt: latestRun.createdAt,
            totalRows: latestRun.totalRows,
            insertedRecords: latestRun.insertedRecords,
            rejectedRows: latestRun.rejectedRows,
            duplicateRows: latestRun.duplicateRows,
            createdBy: latestRun.createdBy,
            versionId: latestRun.versionId,
          }
        : null,
      syncStatus: {
        lastFullSyncAt: completedEvent?.createdAt ?? failedEvent?.createdAt ?? lastStarted?.createdAt ?? null,
        lastSuccessfulSyncAt: completedEvent?.createdAt ?? null,
        lastFailedSyncAt: failedEvent?.createdAt ?? null,
        currentActiveVersion: activeVersion?.versionLabel ?? null,
        recordCount: activeVersion?.recordCount ?? 0,
        fileHash: activeVersion?.fileHash ?? latestVersion?.fileHash ?? null,
        syncHealth,
        lastSyncActor:
          completedEvent?.user?.fullName ?? completedEvent?.user?.email ?? failedEvent?.user?.fullName ?? failedEvent?.user?.email ?? null,
        lastSyncDurationMs:
          completedEvent && lastStartedBeforeCompletion
            ? Math.max(completedEvent.createdAt.getTime() - lastStartedBeforeCompletion.createdAt.getTime(), 0)
            : null,
        rejectedRows: latestRun?.rejectedRows ?? 0,
        stale,
        staleWarning: stale && referenceSyncTime
          ? `This source was last synchronized ${this.ageInDays(referenceSyncTime)} days ago. Please refresh before relying on results.`
          : null,
      },
      syncHistoryPath: `/admin/data-sources/${source.code}/sync-history`,
    };
  }

  private deriveSyncHealth(
    sourceStatus: string,
    hasActiveVersion: boolean,
    stale: boolean,
    completedEvent: SyncAuditEvent | null,
    failedEvent: SyncAuditEvent | null,
  ) {
    if (sourceStatus !== 'ACTIVE') {
      return 'DISABLED';
    }

    if (!hasActiveVersion) {
      return 'NEEDS_SYNC';
    }

    if (failedEvent && (!completedEvent || failedEvent.createdAt > completedEvent.createdAt)) {
      return 'ERROR';
    }

    if (stale) {
      return 'STALE';
    }

    return 'OK';
  }

  private extractMetadataString(metadata: Prisma.JsonValue | undefined, key: string) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private findLatestStartedBefore(events: SyncAuditEvent[], before: Date) {
    return events.find((event) => event.action === 'SOURCE_SYNC_STARTED' && event.createdAt <= before) ?? null;
  }

  private isStale(referenceDate: Date) {
    return this.ageInDays(referenceDate) >= SOURCE_STALE_DAYS;
  }

  private ageInDays(referenceDate: Date) {
    return Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  async activateVersion(sourceCode: string, versionId: string, tenantId?: string, userId?: string) {
    const source = await this.requireSourceByCode(sourceCode);

    const targetVersion = await this.prisma.dataSourceVersion.findFirst({
      where: {
        id: versionId,
        dataSourceId: source.id,
      },
    });

    if (!targetVersion) {
      throw new BadRequestException(`Unknown version: ${versionId}`);
    }

    if (targetVersion.status === 'FAILED') {
      throw new BadRequestException('FAILED version cannot be activated');
    }

    if (targetVersion.status === 'ARCHIVED') {
      throw new BadRequestException('ARCHIVED version cannot be activated');
    }

    await this.prisma.$transaction([
      this.prisma.dataSourceVersion.updateMany({
        where: {
          dataSourceId: source.id,
          status: 'ACTIVE',
          id: { not: versionId },
        },
        data: {
          status: 'SUPERSEDED',
        },
      }),
      this.prisma.dataSourceVersion.update({
        where: { id: versionId },
        data: {
          status: 'ACTIVE',
        },
      }),
    ]);

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'SOURCE_VERSION_ACTIVATED',
      entityType: 'DATA_SOURCE_VERSION',
      entityId: versionId,
      metadata: {
        sourceCode: source.code,
        versionId,
        fileHash: targetVersion.fileHash,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 'ACTIVE',
      sourceCode: source.code,
      versionId,
    };
  }

  async archiveVersion(sourceCode: string, versionId: string, tenantId?: string, userId?: string) {
    const source = await this.requireSourceByCode(sourceCode);

    const targetVersion = await this.prisma.dataSourceVersion.findFirst({
      where: {
        id: versionId,
        dataSourceId: source.id,
      },
    });

    if (!targetVersion) {
      throw new BadRequestException(`Unknown version: ${versionId}`);
    }

    let replacementVersionId: string | null = null;

    if (targetVersion.status === 'ACTIVE') {
      const replacement = await this.prisma.dataSourceVersion.findFirst({
        where: {
          dataSourceId: source.id,
          id: { not: versionId },
          status: { in: ['IMPORTED', 'SUPERSEDED', 'ACTIVE'] },
          recordCount: { gt: 0 },
        },
        orderBy: {
          importedAt: 'desc',
        },
      });

      if (!replacement) {
        throw new BadRequestException('Cannot archive the only active version without a replacement');
      }

      replacementVersionId = replacement.id;

      await this.prisma.$transaction([
        this.prisma.dataSourceVersion.update({
          where: { id: versionId },
          data: { status: 'ARCHIVED' },
        }),
        this.prisma.dataSourceVersion.update({
          where: { id: replacement.id },
          data: { status: 'ACTIVE' },
        }),
      ]);
    } else {
      await this.prisma.dataSourceVersion.update({
        where: { id: versionId },
        data: { status: 'ARCHIVED' },
      });
    }

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'SOURCE_VERSION_ARCHIVED',
      entityType: 'DATA_SOURCE_VERSION',
      entityId: versionId,
      metadata: {
        sourceCode: source.code,
        versionId,
        replacementVersionId,
        fileHash: targetVersion.fileHash,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 'ARCHIVED',
      sourceCode: source.code,
      versionId,
      replacementVersionId,
    };
  }

  async enableSource(sourceCode: string, tenantId?: string, userId?: string) {
    const source = await this.requireSourceByCode(sourceCode);

    await this.prisma.dataSource.update({
      where: { code: source.code },
      data: { status: 'ACTIVE' },
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'DATA_SOURCE_ENABLED',
      entityType: 'DATA_SOURCE',
      entityId: source.id,
      metadata: {
        sourceCode: source.code,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 'ACTIVE',
      sourceCode: source.code,
    };
  }

  async disableSource(sourceCode: string, tenantId?: string, userId?: string) {
    const source = await this.requireSourceByCode(sourceCode);

    await this.prisma.dataSource.update({
      where: { code: source.code },
      data: { status: 'DISABLED' },
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'DATA_SOURCE_DISABLED',
      entityType: 'DATA_SOURCE',
      entityId: source.id,
      metadata: {
        sourceCode: source.code,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 'DISABLED',
      sourceCode: source.code,
    };
  }

  async records(sourceCode: string, filters: RecordQueryFilters, tenantId?: string, userId?: string) {
    const source = await this.requireSourceByCode(sourceCode);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 50), 1), 100);
    const start = (page - 1) * limit;

    const where: Prisma.WatchlistRecordWhereInput = {
      dataSourceId: source.id,
    };

    if (filters.nationality) {
      where.nationality = { equals: filters.nationality.trim(), mode: 'insensitive' };
    }

    if (filters.entityType) {
      where.entityType = { equals: filters.entityType.trim().toUpperCase(), mode: 'insensitive' };
    }

    if (filters.documentNumber) {
      where.documentNumbers = { has: filters.documentNumber.trim() };
    }

    if (filters.versionId) {
      where.versionId = filters.versionId.trim();
    }

    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) {
        where.createdAt.gte = new Date(filters.createdFrom);
      }
      if (filters.createdTo) {
        where.createdAt.lte = new Date(filters.createdTo);
      }
    }

    if (filters.q?.trim()) {
      const normalizedQuery = this.normalizeName(filters.q);
      const arabicNormalizedQuery = this.matchingService.containsArabicScript(filters.q)
        ? this.matchingService.normalizeArabicName(filters.q)
        : null;
      const latinSearchKey = this.matchingService.toLatinSearchKey(filters.q);

      where.OR = [
        {
          primaryName: {
            contains: filters.q.trim(),
            mode: 'insensitive',
          },
        },
        {
          normalizedName: {
            contains: normalizedQuery,
          },
        },
        {
          latinTransliteratedName: {
            contains: latinSearchKey,
          },
        },
        ...(arabicNormalizedQuery
          ? [
              {
                arabicNormalizedName: {
                  contains: arabicNormalizedQuery,
                },
              },
            ]
          : []),
      ];
    }

    const searchedName = this.normalizeSearchValue(filters.q);
    const searchedLatinKey = this.normalizeLatinSearchValue(filters.q);
    const searchedAlias = this.normalizeSearchValue(filters.alias);
    const searchedAliasLatinKey = this.normalizeLatinSearchValue(filters.alias);
    const searchedProgram = this.normalizeSearchValue(filters.program);

    const include = {
      dataSource: {
        select: {
          code: true,
          name: true,
        },
      },
      version: {
        select: {
          id: true,
          versionLabel: true,
          status: true,
          fileHash: true,
          importedAt: true,
        },
      },
    } satisfies Prisma.WatchlistRecordInclude;

    if (!searchedAlias && !searchedProgram) {
      const [total, pagedRecords] = await this.prisma.$transaction([
        this.prisma.watchlistRecord.count({ where }),
        this.prisma.watchlistRecord.findMany({
          where,
          include,
          orderBy: this.resolveRecordSort(filters.sort),
          skip: start,
          take: limit,
        }),
      ]);

      await this.auditLogsService.log({
        tenantId,
        userId,
        action: this.hasSearchFilters(filters) ? 'DATA_SOURCE_RECORD_SEARCHED' : 'DATA_SOURCE_RECORDS_VIEWED',
        entityType: 'DATA_SOURCE',
        entityId: source.id,
        metadata: {
          sourceCode: source.code,
          filters,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        sourceCode: source.code,
        versionId: filters.versionId ?? null,
        total,
        page,
        limit,
        records: pagedRecords.map((record) => this.toRecordSummary(record)),
      };
    }

    const baseRecords = await this.prisma.watchlistRecord.findMany({
      where,
      include,
      orderBy: this.resolveRecordSort(filters.sort),
    });

    const filteredRecords = baseRecords.filter((record) => {
      if (searchedName) {
        const haystacks = [
          record.primaryName,
          record.normalizedName,
          record.arabicNormalizedName,
          record.latinTransliteratedName,
        ]
          .map((value) => this.normalizeSearchValue(value))
          .filter((value): value is string => !!value);

        const latinHaystacks = [record.primaryName, record.normalizedName, record.latinTransliteratedName]
          .map((value) => this.normalizeLatinSearchValue(value))
          .filter((value): value is string => !!value);

        if (
          !haystacks.some((value) => value.includes(searchedName)) &&
          !(searchedLatinKey && latinHaystacks.some((value) => value.includes(searchedLatinKey)))
        ) {
          return false;
        }
      }

      if (searchedAlias) {
        const aliases = [
          ...(record.aliases ?? []),
          ...(record.normalizedAliases ?? []),
          ...(record.arabicNormalizedAliases ?? []),
        ]
          .map((value) => this.normalizeSearchValue(value))
          .filter((value): value is string => !!value);
        const latinAliases = [...(record.aliases ?? []), ...(record.normalizedAliases ?? [])]
          .map((value) => this.normalizeLatinSearchValue(value))
          .filter((value): value is string => !!value);

        if (
          !aliases.some((value) => value.includes(searchedAlias)) &&
          !(searchedAliasLatinKey && latinAliases.some((value) => value.includes(searchedAliasLatinKey)))
        ) {
          return false;
        }
      }

      if (searchedProgram) {
        const programText = this.normalizeSearchValue(this.extractProgramText(record.rawPayload));
        if (!programText || !programText.includes(searchedProgram)) {
          return false;
        }
      }

      return true;
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: this.hasSearchFilters(filters) ? 'DATA_SOURCE_RECORD_SEARCHED' : 'DATA_SOURCE_RECORDS_VIEWED',
      entityType: 'DATA_SOURCE',
      entityId: source.id,
      metadata: {
        sourceCode: source.code,
        filters,
        timestamp: new Date().toISOString(),
      },
    });

    const pagedRecords = filteredRecords.slice(start, start + limit).map((record) => this.toRecordSummary(record));

    return {
      sourceCode: source.code,
      versionId: filters.versionId ?? null,
      total: filteredRecords.length,
      page,
      limit,
      records: pagedRecords,
    };
  }

  async recordDetail(sourceCode: string, recordId: string, tenantId?: string, userId?: string) {
    const source = await this.requireSourceByCode(sourceCode);
    const record = await this.prisma.watchlistRecord.findFirst({
      where: {
        id: recordId,
        dataSourceId: source.id,
      },
      include: {
        dataSource: {
          select: {
            code: true,
            name: true,
          },
        },
        version: {
          select: {
            id: true,
            versionLabel: true,
            status: true,
            fileHash: true,
            importedAt: true,
          },
        },
      },
    });

    if (!record) {
      throw new BadRequestException(`Unknown record: ${recordId}`);
    }

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'DATA_SOURCE_RECORD_DETAIL_VIEWED',
      entityType: 'WATCHLIST_RECORD',
      entityId: record.id,
      metadata: {
        sourceCode: source.code,
        recordId: record.id,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      id: record.id,
      primaryName: record.primaryName,
      normalizedName: record.normalizedName,
      arabicNormalizedName: record.arabicNormalizedName,
      latinTransliteratedName: record.latinTransliteratedName,
      aliases: record.aliases,
      normalizedAliases: record.normalizedAliases,
      arabicNormalizedAliases: record.arabicNormalizedAliases,
      dateOfBirth: record.dateOfBirth,
      nationality: record.nationality,
      country: record.country,
      documentNumbers: record.documentNumbers,
      sourceCode: record.dataSource.code,
      sourceName: record.dataSource.name,
      versionId: record.version.id,
      versionLabel: record.version.versionLabel,
      versionStatus: record.version.status,
      versionFileHash: record.version.fileHash,
      importedAt: record.version.importedAt,
      externalReference: record.externalReference,
      entityType: record.entityType,
      programOrListType: this.extractProgramText(record.rawPayload),
      rawPayload: record.rawPayload,
      createdAt: record.createdAt,
    };
  }

  private toRecordSummary(record: {
    id: string;
    primaryName: string;
    entityType: string;
    nationality: string | null;
    dateOfBirth: string | null;
    documentNumbers: string[];
    rawPayload: Prisma.JsonValue;
    externalReference: string | null;
    versionId: string;
    createdAt: Date;
    dataSource: { code: string };
    version: { status: string; versionLabel: string };
  }) {
    return {
      id: record.id,
      primaryName: record.primaryName,
      source: record.dataSource.code,
      entityType: record.entityType,
      nationality: record.nationality,
      dateOfBirth: record.dateOfBirth,
      documentNumber: record.documentNumbers[0] ?? null,
      programOrListType: this.extractProgramText(record.rawPayload),
      externalReference: record.externalReference,
      activeVersion: record.version.status === 'ACTIVE' ? record.version.versionLabel : null,
      versionId: record.versionId,
      createdAt: record.createdAt,
    };
  }

  private parseRows(file: UploadedFile): ParsedRow[] {
    const raw = file.buffer.toString('utf-8').replace(/^\uFEFF/, '').trim();
    if (!raw) {
      return [];
    }

    if (file.mimetype.includes('json') || file.originalname.toLowerCase().endsWith('.json')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        throw new BadRequestException('invalid JSON upload');
      }

      if (Array.isArray(parsed)) {
        return parsed
          .filter((entry) => typeof entry === 'object' && entry !== null)
          .map((entry, index) => ({ rowNumber: index + 1, data: entry as Record<string, unknown> }));
      }

      if (typeof parsed === 'object' && parsed !== null) {
        return [{ rowNumber: 1, data: parsed as Record<string, unknown> }];
      }

      return [];
    }

    const lines = raw.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
    if (lines.length <= 1) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]).map((header: string) => header.trim());
    return lines.slice(1).map((line: string, index: number) => {
      const cols = this.parseCsvLine(line);
      const row: Record<string, unknown> = {};
      headers.forEach((header: string, index: number) => {
        row[header] = (cols[index] ?? '').trim();
      });
      return {
        rowNumber: index + 2,
        data: row,
      };
    });
  }

  private getUploadBuffer(file: UploadedFile): Buffer {
    if (file.buffer && file.buffer.length > 0) {
      return file.buffer;
    }

    if (file.path) {
      return readFileSync(file.path);
    }

    return Buffer.alloc(0);
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = i < line.length - 1 ? line[i + 1] : '';

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current);
    return values;
  }

  private normalizeName(value: string): string {
    return this.matchingService.normalizeName(value);
  }

  private toArray(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => this.toOptionalString(entry))
        .filter((entry): entry is string => !!entry);
    }

    const scalar = this.toOptionalString(value);
    if (!scalar) {
      return [];
    }

    return scalar
      .split(/[|;,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private toOptionalString(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean' &&
      typeof value !== 'bigint'
    ) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private getFirstString(...values: unknown[]): string | null {
    for (const value of values) {
      const normalized = this.toOptionalString(value);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private computeDuplicateKey(input: {
    normalizedName: string;
    dateOfBirth: string | null;
    nationality: string | null;
    documentNumbers: string[];
    externalReference?: string | null;
  }) {
    const docs = [...input.documentNumbers].sort((a, b) => a.localeCompare(b)).join('|');
    return [
      input.normalizedName,
      input.dateOfBirth ?? '',
      input.nationality ?? '',
      docs,
      input.externalReference ?? '',
    ].join('#');
  }

  private async syncOfacSdn(tenantId: string | undefined, importedBy?: string): Promise<OfficialSourceSyncResult> {
    const urls = [
      'https://www.treasury.gov/ofac/downloads/sdn.csv',
      'https://ofac.treasury.gov/sdn-list-data-formats-data-schemas/frequently-asked-questions-on-advanced-sanctions-list-standard',
    ];

    const fetched = await this.fetchFromOfficialUrls(urls);
    const fetchTimestamp = new Date().toISOString();
    const fileHash = createHash('sha256').update(fetched.buffer).digest('hex');
    const rawArtifactPath = this.storeRawArtifact('OFAC', fetched.extension, fetched.buffer, fetchTimestamp);
    const normalizedOfacBuffer = this.normalizeOfacSdnCsvForIngestion(fetched.buffer);

    const ingestion = await this.ingestUpload(
      {
        code: 'OFAC_SDN',
        name: 'OFAC SDN List',
        type: DataSourceType.OFAC,
        country: 'US',
        versionLabel: `OFAC-SDN-${fetchTimestamp.slice(0, 10)}`,
      },
      {
        buffer: normalizedOfacBuffer,
        mimetype: 'text/csv',
        originalname: `ofac-sdn-${fetchTimestamp.slice(0, 10)}.csv`,
        size: normalizedOfacBuffer.length,
      },
      tenantId,
      importedBy,
    );

    return {
      source: 'OFAC_SDN',
      sourceUrl: fetched.url,
      fetchTimestamp,
      fileHash,
      parserResult: {
        parsedRows: ingestion.totalRows,
        parser: 'csv-native',
        warnings: [],
      },
      ingestionResult: {
        ingestionRunReportId: ingestion.ingestionRunReportId,
        versionId: ingestion.versionId,
        insertedRecords: ingestion.insertedRecords,
        rejectedRows: ingestion.rejectedRows,
        duplicateRows: ingestion.duplicateRows,
      },
      rawArtifactPath,
      errors: [],
    };
  }

  private normalizeOfacSdnCsvForIngestion(buffer: Buffer) {
    const raw = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    const normalizedLines = ['name,nationality,aliases,externalReference'];

    lines.forEach((line, index) => {
      const columns = this.parseCsvLine(line);
      if (columns.length < 2) {
        return;
      }

      const name = this.toOptionalString(columns[1]);
      if (!name || name === '-0-') {
        return;
      }

      const nationalityRaw = this.toOptionalString(columns[3]);
      const aliasRaw = this.toOptionalString(columns[11]);
      const alias = aliasRaw && aliasRaw !== '-0-' ? aliasRaw : '';
      const nationality = nationalityRaw && nationalityRaw !== '-0-' ? nationalityRaw : '';
      const externalReference = this.toOptionalString(columns[0]) ?? `OFAC-${index + 1}`;

      normalizedLines.push(
        [name, nationality, alias, externalReference].map((entry) => this.escapeCsvValue(entry)).join(','),
      );
    });

    return Buffer.from(normalizedLines.join('\n'), 'utf-8');
  }

  private async syncOfacConsolidated(
    tenantId: string | undefined,
    importedBy?: string,
  ): Promise<OfficialSourceSyncResult> {
    const urls = [
      'https://www.treasury.gov/ofac/downloads/consolidated/consolidated.xml',
      'https://www.treasury.gov/ofac/downloads/consolidated/CONSOLIDATED.XML',
    ];

    const fetched = await this.fetchFromOfficialUrls(urls);
    const fetchTimestamp = new Date().toISOString();
    const fileHash = createHash('sha256').update(fetched.buffer).digest('hex');
    const rawArtifactPath = this.storeRawArtifact('OFAC_CONSOLIDATED', fetched.extension, fetched.buffer, fetchTimestamp);
    const xml = fetched.buffer.toString('utf-8');
    const rows = this.parseOfacConsolidatedXmlToCsvRows(xml);

    if (rows.length === 0) {
      throw new BadRequestException('OFAC consolidated parser returned no records');
    }

    const csv = this.rowsToCsv(rows, [
      'primaryName',
      'entityType',
      'aliases',
      'externalReference',
      'program',
      'title',
      'remarks',
      'sourceReference',
      'dateOfBirth',
      'nationality',
      'documentNumber',
      'listType',
      'referenceNumber',
      'rawPayload',
    ]);

    const ingestion = await this.ingestUpload(
      {
        code: 'OFAC_CONSOLIDATED',
        name: 'OFAC Consolidated / non-SDN',
        type: DataSourceType.OFAC,
        country: 'US',
        versionLabel: `OFAC-CONSOLIDATED-${fetchTimestamp.slice(0, 10)}`,
      },
      {
        buffer: Buffer.from(csv, 'utf-8'),
        mimetype: 'text/csv',
        originalname: `ofac-consolidated-${fetchTimestamp.slice(0, 10)}.xml.csv`,
        size: Buffer.byteLength(csv),
      },
      tenantId,
      importedBy,
    );

    return {
      source: 'OFAC_CONSOLIDATED',
      sourceUrl: fetched.url,
      fetchTimestamp,
      fileHash,
      parserResult: {
        parsedRows: rows.length,
        parser: 'xml-regex-mvp',
        warnings: [],
      },
      ingestionResult: {
        ingestionRunReportId: ingestion.ingestionRunReportId,
        versionId: ingestion.versionId,
        insertedRecords: ingestion.insertedRecords,
        rejectedRows: ingestion.rejectedRows,
        duplicateRows: ingestion.duplicateRows,
      },
      rawArtifactPath,
      errors: [],
    };
  }

  private escapeCsvValue(value: string) {
    const escaped = value.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  private async syncUnsecConsolidated(
    tenantId: string | undefined,
    importedBy?: string,
  ): Promise<OfficialSourceSyncResult> {
    const urls = [
      'https://scsanctions.un.org/resources/xml/en/consolidated.xml',
      'https://www.un.org/securitycouncil/content/un-sc-consolidated-list',
    ];

    const fetched = await this.fetchFromOfficialUrls(urls);
    const fetchTimestamp = new Date().toISOString();
    const fileHash = createHash('sha256').update(fetched.buffer).digest('hex');
    const rawArtifactPath = this.storeRawArtifact('UNSEC', fetched.extension, fetched.buffer, fetchTimestamp);

    const xml = fetched.buffer.toString('utf-8');
    const rows = this.parseUnsecXmlToCsvRows(xml);

    if (rows.length === 0) {
      throw new BadRequestException('UNSEC parser returned no records');
    }

    const csv = this.rowsToCsv(rows);
    const ingestion = await this.ingestUpload(
      {
        code: 'UNSEC_CONSOLIDATED',
        name: 'UN Security Council Consolidated List',
        type: DataSourceType.UN,
        country: 'UN',
        versionLabel: `UNSEC-CONSOLIDATED-${fetchTimestamp.slice(0, 10)}`,
      },
      {
        buffer: Buffer.from(csv, 'utf-8'),
        mimetype: 'text/csv',
        originalname: `unsec-consolidated-${fetchTimestamp.slice(0, 10)}.csv`,
        size: Buffer.byteLength(csv),
      },
      tenantId,
      importedBy,
    );

    return {
      source: 'UNSEC_CONSOLIDATED',
      sourceUrl: fetched.url,
      fetchTimestamp,
      fileHash,
      parserResult: {
        parsedRows: rows.length,
        parser: 'xml-regex-mvp',
        warnings: [],
      },
      ingestionResult: {
        ingestionRunReportId: ingestion.ingestionRunReportId,
        versionId: ingestion.versionId,
        insertedRecords: ingestion.insertedRecords,
        rejectedRows: ingestion.rejectedRows,
        duplicateRows: ingestion.duplicateRows,
      },
      rawArtifactPath,
      errors: [],
    };
  }

  private async fetchFromOfficialUrls(urls: string[]) {
    const errors: string[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'KYDEX-Connector/1.0',
          },
        });

        if (!response.ok) {
          errors.push(`${url} -> HTTP ${response.status}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length === 0) {
          errors.push(`${url} -> empty response`);
          continue;
        }

        const extension = this.extensionFromUrl(url, response.headers.get('content-type') ?? '');
        return { url, buffer, extension };
      } catch (error) {
        errors.push(`${url} -> ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    throw new BadRequestException(`Failed to fetch official source: ${errors.join('; ')}`);
  }

  private extensionFromUrl(url: string, contentType: string) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.xml') || contentType.includes('xml')) {
      return 'xml';
    }

    if (lowerUrl.endsWith('.json') || contentType.includes('json')) {
      return 'json';
    }

    if (lowerUrl.endsWith('.pdf') || contentType.includes('pdf')) {
      return 'pdf';
    }

    return 'csv';
  }

  private storeRawArtifact(sourceCode: string, extension: string, buffer: Buffer, fetchTimestamp: string) {
    const root = join(process.cwd(), '..', '..', '.snapshots', 'source-artifacts', sourceCode.toLowerCase());
    mkdirSync(root, { recursive: true });
    const fileName = `${fetchTimestamp.replaceAll(':', '-').replaceAll('.', '-')}.${extension}`;
    const fullPath = join(root, fileName);
    writeFileSync(fullPath, buffer);
    return fullPath;
  }

  private parseUnsecXmlToCsvRows(xml: string) {
    const individualEntries = this.extractTagBlocks(xml, 'INDIVIDUAL');
    const entityEntries = this.extractTagBlocks(xml, 'ENTITY');
    const rows: Array<Record<string, string>> = [];

    for (const entry of individualEntries) {
      const name = this.pickFirstTag(entry, ['FIRST_NAME', 'SECOND_NAME', 'THIRD_NAME', 'FOURTH_NAME'])
        .join(' ')
        .trim();
      const documentNumber = this.readTag(entry, 'NUMBER') ?? this.readTag(entry, 'NATIONAL_NUMBER') ?? '';
      const nationality = this.readTag(entry, 'NATIONALITY') ?? '';
      const dateOfBirth = this.readTag(entry, 'INDIVIDUAL_DATE_OF_BIRTH') ?? this.readTag(entry, 'DATE') ?? '';

      if (!name) {
        continue;
      }

      rows.push({
        primaryName: name,
        entityType: 'PERSON',
        nationality,
        dateOfBirth,
        documentNumber,
        country: this.readTag(entry, 'COUNTRY') ?? '',
        aliases: this.collectAliases(entry).join('|'),
      });
    }

    for (const entry of entityEntries) {
      const name = this.readTag(entry, 'FIRST_NAME') ?? this.readTag(entry, 'NAME_ORIGINAL_SCRIPT') ?? '';
      if (!name) {
        continue;
      }

      rows.push({
        primaryName: name,
        entityType: 'ENTITY',
        nationality: '',
        dateOfBirth: '',
        documentNumber: '',
        country: this.readTag(entry, 'COUNTRY') ?? '',
        aliases: this.collectAliases(entry).join('|'),
      });
    }

    return rows;
  }

  private parseOfacConsolidatedXmlToCsvRows(xml: string) {
    const entries = this.extractTagBlocks(xml, 'sdnEntry');
    const rows: Array<Record<string, string>> = [];

    for (const entry of entries) {
      const uid = this.readTag(entry, 'uid') ?? '';
      const lastName = this.readTag(entry, 'lastName') ?? '';
      const firstName = this.readTag(entry, 'firstName') ?? '';
      const primaryName = `${firstName} ${lastName}`.trim() || lastName;
      if (!primaryName) {
        continue;
      }

      const programs = this.extractTagBlocks(entry, 'program')
        .map((block) => block.trim())
        .filter(Boolean);
      const aliases = this.extractTagBlocks(entry, 'aka')
        .map((block) => this.readTag(block, 'lastName') ?? this.readTag(block, 'firstName') ?? '')
        .filter(Boolean);
      const firstId = this.readTag(entry, 'idNumber') ?? '';
      const firstNationality = this.readTag(entry, 'nationality') ?? this.readTag(entry, 'country') ?? '';
      const dateOfBirth = this.readTag(entry, 'dateOfBirth') ?? '';
      const remarks = this.readTag(entry, 'remarks') ?? '';
      const title = this.readTag(entry, 'title') ?? '';
      const entityType = (this.readTag(entry, 'sdnType') ?? 'ENTITY').toUpperCase();

      rows.push({
        primaryName,
        entityType,
        aliases: aliases.join('|'),
        externalReference: uid,
        program: programs.join('|'),
        title,
        remarks,
        sourceReference: uid,
        dateOfBirth,
        nationality: firstNationality,
        documentNumber: firstId,
        listType: 'OFAC_CONSOLIDATED',
        referenceNumber: uid,
        rawPayload: JSON.stringify({
          uid,
          sdnType: entityType,
          programs,
          aliases,
          dateOfBirth,
          nationality: firstNationality,
          documentNumber: firstId,
          title,
          remarks,
        }),
      });
    }

    return rows;
  }

  private rowsToCsv(
    rows: Array<Record<string, string>>,
    headers = ['primaryName', 'entityType', 'nationality', 'dateOfBirth', 'documentNumber', 'country', 'aliases'],
  ) {
    const lines = [headers.join(',')];

    for (const row of rows) {
      lines.push(
        headers
          .map((header) => this.escapeCsv(row[header] ?? ''))
          .join(','),
      );
    }

    return lines.join('\n');
  }

  private escapeCsv(value: string) {
    const escaped = value.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  private extractTagBlocks(xml: string, tagName: string) {
    const blocks: string[] = [];
    const regex = new RegExp(String.raw`<${tagName}>([\s\S]*?)</${tagName}>`, 'g');
    let match = regex.exec(xml);
    while (match) {
      blocks.push(match[1]);
      match = regex.exec(xml);
    }
    return blocks;
  }

  private readTag(block: string, tagName: string) {
    const regex = new RegExp(String.raw`<${tagName}>([\s\S]*?)</${tagName}>`);
    const match = regex.exec(block);
    if (!match) {
      return null;
    }

    return match[1].replaceAll(/<[^>]+>/g, '').trim() || null;
  }

  private pickFirstTag(block: string, tagNames: string[]) {
    return tagNames
      .map((tag) => this.readTag(block, tag))
      .filter((value): value is string => !!value);
  }

  private collectAliases(block: string) {
    const aliasTags = this.extractTagBlocks(block, 'INDIVIDUAL_ALIAS').concat(this.extractTagBlocks(block, 'ALIAS'));
    const aliases = aliasTags
      .map((entry) => this.readTag(entry, 'ALIAS_NAME') ?? this.readTag(entry, 'NAME') ?? this.readTag(entry, 'QUALITY'))
      .filter((value): value is string => !!value);
    return [...new Set(aliases)];
  }

  private async requireSourceByCode(sourceCode: string) {
    const canonicalCode = this.resolveCanonicalSourceCode(sourceCode);
    const source = await this.prisma.dataSource.findUnique({
      where: { code: canonicalCode },
      select: { id: true, code: true, name: true },
    });

    if (!source) {
      throw new BadRequestException(`Unknown source: ${sourceCode}`);
    }

    return source;
  }

  private resolveCanonicalSourceCode(sourceCode: string) {
    const normalized = sourceCode.trim().toUpperCase();
    return LEGACY_SOURCE_ALIASES[normalized] ?? normalized;
  }

  private normalizeSearchValue(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    return this.matchingService.normalizeName(value);
  }

  private normalizeLatinSearchValue(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    return this.matchingService.toLatinSearchKey(value);
  }

  private hasSearchFilters(filters: RecordQueryFilters) {
    return Object.values(filters).some((value) => value !== undefined && value !== null && String(value).trim().length > 0);
  }

  private extractProgramText(rawPayload: Prisma.JsonValue) {
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      return '';
    }

    const payload = rawPayload as Record<string, unknown>;
    const values = [payload.program, payload.programs, payload.listType, payload.referenceNumber]
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => this.toOptionalString(value))
      .filter((value): value is string => !!value);

    return values.join(' | ');
  }

  private resolveRecordSort(sort: string | undefined): Prisma.WatchlistRecordOrderByWithRelationInput[] {
    switch ((sort ?? '').trim()) {
      case 'name_asc':
        return [{ primaryName: 'asc' }];
      case 'name_desc':
        return [{ primaryName: 'desc' }];
      case 'created_asc':
        return [{ createdAt: 'asc' }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }
}
