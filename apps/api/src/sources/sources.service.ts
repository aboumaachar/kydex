import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataSourceType, NameVariantType, Prisma, SourceFileStatus, SourceStatus, SourceSyncStatus } from '@prisma/client';
import { NameNormalizationService } from '../name-normalization/name-normalization.service';
import { createHash } from 'node:crypto';
import * as XLSX from 'xlsx';

const OFAC_ALIVE_URL = 'https://sanctionslistservice.ofac.treas.gov/alive';
const OFAC_LISTS_URL = 'https://sanctionslistservice.ofac.treas.gov/sanctions-lists';
const LEBANON_SOURCE_CODE = 'LEBANON_NATIONAL_LIST';
const LEBANON_LIST_NAME_DEFAULT = 'Lebanon National List';
const LEBANON_AR_FILE_LABEL = 'lebanon-national-list-ar.xls';
const LEBANON_EN_FILE_LABEL = 'lebanon-national-list-en.xls';

type LebanonLanguage = 'ar' | 'en';

type ParsedLebanonEntity = {
  externalEntityId: string;
  entityType: string;
  listName: string;
  programs: string[];
  countries: string[];
  primaryNameAr?: string;
  primaryNameEn?: string;
  aliasesAr: string[];
  aliasesEn: string[];
  rawAr?: Record<string, string>;
  rawEn?: Record<string, string>;
};

type ParsedLebanonWorksheet = {
  rows: ParsedLebanonEntity[];
  mapping: {
    worksheet: string;
    headerRowIndex: number;
    columns: Record<string, number>;
    language: LebanonLanguage;
  };
};

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
    let source = await this.prisma.kydexDataSource.findUnique({ where: { code: canonical } });
    if (!source && canonical === 'OFAC') {
      source = await this.ensureOfacSource();
    }
    if (!source && canonical === LEBANON_SOURCE_CODE) {
      source = await this.ensureLebanonNationalListSource();
    }
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
    if (source.code !== LEBANON_SOURCE_CODE) {
      return source;
    }

    const [latestArFile, latestEnFile, mergedFile, importedLists] = await this.prisma.$transaction([
      this.prisma.sourceFile.findFirst({
        where: { sourceId: source.id, fileName: LEBANON_AR_FILE_LABEL },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sourceFile.findFirst({
        where: { sourceId: source.id, fileName: LEBANON_EN_FILE_LABEL },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sourceFile.findFirst({
        where: { sourceId: source.id, fileName: 'lebanon-national-list-bilingual-merged' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sourceImportedList.findMany({ where: { sourceId: source.id } }),
    ]);

    const mergedEntityCount = importedLists
      .filter((list) => list.listName.includes('(Bilingual Merged)'))
      .reduce((acc, list) => acc + list.recordCount, 0);

    const arabicRowCount = importedLists
      .filter((list) => list.listName.includes('(Arabic Feed)'))
      .reduce((acc, list) => acc + list.recordCount, 0);

    const englishRowCount = importedLists
      .filter((list) => list.listName.includes('(English Feed)'))
      .reduce((acc, list) => acc + list.recordCount, 0);

    return {
      ...source,
      bilingualFeeds: {
        ar: latestArFile
          ? {
              url: latestArFile.downloadUrl,
              fileHash: latestArFile.sha256,
              sizeBytes: latestArFile.sizeBytes,
              downloadedAt: latestArFile.downloadedAt,
              importedAt: latestArFile.importedAt,
              rowCount: arabicRowCount,
            }
          : null,
        en: latestEnFile
          ? {
              url: latestEnFile.downloadUrl,
              fileHash: latestEnFile.sha256,
              sizeBytes: latestEnFile.sizeBytes,
              downloadedAt: latestEnFile.downloadedAt,
              importedAt: latestEnFile.importedAt,
              rowCount: englishRowCount,
            }
          : null,
        merged: mergedFile
          ? {
              fileHash: mergedFile.sha256,
              importedAt: mergedFile.importedAt,
              entityCount: mergedEntityCount,
            }
          : null,
      },
    };
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

  async ensureLebanonNationalListSource() {
    const primaryUrl =
      process.env.LEBANON_NATIONAL_LIST_AR_XLS_URL
      ?? process.env.LEBANON_NATIONAL_LIST_XLS_URL
      ?? process.env.LEBANON_NATIONAL_LIST_EN_XLS_URL
      ?? null;

    return this.prisma.kydexDataSource.upsert({
      where: { code: LEBANON_SOURCE_CODE },
      create: {
        code: LEBANON_SOURCE_CODE,
        name: 'Lebanon National List | اللائحة الوطنية',
        baseUrl: primaryUrl,
        status: SourceStatus.unknown,
        fallbackEnabled: true,
        localCopyAvailable: false,
      },
      update: {
        name: 'Lebanon National List | اللائحة الوطنية',
        baseUrl: primaryUrl,
      },
    });
  }

  async syncLebanonNationalList() {
    const arUrl = process.env.LEBANON_NATIONAL_LIST_AR_XLS_URL ?? process.env.LEBANON_NATIONAL_LIST_XLS_URL;
    const enUrl = process.env.LEBANON_NATIONAL_LIST_EN_XLS_URL ?? process.env.LEBANON_NATIONAL_LIST_XLS_URL;
    if (!arUrl && !enUrl) {
      throw new Error('LEBANON_NATIONAL_LIST_AR_XLS_URL / LEBANON_NATIONAL_LIST_EN_XLS_URL (or legacy LEBANON_NATIONAL_LIST_XLS_URL) must be configured.');
    }

    const source = await this.ensureLebanonNationalListSource();
    const now = new Date();

    const syncRun = await this.prisma.sourceSyncRun.create({
      data: {
        sourceId: source.id,
        status: SourceSyncStatus.running,
        syncType: 'scheduled_xls_import',
        startedAt: now,
        sourceFileName: `${LEBANON_AR_FILE_LABEL},${LEBANON_EN_FILE_LABEL}`,
      },
    });

    await this.prisma.kydexDataSource.update({
      where: { code: LEBANON_SOURCE_CODE },
      data: {
        lastAttemptedSyncAt: now,
      },
    });

    try {
      const downloadWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) {
          throw new Error(`Lebanon source download failed (${url}) with HTTP ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
          url,
          buffer,
          sha256: createHash('sha256').update(buffer).digest('hex'),
        };
      };

      const downloadedAr = arUrl ? await downloadWithTimeout(arUrl) : null;
      const downloadedEn = enUrl ? await downloadWithTimeout(enUrl) : null;
      const compositeHash = createHash('sha256')
        .update(downloadedAr?.sha256 ?? '')
        .update(':')
        .update(downloadedEn?.sha256 ?? '')
        .digest('hex');

      const latestFile = await this.prisma.sourceFile.findFirst({
        where: { sourceId: source.id },
        orderBy: { createdAt: 'desc' },
      });

      const hasLocalCopy = await this.prisma.sourceEntity.count({ where: { sourceId: source.id } });
      if (latestFile?.sha256 === compositeHash && hasLocalCopy > 0) {
        await this.prisma.$transaction([
          this.prisma.sourceSyncRun.update({
            where: { id: syncRun.id },
            data: {
              status: SourceSyncStatus.completed,
              finishedAt: new Date(),
              recordsUpdated: 0,
              recordsImported: 0,
              publicationId: 'NO_CHANGES',
            },
          }),
          this.prisma.kydexDataSource.update({
            where: { code: LEBANON_SOURCE_CODE },
            data: {
              status: SourceStatus.fallback_available,
              localCopyAvailable: true,
              lastSuccessfulSyncAt: new Date(),
              lastError: null,
            },
          }),
        ]);

        return {
          status: 'skipped_no_changes',
          source: LEBANON_SOURCE_CODE,
          syncRunId: syncRun.id,
          hash: compositeHash,
        };
      }
      const parsedAr = downloadedAr
        ? this.parseLebanonWorksheet(downloadedAr.buffer, 'ar')
        : null;
      const parsedEn = downloadedEn
        ? this.parseLebanonWorksheet(downloadedEn.buffer, 'en')
        : null;

      const parsedEntities = this.mergeLebanonEntities(parsedAr?.rows ?? [], parsedEn?.rows ?? []);
      if (parsedEntities.length === 0) {
        throw new Error('Lebanon bilingual source import produced zero entities.');
      }

      const mapping = {
        ar: parsedAr?.mapping ?? null,
        en: parsedEn?.mapping ?? null,
      };

      const isFirstImport = hasLocalCopy === 0;
      if (isFirstImport) {
        this.logger.log(`Lebanon bilingual mapping(first run): ${JSON.stringify(mapping)}`);
      }

      const importedAt = new Date();

      await this.prisma.$transaction(async (tx) => {
        const sourceFileAr = downloadedAr
          ? await tx.sourceFile.create({
              data: {
                sourceId: source.id,
                syncRunId: syncRun.id,
                fileName: LEBANON_AR_FILE_LABEL,
                fileType: 'xls',
                downloadUrl: downloadedAr.url,
                sha256: downloadedAr.sha256,
                sizeBytes: downloadedAr.buffer.length,
                downloadedAt: importedAt,
                importedAt,
                status: SourceFileStatus.imported,
              },
            })
          : null;

        const sourceFileEn = downloadedEn
          ? await tx.sourceFile.create({
              data: {
                sourceId: source.id,
                syncRunId: syncRun.id,
                fileName: LEBANON_EN_FILE_LABEL,
                fileType: 'xls',
                downloadUrl: downloadedEn.url,
                sha256: downloadedEn.sha256,
                sizeBytes: downloadedEn.buffer.length,
                downloadedAt: importedAt,
                importedAt,
                status: SourceFileStatus.imported,
              },
            })
          : null;

        const mergedFile = await tx.sourceFile.create({
          data: {
            sourceId: source.id,
            syncRunId: syncRun.id,
            fileName: 'lebanon-national-list-bilingual-merged',
            fileType: 'virtual',
            downloadUrl: null,
            sha256: compositeHash,
            sizeBytes: null,
            downloadedAt: importedAt,
            importedAt,
            status: SourceFileStatus.imported,
          },
        });

        await tx.sourceNameVariant.deleteMany({ where: { sourceName: { entity: { sourceId: source.id } } } });
        await tx.sourceName.deleteMany({ where: { entity: { sourceId: source.id } } });
        await tx.sourceImportedList.deleteMany({ where: { sourceId: source.id } });
        await tx.sourceEntity.deleteMany({ where: { sourceId: source.id } });

        const listCounter = new Map<string, number>();

        for (const row of parsedEntities) {
          const primaryName = row.primaryNameAr ?? row.primaryNameEn ?? '';
          if (!primaryName) continue;

          const aliasPool = Array.from(
            new Set([
              ...row.aliasesAr,
              ...row.aliasesEn,
              ...(row.primaryNameAr ? [row.primaryNameAr] : []),
              ...(row.primaryNameEn ? [row.primaryNameEn] : []),
            ].map((name) => name.trim()).filter(Boolean)),
          );

          const sourceEntity = await tx.sourceEntity.create({
            data: {
              sourceId: source.id,
              sourceFileId: mergedFile.id,
              externalEntityId: row.externalEntityId,
              entityType: row.entityType,
              primaryName,
              normalizedLatin: this.nameNormalization.normalizeLatin(primaryName),
              normalizedArabic: this.nameNormalization.normalizeArabic(
                this.nameNormalization.latinToArabic(primaryName),
              ),
              listName: row.listName,
              programs: row.programs,
              countries: row.countries,
              rawRecord: ({
                primaryNameAr: row.primaryNameAr ?? null,
                primaryNameEn: row.primaryNameEn ?? null,
                aliasesAr: row.aliasesAr,
                aliasesEn: row.aliasesEn,
                languageCoverage: ['ar', 'en'].filter((lang) =>
                  lang === 'ar' ? Boolean(row.primaryNameAr || row.aliasesAr.length > 0) : Boolean(row.primaryNameEn || row.aliasesEn.length > 0),
                ),
                rawArabicRow: row.rawAr ?? null,
                rawEnglishRow: row.rawEn ?? null,
              }) as Prisma.InputJsonValue,
              importedAt,
            },
          });

          const allNames = [primaryName, ...aliasPool.filter((candidate) => candidate !== primaryName)];
          const seen = new Set<string>();
          for (let i = 0; i < allNames.length; i += 1) {
            const originalName = allNames[i].trim();
            if (!originalName) continue;
            const dedupe = originalName.toLowerCase();
            if (seen.has(dedupe)) continue;
            seen.add(dedupe);

            const isPrimary = i === 0;
            const normalizedLatin = this.nameNormalization.normalizeLatin(originalName);
            const normalizedArabic = this.nameNormalization.normalizeArabic(this.nameNormalization.latinToArabic(originalName));
            const tokens = this.nameNormalization.tokenize(originalName);

            const sourceName = await tx.sourceName.create({
              data: {
                entityId: sourceEntity.id,
                sourceId: source.id,
                originalName,
                isPrimary,
                isAlias: !isPrimary,
                aliasType: isPrimary ? null : 'ALIAS',
                language: /[\u0600-\u06FF]/.test(originalName) ? 'ar' : 'en',
                script: /[\u0600-\u06FF]/.test(originalName) ? 'Arabic' : 'Latin',
                normalizedLatin,
                normalizedArabic,
                tokens,
              },
            });

            const variants = new Map<string, NameVariantType>();
            variants.set(originalName, isPrimary ? NameVariantType.original : NameVariantType.alias);
            if (normalizedLatin) variants.set(normalizedLatin, NameVariantType.normalized_latin);
            if (normalizedArabic) variants.set(normalizedArabic, NameVariantType.normalized_arabic);

            const generated = this.nameNormalization.generateVariants(originalName);
            for (const generatedVariant of generated) {
              const isArabic = /[\u0600-\u06FF]/.test(generatedVariant);
              variants.set(generatedVariant, isArabic ? NameVariantType.latin_to_arabic : NameVariantType.arabic_to_latin);
            }

            for (const token of tokens) {
              variants.set(token, NameVariantType.token);
              if (tokens.length > 1 && token.length >= 2) {
                variants.set(token, NameVariantType.single_name);
              }
            }

            const phonetic = this.phoneticKey(originalName);
            if (phonetic) variants.set(phonetic, NameVariantType.phonetic);

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
              .filter((variant) => Boolean(variant.variant));

            if (variantRows.length > 0) {
              await tx.sourceNameVariant.createMany({ data: variantRows, skipDuplicates: true });
            }
          }

          listCounter.set(row.listName, (listCounter.get(row.listName) ?? 0) + 1);
        }

        if (sourceFileAr) {
          await tx.sourceImportedList.create({
            data: {
              sourceId: source.id,
              syncRunId: syncRun.id,
              sourceFileId: sourceFileAr.id,
              listName: `${LEBANON_LIST_NAME_DEFAULT} (Arabic Feed)`,
              recordCount: parsedAr?.rows.length ?? 0,
              languageCoverage: ['ar'],
              localAvailable: (parsedAr?.rows.length ?? 0) > 0,
              lastImportedAt: importedAt,
            },
          });
        }

        if (sourceFileEn) {
          await tx.sourceImportedList.create({
            data: {
              sourceId: source.id,
              syncRunId: syncRun.id,
              sourceFileId: sourceFileEn.id,
              listName: `${LEBANON_LIST_NAME_DEFAULT} (English Feed)`,
              recordCount: parsedEn?.rows.length ?? 0,
              languageCoverage: ['en'],
              localAvailable: (parsedEn?.rows.length ?? 0) > 0,
              lastImportedAt: importedAt,
            },
          });
        }

        for (const [listName, recordCount] of listCounter.entries()) {
          await tx.sourceImportedList.create({
            data: {
              sourceId: source.id,
              syncRunId: syncRun.id,
              sourceFileId: mergedFile.id,
              listName: `${listName} (Bilingual Merged)`,
              recordCount,
              languageCoverage: ['ar', 'en'],
              localAvailable: recordCount > 0,
              lastImportedAt: importedAt,
            },
          });
        }
      });

      await this.syncLebanonDataSourceVersion(parsedEntities, compositeHash, importedAt);

      await this.prisma.$transaction([
        this.prisma.sourceSyncRun.update({
          where: { id: syncRun.id },
          data: {
            status: SourceSyncStatus.completed,
            finishedAt: new Date(),
            recordsImported: parsedEntities.length,
            recordsUpdated: parsedEntities.length,
            recordsFailed: 0,
            sourceFileName: [downloadedAr?.url, downloadedEn?.url].filter(Boolean).join(','),
            publicationId: isFirstImport ? 'FIRST_RUN_MAPPING_CAPTURED' : null,
          },
        }),
        this.prisma.kydexDataSource.update({
          where: { code: LEBANON_SOURCE_CODE },
          data: {
            status: SourceStatus.fallback_available,
            localCopyAvailable: true,
            lastSuccessfulSyncAt: new Date(),
            lastError: null,
          },
        }),
      ]);

      return {
        status: 'completed',
        source: LEBANON_SOURCE_CODE,
        syncRunId: syncRun.id,
        importedEntities: parsedEntities.length,
        hash: compositeHash,
        mapping,
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
          where: { code: LEBANON_SOURCE_CODE },
          data: {
            status: SourceStatus.degraded,
            lastError: message,
          },
        }),
      ]);

      throw new Error(`Lebanon national list sync failed: ${message}`);
    }
  }

  private parseLebanonWorksheet(buffer: Buffer, language: LebanonLanguage): ParsedLebanonWorksheet {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error(`Lebanon ${language.toUpperCase()} source XLS has no worksheet.`);
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      blankrows: false,
      raw: false,
    });

    if (rows.length < 2) {
      throw new Error(`Lebanon ${language.toUpperCase()} source XLS has insufficient rows.`);
    }

    const headerAliases: Record<string, string[]> = {
      externalEntityId: ['id', 'ref', 'reference', 'code', 'الرقم', 'مرجع'],
      primaryName: ['name', 'full name', 'entity name', 'الاسم', 'الاسم الكامل'],
      aliases: ['aliases', 'alias', 'known as', 'aka', 'اسم بديل', 'الاسماء البديلة'],
      entityType: ['type', 'entity type', 'category', 'النوع', 'التصنيف'],
      listName: ['list', 'list name', 'القائمة', 'اسم القائمة'],
      programs: ['program', 'programs', 'reason', 'سبب الادراج', 'category'],
      countries: ['country', 'countries', 'nationality', 'الجنسية', 'الدولة'],
    };

    const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const findHeaderIndex = (headerRow: (string | number | null)[]) => {
      const keys = headerRow.map((cell) => normalizeHeader(String(cell ?? '')));
      const hasNameLike = keys.some((key) => headerAliases.primaryName.some((alias) => key.includes(normalizeHeader(alias))));
      return hasNameLike ? keys : null;
    };

    let headerRowIndex = -1;
    let headerKeys: string[] = [];
    for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
      const maybe = findHeaderIndex(rows[i] ?? []);
      if (maybe) {
        headerRowIndex = i;
        headerKeys = maybe;
        break;
      }
    }

    if (headerRowIndex < 0) {
      throw new Error(`Could not detect Lebanon ${language.toUpperCase()} source header row.`);
    }

    const findColumn = (canonicalField: string) => {
      const aliases = headerAliases[canonicalField] ?? [];
      return headerKeys.findIndex((key) => aliases.some((alias) => key.includes(normalizeHeader(alias))));
    };

    const colExternal = findColumn('externalEntityId');
    const colPrimary = findColumn('primaryName');
    const colAliases = findColumn('aliases');
    const colType = findColumn('entityType');
    const colList = findColumn('listName');
    const colPrograms = findColumn('programs');
    const colCountries = findColumn('countries');

    if (colPrimary < 0) {
      throw new Error(`Primary name column was not found in Lebanon ${language.toUpperCase()} source XLS.`);
    }

    const splitValues = (value: string) =>
      value
        .split(/[,;|\/\n]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    const parsedRows: ParsedLebanonEntity[] = [];
    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      const rawRecord = Object.fromEntries(
        headerKeys.map((header, idx) => [header || `col_${idx}`, String(row[idx] ?? '').trim()]),
      );

      const primaryName = String(row[colPrimary] ?? '').trim();
      if (!primaryName) continue;

      const externalEntityId = colExternal >= 0
        ? String(row[colExternal] ?? '').trim() || `${LEBANON_SOURCE_CODE}-${rowIndex}`
        : `${LEBANON_SOURCE_CODE}-${rowIndex}`;

      const aliases = colAliases >= 0 ? splitValues(String(row[colAliases] ?? '')) : [];
      const entityType = colType >= 0 ? String(row[colType] ?? '').trim() || 'Entity' : 'Entity';
      const listName = colList >= 0 ? String(row[colList] ?? '').trim() || LEBANON_LIST_NAME_DEFAULT : LEBANON_LIST_NAME_DEFAULT;
      const programs = colPrograms >= 0 ? splitValues(String(row[colPrograms] ?? '')) : [];
      const countries = colCountries >= 0 ? splitValues(String(row[colCountries] ?? '')) : ['LB'];

      parsedRows.push({
        externalEntityId,
        entityType,
        listName,
        programs,
        countries,
        primaryNameAr: language === 'ar' ? primaryName : undefined,
        primaryNameEn: language === 'en' ? primaryName : undefined,
        aliasesAr: language === 'ar' ? aliases : [],
        aliasesEn: language === 'en' ? aliases : [],
        rawAr: language === 'ar' ? rawRecord : undefined,
        rawEn: language === 'en' ? rawRecord : undefined,
      });
    }

    return {
      rows: parsedRows,
      mapping: {
        worksheet: firstSheetName,
        headerRowIndex,
        columns: {
          externalEntityId: colExternal,
          primaryName: colPrimary,
          aliases: colAliases,
          entityType: colType,
          listName: colList,
          programs: colPrograms,
          countries: colCountries,
        },
        language,
      },
    };
  }

  private mergeLebanonEntities(arRows: ParsedLebanonEntity[], enRows: ParsedLebanonEntity[]) {
    const merged = new Map<string, ParsedLebanonEntity>();

    const upsert = (row: ParsedLebanonEntity, sourceLanguage: LebanonLanguage) => {
      const normalizedAr = row.primaryNameAr ? this.nameNormalization.normalizeArabic(row.primaryNameAr) : '';
      const normalizedEn = row.primaryNameEn ? this.nameNormalization.normalizeLatin(row.primaryNameEn) : '';
      const key = row.externalEntityId || normalizedAr || normalizedEn || `${LEBANON_SOURCE_CODE}-${Math.random().toString(36).slice(2)}`;

      const current = merged.get(key);
      if (!current) {
        merged.set(key, { ...row });
        return;
      }

      merged.set(key, {
        externalEntityId: current.externalEntityId || row.externalEntityId,
        entityType: current.entityType || row.entityType || 'Entity',
        listName: current.listName || row.listName || LEBANON_LIST_NAME_DEFAULT,
        programs: Array.from(new Set([...(current.programs ?? []), ...(row.programs ?? [])])),
        countries: Array.from(new Set([...(current.countries ?? []), ...(row.countries ?? [])])),
        primaryNameAr: current.primaryNameAr ?? row.primaryNameAr,
        primaryNameEn: current.primaryNameEn ?? row.primaryNameEn,
        aliasesAr: Array.from(new Set([...(current.aliasesAr ?? []), ...(row.aliasesAr ?? [])])),
        aliasesEn: Array.from(new Set([...(current.aliasesEn ?? []), ...(row.aliasesEn ?? [])])),
        rawAr: sourceLanguage === 'ar' ? (row.rawAr ?? current.rawAr) : current.rawAr,
        rawEn: sourceLanguage === 'en' ? (row.rawEn ?? current.rawEn) : current.rawEn,
      });
    };

    for (const row of arRows) upsert(row, 'ar');
    for (const row of enRows) upsert(row, 'en');

    return Array.from(merged.values());
  }

  private async syncLebanonDataSourceVersion(
    parsedEntities: Array<{
      externalEntityId: string;
      entityType: string;
      listName: string;
      programs: string[];
      countries: string[];
      primaryNameAr?: string;
      primaryNameEn?: string;
      aliasesAr: string[];
      aliasesEn: string[];
      rawAr?: Record<string, string>;
      rawEn?: Record<string, string>;
    }>,
    fileHash: string,
    importedAt: Date,
  ) {
    const dataSource = await this.prisma.dataSource.upsert({
      where: { code: LEBANON_SOURCE_CODE },
      create: {
        code: LEBANON_SOURCE_CODE,
        name: 'اللائحة الوطنية',
        type: DataSourceType.LOCAL,
        country: 'LB',
        status: 'ACTIVE',
      },
      update: {
        name: 'اللائحة الوطنية',
        type: DataSourceType.LOCAL,
        country: 'LB',
        status: 'ACTIVE',
      },
    });

    await this.prisma.dataSourceVersion.updateMany({
      where: { dataSourceId: dataSource.id, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });

    const version = await this.prisma.dataSourceVersion.create({
      data: {
        dataSourceId: dataSource.id,
        versionLabel: `${LEBANON_SOURCE_CODE}-${importedAt.toISOString().slice(0, 10)}`,
        fileHash,
        importedAt,
        recordCount: parsedEntities.length,
        status: 'ACTIVE',
      },
    });

    await this.prisma.watchlistRecord.deleteMany({ where: { dataSourceId: dataSource.id } });

    const records = parsedEntities.map((entity) => {
      const primaryName = entity.primaryNameAr ?? entity.primaryNameEn ?? '';
      const aliases = Array.from(new Set([...(entity.aliasesAr ?? []), ...(entity.aliasesEn ?? [])]));

      return {
        dataSourceId: dataSource.id,
        versionId: version.id,
        externalReference: entity.externalEntityId,
        entityType: entity.entityType,
        primaryName,
        normalizedName: this.nameNormalization.normalizeLatin(primaryName),
        arabicNormalizedName: entity.primaryNameAr
          ? this.nameNormalization.normalizeArabic(entity.primaryNameAr)
          : this.nameNormalization.normalizeArabic(this.nameNormalization.latinToArabic(primaryName)),
        latinTransliteratedName: entity.primaryNameAr
          ? this.nameNormalization.arabicToLatin(entity.primaryNameAr)
          : this.nameNormalization.arabicToLatin(primaryName),
        aliases,
        normalizedAliases: aliases.map((alias) => this.nameNormalization.normalizeLatin(alias)),
        arabicNormalizedAliases: aliases.map((alias) => this.nameNormalization.normalizeArabic(this.nameNormalization.latinToArabic(alias))),
        dateOfBirth: null,
        nationality: entity.countries[0] ?? 'LB',
        country: entity.countries[0] ?? 'LB',
        documentNumbers: [],
        rawPayload: ({
          listName: entity.listName,
          programs: entity.programs,
          countries: entity.countries,
          primaryNameAr: entity.primaryNameAr ?? null,
          primaryNameEn: entity.primaryNameEn ?? null,
          aliasesAr: entity.aliasesAr,
          aliasesEn: entity.aliasesEn,
          rawArabicRow: entity.rawAr ?? null,
          rawEnglishRow: entity.rawEn ?? null,
          languageCoverage: ['ar', 'en'],
        }) as Prisma.InputJsonValue,
      };
    });

    if (records.length > 0) {
      await this.prisma.watchlistRecord.createMany({ data: records });
    }
  }
}
