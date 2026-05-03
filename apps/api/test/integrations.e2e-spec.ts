import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { BulkScreeningService } from '../src/bulk-screening/bulk-screening.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { DataSourcesService } from '../src/data-sources/data-sources.service';
import { IntegrationApiKeyGuard } from '../src/integrations/integration-api-key.guard';
import { IntegrationsController } from '../src/integrations/integrations.controller';
import { IntegrationsService } from '../src/integrations/integrations.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ScreeningService } from '../src/screening/screening.service';

describe('Integrations API (e2e)', () => {
  let app: INestApplication;
  let auditLogCalls: Array<Record<string, unknown>>;
  let activeRawKey: string;

  beforeAll(async () => {
    const activeId = 'api_active';
    const revokedId = 'api_revoked';
    activeRawKey = `${activeId}.secret-active`;
    const revokedRawKey = `${revokedId}.secret-revoked`;

    const activeHash = await argon2.hash(activeRawKey);
    const revokedHash = await argon2.hash(revokedRawKey);

    const apiKeys = new Map([
      [
        activeId,
        {
          id: activeId,
          tenantId: 'ten_test',
          tenant: { id: 'ten_test', name: 'Test Tenant' },
          name: 'Active integration key',
          keyHash: activeHash,
          scopes: ['cap:screen', 'cap:status', 'cap:usage'],
          status: 'ACTIVE',
          lastUsedAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      [
        revokedId,
        {
          id: revokedId,
          tenantId: 'ten_test',
          tenant: { id: 'ten_test', name: 'Test Tenant' },
          name: 'Revoked integration key',
          keyHash: revokedHash,
          scopes: ['cap:screen'],
          status: 'REVOKED',
          lastUsedAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    ]);

    auditLogCalls = [];

    const moduleRef = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        IntegrationsService,
        IntegrationApiKeyGuard,
        RolesGuard,
        {
          provide: PrismaService,
          useValue: {
            apiKey: {
              findUnique: async ({ where }: { where: { id: string } }) => apiKeys.get(where.id) ?? null,
              findFirst: async ({ where }: { where: { id: string; tenantId: string } }) => {
                const key = apiKeys.get(where.id);
                return key?.tenantId === where.tenantId ? key : null;
              },
              update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                const current = apiKeys.get(where.id);
                if (!current) {
                  return null;
                }

                const next = {
                  ...current,
                  ...data,
                };
                apiKeys.set(where.id, next);
                return next;
              },
              findMany: async () => Array.from(apiKeys.values()),
              create: async () => {
                throw new Error('not implemented');
              },
            },
            auditLog: {
              count: async () => 2,
              groupBy: async () => [],
            },
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            log: async (entry: Record<string, unknown>) => {
              auditLogCalls.push(entry);
              return entry;
            },
          },
        },
        {
          provide: ScreeningService,
          useValue: {
            screen: async () => ({
              queryId: 'qry_1',
              riskLevel: 'LOW',
              highestScore: 0.12,
              classification: 'NO_MATCH',
              decision: 'NO_MATCH',
              decisionConfidence: 0.98,
              reasonSummary: 'No local versioned hit found.',
              recommendedAction: 'ALLOW',
              supportingFactors: [],
              weakeningFactors: [],
              requiresEscalation: false,
              matches: [],
              searchedSources: ['OFAC_SDN'],
              usedLocalVersions: [
                {
                  sourceCode: 'OFAC_SDN',
                  versionId: 'ver_ofac_1',
                  versionLabel: 'OFAC_SDN_2026-01-01',
                  importedAt: '2026-01-01T00:00:00.000Z',
                },
              ],
              audit: {
                screenedAt: '2026-01-01T00:00:00.000Z',
                sourcesUsed: ['OFAC_SDN'],
              },
            }),
          },
        },
        {
          provide: BulkScreeningService,
          useValue: {
            enqueue: async () => ({ bulkJobId: 'job_1', status: 'QUEUED' }),
          },
        },
        {
          provide: DataSourcesService,
          useValue: {
            list: async () => [],
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('screens through the integration endpoint and returns usedLocalVersions', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/screen')
      .set('x-api-key', activeRawKey)
      .send({
        fullName: 'Mohammad Ali',
        sources: ['OFAC_SDN'],
      })
      .expect(201);

    expect(response.body.queryId).toBe('qry_1');
    expect(response.body.usedLocalVersions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceCode: 'OFAC_SDN',
          versionLabel: 'OFAC_SDN_2026-01-01',
        }),
      ]),
    );
    expect(auditLogCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'INTEGRATION_AUTHENTICATED',
          entityId: 'api_active',
        }),
        expect.objectContaining({
          action: 'INTEGRATION_SCREEN_REQUEST',
          entityId: 'api_active',
        }),
      ]),
    );
  });

  it('rejects revoked integration keys', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/integrations/screen')
      .set('x-api-key', 'api_revoked.secret-revoked')
      .send({
        fullName: 'Mohammad Ali',
        sources: ['OFAC_SDN'],
      })
      .expect(401);
  });
});