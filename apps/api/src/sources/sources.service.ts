import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NameVariantType, Prisma, SourceFileStatus, SourceStatus, SourceSyncStatus } from '@prisma/client';
import { NameNormalizationService } from '../name-normalization/name-normalization.service';

const OFAC_ALIVE_URL = 'https://sanctionslistservice.ofac.treas.gov/alive';
const OFAC_LISTS_URL = 'https://sanctionslistservice.ofac.treas.gov/sanctions-lists';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nameNormalization: NameNormalizationService,
  ) {}

  private canonicalCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private phoneticKey(input: string): string | undefined {
    const value = this.nameNormalization.normalizeLatin(input);
    if (!value) return undefined;
    const letters = value.replace(/[^a-z]/g, '').toUpperCase();
    if (!letters) return undefined;
    const first = letters[0];
    const tail = letters
      .slice(1)
      .replace(/[BFPV]/g, '1')
      .replace(/[CGJKQSXZ]/g, '2')
      .replace(/[DT]/g, '3')
      .replace(/[L]/g, '4')
      .replace(/[MN]/g, '5')
      .replace(/[R]/g, '6')
      .replace(/[AEIOUYHW]/g, '');
    const compact = (first + tail).replace(/(\d)\1+/g, '$1');
    return (compact + '0000').slice(0, 4);
  }

  private async getSourceByCode(code: string) {
    const canonical = this.canonicalCode(code);
    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: canonical } });
    if (!source) throw new NotFoundException(`Source not found: ${canonical}`);
    return source;
  }

  async listSources() {
    return this.prisma.kydexDataSource.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async getSourceStatus(code: string) {
    const source = await this.getSourceByCode(code);
    return source;
  }

  async healthCheck(code: string) {
    const canonicalCode = this.canonicalCode(code);
    const source = await this.getSourceByCode(canonicalCode);

    const start = Date.now();
    let status: SourceStatus = SourceStatus.offline;
    let httpStatus: number | null = null;
    let error: string | null = null;

    try {
      const targetUrl = canonicalCode === 'OFAC' ? OFAC_ALIVE_URL : (source.baseUrl ?? '');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timer);
      httpStatus = response.status;
      status = response.status === 200 ? SourceStatus.connected : SourceStatus.degraded;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
      status = SourceStatus.offline;
      this.logger.warn(`Health check failed for ${code}: ${error}`);
    }

    const latencyMs = Date.now() - start;

    await this.prisma.kydexDataSource.update({
      where: { code: canonicalCode },
      data: {
        status,
        lastHealthCheckAt: new Date(),
        lastLatencyMs: latencyMs,
        lastError: error,
      },
    });

    await this.prisma.sourceConnectionLog.create({
      data: {
        sourceId: source.id,
        status,
        endpoint: canonicalCode === 'OFAC' ? OFAC_ALIVE_URL : source.baseUrl,
        latencyMs,
        httpStatus,
        error,
      },
    });

    return { code: canonicalCode, status, latencyMs, httpStatus, error, checkedAt: new Date() };
  }

  async listSyncRuns(code: string) {
    const source = await this.getSourceByCode(code);
    return this.prisma.sourceSyncRun.findMany({
      where: { sourceId: source.id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getImportStatus(code: string) {
    const source = await this.getSourceByCode(code);
    const [importedListCount, entityCount, nameCount, variantCount] = await this.prisma.$transaction([
      this.prisma.sourceImportedList.count({ where: { sourceId: source.id } }),
      this.prisma.sourceEntity.count({ where: { sourceId: source.id } }),
      this.prisma.sourceName.count({ where: { sourceId: source.id } }),
      this.prisma.sourceNameVariant.count({ where: { sourceName: { entity: { sourceId: source.id } } } }),
    ]);

    return {
      sourceCode: source.code,
      importedListCount,
      sourceEntityCount: entityCount,
      sourceNameCount: nameCount,
      sourceNameVariantCount: variantCount,
      localCopyAvailable: source.localCopyAvailable,
      lastSuccessfulSyncAt: source.lastSuccessfulSyncAt,
    };
  }

  async importFromLegacy(code: string) {
    const canonical = this.canonicalCode(code);
    if (canonical !== 'OFAC') {
      throw new NotFoundException(`Legacy import is only supported for OFAC. Received: ${canonical}`);
    }

    const source = await this.ensureOfacSource();
    const now = new Date();

    const existingEntityCount = await this.prisma.sourceEntity.count({ where: { sourceId: source.id } });
    if (existingEntityCount > 0) {
      const grouped = await this.prisma.sourceEntity.groupBy({
        by: ['listName'],
        where: { sourceId: source.id },
        _count: { _all: true },
      });

      await this.prisma.sourceImportedList.deleteMany({ where: { sourceId: source.id } });

      for (const row of grouped) {
        await this.prisma.sourceImportedList.create({
          data: {
            sourceId: source.id,
            listName: row.listName,
            recordCount: row._count._all,
            languageCoverage: ['en', 'ar'],
            localAvailable: row._count._all > 0,
            lastImportedAt: now,
          },
        });
      }

      await this.prisma.kydexDataSource.update({
        where: { code: 'OFAC' },
        data: {
          localCopyAvailable: true,
          status: SourceStatus.fallback_available,
          lastSuccessfulSyncAt: now,
          lastAttemptedSyncAt: now,
          lastError: null,
        },
      });

      const variantCount = await this.prisma.sourceNameVariant.count({
        where: { sourceName: { entity: { sourceId: source.id } } },
      });

      return {
        status: 'completed',
        source: 'OFAC',
        mode: 'metadata_finalize',
        importedEntities: existingEntityCount,
        importedLists: grouped.map((g) => ({ listName: g.listName, recordCount: g._count._all })),
        sourceNameVariantCount: variantCount,
      };
    }

    const syncRun = await this.prisma.sourceSyncRun.create({
      data: {
        sourceId: source.id,
        status: SourceSyncStatus.running,
        syncType: 'legacy_import',
        sourceFileName: 'SDN_ADVANCED.XML,CONS_ADVANCED.XML',
        startedAt: now,
      },
    });

    await this.prisma.kydexDataSource.update({
      where: { code: 'OFAC' },
      data: {
        lastAttemptedSyncAt: now,
      },
    });

    await this.prisma.$transaction([
      this.prisma.sourceNameVariant.deleteMany({ where: { sourceName: { entity: { sourceId: source.id } } } }),
      this.prisma.sourceName.deleteMany({ where: { entity: { sourceId: source.id } } }),
      this.prisma.sourceImportedList.deleteMany({ where: { sourceId: source.id } }),
      this.prisma.sourceEntity.deleteMany({ where: { sourceId: source.id } }),
      this.prisma.sourceFile.deleteMany({ where: { sourceId: source.id } }),
    ]);

    const sourceFiles = await Promise.all([
      this.prisma.sourceFile.create({
        data: {
          sourceId: source.id,
          syncRunId: syncRun.id,
          fileName: 'SDN_ADVANCED.XML',
          fileType: 'xml',
          status: SourceFileStatus.imported,
          importedAt: now,
          downloadedAt: now,
        },
      }),
      this.prisma.sourceFile.create({
        data: {
          sourceId: source.id,
          syncRunId: syncRun.id,
          fileName: 'CONS_ADVANCED.XML',
          fileType: 'xml',
          status: SourceFileStatus.imported,
          importedAt: now,
          downloadedAt: now,
        },
      }),
    ]);

    const sourceFileByList = new Map<string, string>([
      ['SDN List', sourceFiles[0].id],
      ['Consolidated List', sourceFiles[1].id],
    ]);

    // Keep the import endpoint responsive by processing a bounded batch per call.
    const BATCH_SIZE = 600;
    const legacyEntities = await this.prisma.ofacEntity.findMany({
      include: {
        names: true,
        addresses: true,
      },
      orderBy: { ofacEntityId: 'asc' },
      take: BATCH_SIZE,
    });

    const listCounts = new Map<string, number>();
    let importedEntities = 0;
    let importedNames = 0;
    const errors: Array<{ entityId: string; error: string }> = [];

    for (const legacy of legacyEntities) {
      const listName = legacy.listName?.trim() || 'SDN List';
      listCounts.set(listName, (listCounts.get(listName) ?? 0) + 1);

      const countries = Array.from(
        new Set(legacy.addresses.map((addr) => addr.country).filter((country): country is string => Boolean(country))),
      );

      try {
        const sourceEntity = await this.prisma.sourceEntity.upsert({
          where: {
            sourceId_externalEntityId: {
              sourceId: source.id,
              externalEntityId: legacy.ofacEntityId,
            },
          },
          create: {
            sourceId: source.id,
            sourceFileId: sourceFileByList.get(listName) ?? null,
            externalEntityId: legacy.ofacEntityId,
            entityType: legacy.entityType ?? 'Entity',
            primaryName: legacy.primaryName ?? legacy.ofacEntityId,
            normalizedLatin: this.nameNormalization.normalizeLatin(legacy.primaryName ?? legacy.ofacEntityId),
            normalizedArabic: this.nameNormalization.normalizeArabic(
              this.nameNormalization.latinToArabic(legacy.primaryName ?? legacy.ofacEntityId),
            ),
            listName,
            programs: legacy.programs,
            countries,
            rawRecord: legacy.rawJson ?? Prisma.JsonNull,
            importedAt: legacy.lastSyncedAt ?? now,
          },
          update: {
            sourceFileId: sourceFileByList.get(listName) ?? null,
            entityType: legacy.entityType ?? 'Entity',
            primaryName: legacy.primaryName ?? legacy.ofacEntityId,
            normalizedLatin: this.nameNormalization.normalizeLatin(legacy.primaryName ?? legacy.ofacEntityId),
            normalizedArabic: this.nameNormalization.normalizeArabic(
              this.nameNormalization.latinToArabic(legacy.primaryName ?? legacy.ofacEntityId),
            ),
            listName,
            programs: legacy.programs,
            countries,
            rawRecord: legacy.rawJson ?? Prisma.JsonNull,
            importedAt: legacy.lastSyncedAt ?? now,
          },
        });

        importedEntities += 1;

        const seenNames = new Set<string>();
        const names = legacy.names.length > 0
          ? legacy.names
          : [
              {
                id: '',
                entityId: legacy.id,
                fullName: legacy.primaryName ?? legacy.ofacEntityId,
                normalizedName: legacy.normalizedPrimaryName ?? this.nameNormalization.normalizeLatin(legacy.primaryName ?? legacy.ofacEntityId),
                firstName: null,
                middleName: null,
                lastName: null,
                isPrimary: true,
                isLowQuality: false,
                aliasType: null,
                createdAt: now,
              },
            ];

        for (const legacyName of names) {
          const originalName = legacyName.fullName?.trim();
          if (!originalName) continue;
          const dedupe = originalName.toLowerCase();
          if (seenNames.has(dedupe)) continue;
          seenNames.add(dedupe);

          const normalizedLatin = this.nameNormalization.normalizeLatin(originalName);
          const normalizedArabic = this.nameNormalization.normalizeArabic(this.nameNormalization.latinToArabic(originalName));
          const tokens = this.nameNormalization.tokenize(originalName);

          const sourceName = await this.prisma.sourceName.create({
            data: {
              entityId: sourceEntity.id,
              sourceId: source.id,
              originalName,
              isPrimary: Boolean(legacyName.isPrimary),
              isAlias: !legacyName.isPrimary,
              aliasType: legacyName.aliasType ?? null,
              language: /[\u0600-\u06FF]/.test(originalName) ? 'ar' : 'en',
              script: /[\u0600-\u06FF]/.test(originalName) ? 'Arabic' : 'Latin',
              normalizedLatin,
              normalizedArabic,
              tokens,
            },
          });

          importedNames += 1;

          const variants = new Map<string, NameVariantType>();
          variants.set(originalName, NameVariantType.original);
          if (normalizedLatin) variants.set(normalizedLatin, NameVariantType.normalized_latin);
          if (normalizedArabic) variants.set(normalizedArabic, NameVariantType.normalized_arabic);

          const generated = this.nameNormalization.generateVariants(originalName);
          for (const generatedVariant of generated) {
            const isArabic = /[\u0600-\u06FF]/.test(generatedVariant);
            variants.set(generatedVariant, isArabic ? NameVariantType.latin_to_arabic : NameVariantType.arabic_to_latin);
          }

          for (const token of tokens) {
            variants.set(token, NameVariantType.token);
          }

          if (tokens.length > 1) {
            for (const token of tokens) {
              if (token.length >= 2) {
                variants.set(token, NameVariantType.single_name);
              }
            }
          }

          if (!legacyName.isPrimary) {
            variants.set(originalName, NameVariantType.alias);
          }

          const phonetic = this.phoneticKey(originalName);
          if (phonetic) {
            variants.set(phonetic, NameVariantType.phonetic);
          }

          const variantRows = Array.from(variants.entries())
            .map(([variant, variantType]) => ({
              sourceNameId: sourceName.id,
              entityId: sourceEntity.id,
              variant,
              variantType,
              language: /[\u0600-\u06FF]/.test(variant) ? 'ar' : 'en',
              phoneticKey: this.phoneticKey(variant),
              tokens: this.nameNormalization.tokenize(variant),
              quality: variantType === NameVariantType.original ? 1 : 0.9,
            }))
            .filter((row) => Boolean(row.variant));

          if (variantRows.length > 0) {
            await this.prisma.sourceNameVariant.createMany({ data: variantRows, skipDuplicates: true });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ entityId: legacy.ofacEntityId, error: message });
      }
    }

    const importedLists: Array<{ listName: string; fileName: string }> = [
      { listName: 'SDN List', fileName: 'SDN_ADVANCED.XML' },
      { listName: 'Consolidated List', fileName: 'CONS_ADVANCED.XML' },
    ];

    for (const list of importedLists) {
      await this.prisma.sourceImportedList.create({
        data: {
          sourceId: source.id,
          syncRunId: syncRun.id,
          sourceFileId: sourceFileByList.get(list.listName) ?? null,
          listName: list.listName,
          programName: null,
          recordCount: listCounts.get(list.listName) ?? 0,
          languageCoverage: ['en', 'ar'],
          localAvailable: (listCounts.get(list.listName) ?? 0) > 0,
          lastImportedAt: now,
        },
      });
    }

    await this.prisma.$transaction([
      this.prisma.sourceSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status: errors.length > 0 ? SourceSyncStatus.failed : SourceSyncStatus.completed,
          recordsImported: importedEntities,
          recordsUpdated: 0,
          recordsFailed: errors.length,
          finishedAt: new Date(),
          error: errors.length > 0 ? `Legacy import completed with ${errors.length} errors.` : null,
        },
      }),
      this.prisma.kydexDataSource.update({
        where: { code: 'OFAC' },
        data: {
          localCopyAvailable: importedEntities > 0,
          status: importedEntities > 0 ? SourceStatus.fallback_available : SourceStatus.sync_required,
          lastSuccessfulSyncAt: new Date(),
          lastAttemptedSyncAt: new Date(),
          lastError: errors.length > 0 ? `Legacy import completed with ${errors.length} errors.` : null,
        },
      }),
    ]);

    return {
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      source: 'OFAC',
      syncRunId: syncRun.id,
      importedEntities,
      importedNames,
      failedEntities: errors.length,
      sampleErrors: errors.slice(0, 5),
      importedLists: Array.from(listCounts.entries()).map(([listName, recordCount]) => ({ listName, recordCount })),
    };
  }

  async ensureOfacSource() {
    return this.prisma.kydexDataSource.upsert({
      where: { code: 'OFAC' },
      create: {
        code: 'OFAC',
        name: 'OFAC Sanctions List Service',
        baseUrl: 'https://sanctionslistservice.ofac.treas.gov',
        status: SourceStatus.unknown,
        fallbackEnabled: true,
        localCopyAvailable: false,
      },
      update: {},
    });
  }

  async getOfacSanctionsLists() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(OFAC_LISTS_URL, { signal: controller.signal });
      clearTimeout(timer);
      return response.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch OFAC sanctions lists: ${msg}`);
    }
  }

  async checkOfacChangesLatest() {
    const source = await this.ensureOfacSource();
    const startedAt = new Date();

    const syncRun = await this.prisma.sourceSyncRun.create({
      data: {
        sourceId: source.id,
        status: SourceSyncStatus.running,
        syncType: 'changes_latest_check',
        startedAt,
      },
    });

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(OFAC_LISTS_URL, { signal: controller.signal });
      clearTimeout(timer);

      const httpStatus = response.status;
      const payload = (await response.json()) as unknown;
      const listCount = Array.isArray(payload) ? payload.length : null;
      const status = httpStatus >= 200 && httpStatus < 300 ? SourceStatus.connected : SourceStatus.degraded;

      await this.prisma.$transaction([
        this.prisma.sourceConnectionLog.create({
          data: {
            sourceId: source.id,
            status,
            endpoint: OFAC_LISTS_URL,
            httpStatus,
            error: status === SourceStatus.connected ? null : `Unexpected status ${httpStatus}`,
          },
        }),
        this.prisma.sourceSyncRun.update({
          where: { id: syncRun.id },
          data: {
            status: httpStatus >= 200 && httpStatus < 300 ? SourceSyncStatus.completed : SourceSyncStatus.failed,
            finishedAt: new Date(),
            recordsUpdated: listCount ?? 0,
            error: httpStatus >= 200 && httpStatus < 300 ? null : `Unexpected status ${httpStatus}`,
          },
        }),
        this.prisma.kydexDataSource.update({
          where: { code: 'OFAC' },
          data: {
            lastAttemptedSyncAt: new Date(),
            status,
            lastError: status === SourceStatus.connected ? null : `Unexpected status ${httpStatus}`,
          },
        }),
      ]);

      return {
        status: httpStatus >= 200 && httpStatus < 300 ? 'ok' : 'degraded',
        syncRunId: syncRun.id,
        httpStatus,
        listCount,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      await this.prisma.$transaction([
        this.prisma.sourceSyncRun.update({
          where: { id: syncRun.id },
          data: {
            status: SourceSyncStatus.failed,
            finishedAt: new Date(),
            error: message,
          },
        }),
        this.prisma.kydexDataSource.update({
          where: { code: 'OFAC' },
          data: {
            lastAttemptedSyncAt: new Date(),
            status: SourceStatus.degraded,
            lastError: message,
          },
        }),
      ]);

      throw new Error(`OFAC changes/latest check failed: ${message}`);
    }
  }

  async refreshOfacLocalCopySafe() {
    const source = await this.ensureOfacSource();
    const startedAt = new Date();

    const syncRun = await this.prisma.sourceSyncRun.create({
      data: {
        sourceId: source.id,
        status: SourceSyncStatus.running,
        syncType: 'scheduled_local_refresh',
        startedAt,
      },
    });

    try {
      const entities = await this.prisma.sourceEntity.groupBy({
        by: ['listName'],
        where: { sourceId: source.id },
        _count: { _all: true },
      });

      const totalEntities = entities.reduce((sum, item) => sum + item._count._all, 0);
      if (totalEntities <= 0) {
        await this.prisma.sourceSyncRun.update({
          where: { id: syncRun.id },
          data: {
            status: SourceSyncStatus.failed,
            finishedAt: new Date(),
            error: 'No local OFAC source entities available for safe refresh.',
          },
        });

        return {
          status: 'failed',
          syncRunId: syncRun.id,
          message: 'No local OFAC source entities available for safe refresh.',
        };
      }

      // Stage list summaries in memory first; only then replace list summary rows.
      const stagedLists = entities.map((item) => ({
        sourceId: source.id,
        syncRunId: syncRun.id,
        listName: item.listName,
        programName: null,
        recordCount: item._count._all,
        languageCoverage: ['en', 'ar'],
        localAvailable: item._count._all > 0,
        lastImportedAt: new Date(),
      }));

      await this.prisma.$transaction([
        this.prisma.sourceImportedList.deleteMany({ where: { sourceId: source.id } }),
        this.prisma.sourceImportedList.createMany({ data: stagedLists }),
        this.prisma.sourceSyncRun.update({
          where: { id: syncRun.id },
          data: {
            status: SourceSyncStatus.completed,
            finishedAt: new Date(),
            recordsImported: totalEntities,
            recordsUpdated: stagedLists.length,
            recordsFailed: 0,
          },
        }),
        this.prisma.kydexDataSource.update({
          where: { code: 'OFAC' },
          data: {
            localCopyAvailable: true,
            status: SourceStatus.fallback_available,
            lastAttemptedSyncAt: new Date(),
            lastSuccessfulSyncAt: new Date(),
            lastError: null,
          },
        }),
      ]);

      return {
        status: 'completed',
        syncRunId: syncRun.id,
        importedLists: stagedLists.length,
        importedEntities: totalEntities,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      await this.prisma.sourceSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status: SourceSyncStatus.failed,
          finishedAt: new Date(),
          error: message,
        },
      });

      await this.prisma.kydexDataSource.update({
        where: { code: 'OFAC' },
        data: {
          lastAttemptedSyncAt: new Date(),
          lastError: message,
        },
      });

      throw new Error(`Safe OFAC local refresh failed: ${message}`);
    }
  }
}
