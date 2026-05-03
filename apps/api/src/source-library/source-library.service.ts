import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SourceLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async listImportedLists(sourceCode: string) {
    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: sourceCode } });
    if (!source) throw new NotFoundException(`Source not found: ${sourceCode}`);
    return this.prisma.sourceImportedList.findMany({
      where: { sourceId: source.id },
      orderBy: { lastImportedAt: 'desc' },
    });
  }

  async previewList(sourceCode: string, listName: string, take = 25, skip = 0) {
    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: sourceCode } });
    if (!source) throw new NotFoundException(`Source not found: ${sourceCode}`);

    const [total, entities] = await this.prisma.$transaction([
      this.prisma.sourceEntity.count({ where: { sourceId: source.id, listName } }),
      this.prisma.sourceEntity.findMany({
        where: { sourceId: source.id, listName },
        include: { names: { take: 5 } },
        orderBy: { importedAt: 'desc' },
        take,
        skip,
      }),
    ]);

    return { total, take, skip, entities };
  }

  async getEntity(sourceCode: string, externalEntityId: string) {
    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: sourceCode } });
    if (!source) throw new NotFoundException(`Source not found: ${sourceCode}`);

    const entity = await this.prisma.sourceEntity.findFirst({
      where: { sourceId: source.id, externalEntityId },
      include: { names: { include: { variants: { take: 20 } } } },
    });
    if (!entity) throw new NotFoundException(`Entity not found: ${externalEntityId}`);
    return entity;
  }

  async listSourceFiles(sourceCode: string) {
    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: sourceCode } });
    if (!source) throw new NotFoundException(`Source not found: ${sourceCode}`);
    return this.prisma.sourceFile.findMany({
      where: { sourceId: source.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getSourceStats(sourceCode: string) {
    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: sourceCode } });
    if (!source) throw new NotFoundException(`Source not found: ${sourceCode}`);

    const [entityCount, nameCount, listCount] = await this.prisma.$transaction([
      this.prisma.sourceEntity.count({ where: { sourceId: source.id } }),
      this.prisma.sourceName.count({ where: { sourceId: source.id } }),
      this.prisma.sourceImportedList.count({ where: { sourceId: source.id } }),
    ]);

    return {
      sourceCode,
      entityCount,
      nameCount,
      listCount,
      localCopyAvailable: source.localCopyAvailable,
      lastSuccessfulSyncAt: source.lastSuccessfulSyncAt,
    };
  }

  /** Returns sources that have a local copy available for offline screening. */
  async getAvailableSources() {
    return this.prisma.kydexDataSource.findMany({
      where: { localCopyAvailable: true },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        localCopyAvailable: true,
        lastSuccessfulSyncAt: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Arabic/bilingual coverage statistics for a specific list.
   * NOTE: normalizedArabic values are machine-transliterated — not certified legal translations.
   */
  async getTranslationStatus(sourceCode: string, listName: string) {
    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: sourceCode } });
    if (!source) throw new NotFoundException(`Source not found: ${sourceCode}`);

    const [totalEntities, entitiesWithArabic, totalNames, namesWithArabic] =
      await this.prisma.$transaction([
        this.prisma.sourceEntity.count({ where: { sourceId: source.id, listName } }),
        this.prisma.sourceEntity.count({
          where: { sourceId: source.id, listName, normalizedArabic: { not: null } },
        }),
        this.prisma.sourceName.count({
          where: { sourceId: source.id, entity: { listName } },
        }),
        this.prisma.sourceName.count({
          where: { sourceId: source.id, normalizedArabic: { not: null }, entity: { listName } },
        }),
      ]);

    return {
      sourceCode,
      listName,
      totalEntities,
      entitiesWithArabicNormalized: entitiesWithArabic,
      entityArabicCoveragePercent:
        totalEntities > 0 ? Math.round((entitiesWithArabic / totalEntities) * 100) : 0,
      totalNames,
      namesWithArabicNormalized: namesWithArabic,
      nameArabicCoveragePercent:
        totalNames > 0 ? Math.round((namesWithArabic / totalNames) * 100) : 0,
      disclaimer:
        'Arabic values are machine-transliterated/normalized from source records. ' +
        'These are NOT certified legal translations.',
    };
  }

  /**
   * Bulk export of all entities in a list (max 10 000 rows).
   * Intended for client-side file download (CSV or JSON). Auth required.
   */
  async downloadList(sourceCode: string, listName: string) {
    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: sourceCode } });
    if (!source) throw new NotFoundException(`Source not found: ${sourceCode}`);

    const entities = await this.prisma.sourceEntity.findMany({
      where: { sourceId: source.id, listName },
      include: {
        names: {
          take: 10,
          select: {
            id: true,
            originalName: true,
            isPrimary: true,
            isAlias: true,
            aliasType: true,
            normalizedArabic: true,
            language: true,
          },
        },
      },
      orderBy: { importedAt: 'desc' },
      take: 10000,
    });

    return {
      sourceCode,
      listName,
      exportedAt: new Date().toISOString(),
      count: entities.length,
      disclaimer:
        'Arabic name values are machine-transliterated/normalized from source records. ' +
        'These are NOT certified legal translations.',
      entities,
    };
  }
}
