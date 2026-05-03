import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BulkScreeningService } from '../bulk-screening/bulk-screening.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScreenDto } from '../screening/dto/screen.dto';
import { ScreeningService } from '../screening/screening.service';
import { DataSourcesService } from '../data-sources/data-sources.service';
import { BulkScreenDto } from '../bulk-screening/dto/bulk-screen.dto';
import { CreateIntegrationKeyDto } from './dto/create-integration-key.dto';

type IntegrationKeyConfig = {
  capabilities: string[];
  allowedDomains: string[];
  allowedIps: string[];
};

const CAPABILITY_PREFIX = 'cap:';
const DOMAIN_PREFIX = 'domain:';
const IP_PREFIX = 'ip:';
const DEFAULT_CAPABILITIES = ['screen', 'bulk-screen', 'status', 'usage'];

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly screeningService: ScreeningService,
    private readonly bulkScreeningService: BulkScreeningService,
    private readonly dataSourcesService: DataSourcesService,
  ) {}

  async createKey(tenantId: string, userId: string | undefined, dto: CreateIntegrationKeyDto) {
    const created = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        keyHash: 'PENDING',
        scopes: this.encodeConfig({
          capabilities: dto.capabilities?.length ? dto.capabilities : DEFAULT_CAPABILITIES,
          allowedDomains: dto.allowedDomains ?? [],
          allowedIps: dto.allowedIps ?? [],
        }),
        status: dto.enabled === false ? 'DISABLED' : 'ACTIVE',
      },
    });

    const rawKey = `${created.id}.${randomBytes(24).toString('hex')}`;
    const keyHash = await argon2.hash(rawKey);
    await this.prisma.apiKey.update({
      where: { id: created.id },
      data: { keyHash },
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'INTEGRATION_KEY_CREATED',
      entityType: 'API_KEY',
      entityId: created.id,
      metadata: {
        name: created.name,
        status: created.status,
      },
    });

    return {
      id: created.id,
      name: created.name,
      status: created.status,
      rawKey,
    };
  }

  async listKeys(tenantId: string) {
    const [keys, usageCounts] = await Promise.all([
      this.prisma.apiKey.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityId'],
        where: {
          tenantId,
          entityType: 'API_KEY',
          action: {
            startsWith: 'INTEGRATION_',
          },
        },
        _count: {
          entityId: true,
        },
      }),
    ]);

    const usageByKey = new Map(usageCounts.map((entry) => [entry.entityId ?? '', entry._count.entityId]));

    return keys.map((key) => {
      const config = this.decodeConfig(key.scopes);
      return {
        id: key.id,
        name: key.name,
        status: key.status,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        usageCount: usageByKey.get(key.id) ?? 0,
        capabilities: config.capabilities,
        allowedDomains: config.allowedDomains,
        allowedIps: config.allowedIps,
      };
    });
  }

  async rotateKey(tenantId: string, userId: string | undefined, keyId: string) {
    const key = await this.requireKeyForTenant(tenantId, keyId);
    const rawKey = `${key.id}.${randomBytes(24).toString('hex')}`;
    const keyHash = await argon2.hash(rawKey);
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { keyHash, lastUsedAt: null },
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'INTEGRATION_KEY_ROTATED',
      entityType: 'API_KEY',
      entityId: key.id,
    });

    return {
      id: key.id,
      rawKey,
    };
  }

  async updateKeyStatus(tenantId: string, userId: string | undefined, keyId: string, status: 'ACTIVE' | 'DISABLED' | 'REVOKED') {
    const key = await this.requireKeyForTenant(tenantId, keyId);
    const updated = await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { status },
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: status === 'REVOKED' ? 'INTEGRATION_KEY_REVOKED' : 'INTEGRATION_KEY_STATUS_CHANGED',
      entityType: 'API_KEY',
      entityId: key.id,
      metadata: {
        status,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  async validateApiKey(rawKey: string, origin?: string, ipAddress?: string, userAgent?: string) {
    const [keyId] = rawKey.split('.', 2);
    if (!keyId) {
      throw new UnauthorizedException('Invalid integration API key format');
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
      include: {
        tenant: true,
      },
    });

    if (!apiKey || apiKey.status !== 'ACTIVE') {
      throw new UnauthorizedException('Integration API key is not active');
    }

    const valid = await argon2.verify(apiKey.keyHash, rawKey);
    if (!valid) {
      throw new UnauthorizedException('Integration API key is invalid');
    }

    const config = this.decodeConfig(apiKey.scopes);
    this.assertOriginAllowed(config.allowedDomains, origin);
    this.assertIpAllowed(config.allowedIps, ipAddress);

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    await this.auditLogsService.log({
      tenantId: apiKey.tenantId,
      userId: null,
      action: 'INTEGRATION_AUTHENTICATED',
      entityType: 'API_KEY',
      entityId: apiKey.id,
      ipAddress,
      userAgent,
      metadata: {
        name: apiKey.name,
      },
    });

    return {
      apiKeyId: apiKey.id,
      tenantId: apiKey.tenantId,
      name: apiKey.name,
      capabilities: config.capabilities,
    };
  }

  assertCapability(actor: { integrationCapabilities?: string[] }, capability: string) {
    if (!actor.integrationCapabilities?.includes(capability)) {
      throw new ForbiddenException(`Integration key is missing capability: ${capability}`);
    }
  }

  async integrationScreen(actor: { tenantId: string; apiKeyId: string }, dto: ScreenDto, ipAddress?: string, userAgent?: string) {
    const result = await this.screeningService.screen(actor.tenantId, actor.apiKeyId, dto, ipAddress, userAgent);
    await this.auditLogsService.log({
      tenantId: actor.tenantId,
      userId: null,
      action: 'INTEGRATION_SCREEN_REQUEST',
      entityType: 'API_KEY',
      entityId: actor.apiKeyId,
      ipAddress,
      userAgent,
      metadata: {
        fullName: dto.fullName,
        sources: dto.sources ?? ['ALL'],
        decision: result.decision,
        usedLocalVersions: result.usedLocalVersions,
      },
    });

    return result;
  }

  async integrationBulkScreen(actor: { tenantId: string; apiKeyId: string }, dto: BulkScreenDto, ipAddress?: string, userAgent?: string) {
    const result = await this.bulkScreeningService.enqueue(actor.tenantId, actor.apiKeyId, dto);
    await this.auditLogsService.log({
      tenantId: actor.tenantId,
      userId: null,
      action: 'INTEGRATION_BULK_SCREEN_REQUEST',
      entityType: 'API_KEY',
      entityId: actor.apiKeyId,
      ipAddress,
      userAgent,
      metadata: {
        recordCount: dto.records.length,
        sources: dto.sources,
        bulkJobId: result.bulkJobId,
      },
    });

    return result;
  }

  async integrationStatus(actor: { tenantId: string; apiKeyId: string }) {
    const sources = await this.dataSourcesService.list();
    const activeSources = sources
      .filter((source) => source.status === 'ACTIVE' && source.currentActiveVersion)
      .map((source) => ({
        code: source.code,
        name: source.name,
        activeVersion: source.currentActiveVersion?.versionLabel ?? null,
        syncHealth: source.syncStatus.syncHealth,
        lastSuccessfulSyncAt: source.syncStatus.lastSuccessfulSyncAt,
      }));

    return {
      tenantId: actor.tenantId,
      apiKeyId: actor.apiKeyId,
      mode: 'LOCAL_VERSIONED_ONLY',
      activeSources,
    };
  }

  async integrationUsage(actor: { tenantId: string; apiKeyId: string }) {
    const count = await this.prisma.auditLog.count({
      where: {
        tenantId: actor.tenantId,
        entityType: 'API_KEY',
        entityId: actor.apiKeyId,
        action: {
          in: ['INTEGRATION_SCREEN_REQUEST', 'INTEGRATION_BULK_SCREEN_REQUEST', 'INTEGRATION_AUTHENTICATED'],
        },
      },
    });

    const apiKey = await this.requireKeyForTenant(actor.tenantId, actor.apiKeyId);
    return {
      apiKeyId: actor.apiKeyId,
      usageCount: count,
      lastUsedAt: apiKey.lastUsedAt,
    };
  }

  private async requireKeyForTenant(tenantId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        tenantId,
      },
    });

    if (!key) {
      throw new BadRequestException('Integration key not found');
    }

    return key;
  }

  private encodeConfig(config: IntegrationKeyConfig) {
    return [
      ...config.capabilities.map((entry) => `${CAPABILITY_PREFIX}${entry}`),
      ...config.allowedDomains.map((entry) => `${DOMAIN_PREFIX}${entry.toLowerCase()}`),
      ...config.allowedIps.map((entry) => `${IP_PREFIX}${entry}`),
    ];
  }

  private decodeConfig(scopes: string[]): IntegrationKeyConfig {
    return scopes.reduce<IntegrationKeyConfig>(
      (accumulator, entry) => {
        if (entry.startsWith(CAPABILITY_PREFIX)) {
          accumulator.capabilities.push(entry.slice(CAPABILITY_PREFIX.length));
        } else if (entry.startsWith(DOMAIN_PREFIX)) {
          accumulator.allowedDomains.push(entry.slice(DOMAIN_PREFIX.length));
        } else if (entry.startsWith(IP_PREFIX)) {
          accumulator.allowedIps.push(entry.slice(IP_PREFIX.length));
        }

        return accumulator;
      },
      {
        capabilities: [],
        allowedDomains: [],
        allowedIps: [],
      },
    );
  }

  private assertOriginAllowed(allowedDomains: string[], origin?: string) {
    if (allowedDomains.length === 0 || !origin) {
      return;
    }

    let host = origin;
    try {
      host = new URL(origin).hostname.toLowerCase();
    } catch {
      host = origin.toLowerCase();
    }

    if (!allowedDomains.some((entry) => host === entry || host.endsWith(`.${entry}`))) {
      throw new ForbiddenException('Origin is not allowed for this integration key');
    }
  }

  private assertIpAllowed(allowedIps: string[], ipAddress?: string) {
    if (allowedIps.length === 0 || !ipAddress) {
      return;
    }

    const normalizedIp = ipAddress.replace('::ffff:', '');
    if (!allowedIps.includes(normalizedIp)) {
      throw new ForbiddenException('IP address is not allowed for this integration key');
    }
  }
}