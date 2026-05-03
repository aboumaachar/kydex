import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import { PrismaService } from '../prisma/prisma.service';
import { OFAC_SYNC_FILES } from './ofac.constants';
import { OfacClientService } from './ofac.client';
import { OfacParserService } from './ofac.parser';
import { OfacParsedEntity } from './ofac.types';
import { normalizeName } from './utils/ofac-normalizer';

@Injectable()
export class OfacService {
  private readonly logger = new Logger(OfacService.name);
  private syncInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: OfacClientService,
    private readonly parser: OfacParserService,
  ) {}

  async health(): Promise<{ alive: boolean; checkedAt: string }> {
    return {
      alive: await this.client.alive(),
      checkedAt: new Date().toISOString(),
    };
  }

  async lists(): Promise<string[]> {
    return this.client.getSanctionsLists();
  }

  async programs(): Promise<string[]> {
    return this.client.getSanctionsPrograms();
  }

  async syncStatus(): Promise<unknown> {
    const latest = await this.prisma.ofacSyncRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    const entityCount = await this.prisma.ofacEntity.count();
    const nameCount = await this.prisma.ofacName.count();

    return {
      syncInProgress: this.syncInProgress,
      latest,
      entityCount,
      nameCount,
    };
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledSync(): Promise<void> {
    try {
      await this.sync({ mode: 'scheduled' });
    } catch (error) {
      this.logger.error(`Scheduled OFAC sync failed: ${(error as Error).message}`);
    }
  }

  async sync(params?: { files?: string[]; force?: boolean; mode?: 'manual' | 'scheduled' | 'startup' }) {
    if (this.syncInProgress && !params?.force) {
      return { status: 'already_running' };
    }

    this.syncInProgress = true;
    const files = params?.files?.length ? params.files : OFAC_SYNC_FILES;

    const syncRun = await this.prisma.ofacSyncRun.create({
      data: {
        mode: params?.mode ?? 'manual',
        status: 'running',
        source: 'OFAC_SLS',
        files,
        startedAt: new Date(),
      },
    });

    let importedEntities = 0;
    let importedNames = 0;

    try {
      for (const file of files) {
        this.logger.log(`Downloading OFAC file ${file}`);
        const xml = await this.client.downloadFile(file);
        const parsedEntities = this.parser.parseEntitiesXml(
          xml,
          file.includes('CONS') ? 'Consolidated List' : 'SDN List',
        );

        this.logger.log(`Parsed ${parsedEntities.length} OFAC entities from ${file}`);

        for (let index = 0; index < parsedEntities.length; index += 1) {
          const entity = parsedEntities[index];
          if (!entity) {
            continue;
          }

          const result = await this.upsertEntity(entity);
          importedEntities += result.entityImported ? 1 : 0;
          importedNames += result.nameCount;

          // Release processed entity payloads so large SDN runs do not retain the full parsed tree.
          parsedEntities[index] = undefined as unknown as OfacParsedEntity;

          if ((index + 1) % 250 === 0) {
            this.logger.log(
              `Imported ${index + 1}/${parsedEntities.length} entities from ${file}`,
            );
            await waitForImmediate();
          }
        }

        parsedEntities.length = 0;
      }

      const completed = await this.prisma.ofacSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'completed',
          finishedAt: new Date(),
          importedEntities,
          importedNames,
        },
      });

      return {
        status: 'completed',
        syncRun: completed,
        importedEntities,
        importedNames,
      };
    } catch (error) {
      await this.prisma.ofacSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage: (error as Error).message,
        },
      });

      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async upsertEntity(entity: OfacParsedEntity): Promise<{ entityImported: boolean; nameCount: number }> {
    const primaryName = entity.names.find((name) => name.isPrimary)?.fullName ?? entity.names[0]?.fullName ?? '';

    const saved = await this.prisma.ofacEntity.upsert({
      where: { ofacEntityId: entity.ofacEntityId },
      create: {
        ofacEntityId: entity.ofacEntityId,
        identityId: entity.identityId,
        entityType: entity.entityType,
        primaryName,
        normalizedPrimaryName: normalizeName(primaryName),
        listName: entity.listName,
        programs: entity.programs,
        sanctionsTypes: entity.sanctionsTypes,
        legalAuthorities: entity.legalAuthorities,
        rawJson: entity.raw as object,
        lastSyncedAt: new Date(),
      },
      update: {
        identityId: entity.identityId,
        entityType: entity.entityType,
        primaryName,
        normalizedPrimaryName: normalizeName(primaryName),
        listName: entity.listName,
        programs: entity.programs,
        sanctionsTypes: entity.sanctionsTypes,
        legalAuthorities: entity.legalAuthorities,
        rawJson: entity.raw as object,
        lastSyncedAt: new Date(),
      },
    });

    await this.prisma.ofacName.deleteMany({
      where: { entityId: saved.id },
    });

    const createdNames = await Promise.all(
      entity.names.map((name) =>
        this.prisma.ofacName.create({
          data: {
            entityId: saved.id,
            fullName: name.fullName,
            normalizedName: normalizeName(name.fullName),
            firstName: name.firstName,
            middleName: name.middleName,
            lastName: name.lastName,
            isPrimary: name.isPrimary,
            isLowQuality: Boolean(name.isLowQuality),
            aliasType: name.aliasType,
          },
        }),
      ),
    );

    await this.prisma.ofacAddress.deleteMany({
      where: { entityId: saved.id },
    });

    if (entity.addresses.length) {
      await this.prisma.ofacAddress.createMany({
        data: entity.addresses.map((address) => ({
          entityId: saved.id,
          rawJson: address as Prisma.InputJsonValue,
        })),
      });
    }

    await this.prisma.ofacFeature.deleteMany({
      where: { entityId: saved.id },
    });

    if (entity.features.length) {
      await this.prisma.ofacFeature.createMany({
        data: entity.features.map((feature) => ({
          entityId: saved.id,
          type: String((feature.type as { '#text'?: string } | undefined)?.['#text'] ?? ''),
          value: JSON.stringify(feature),
          rawJson: feature as Prisma.InputJsonValue,
        })),
      });
    }

    return {
      entityImported: true,
      nameCount: createdNames.length,
    };
  }
}