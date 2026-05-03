import { CanActivate, ExecutionContext, INestApplication, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { DataSourcesController } from '../src/data-sources/data-sources.controller';
import { DataSourcesService } from '../src/data-sources/data-sources.service';

type SourceRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  versions: Array<{
    id: string;
    versionLabel: string;
    fileHash: string;
    importedAt: Date;
    recordCount: number;
    status: string;
  }>;
};

type RecordRow = {
  id: string;
  dataSourceId: string;
  versionId: string;
  primaryName: string;
  normalizedName: string;
  aliases: string[];
  dateOfBirth: string | null;
  nationality: string | null;
  country: string | null;
  documentNumbers: string[];
  externalReference: string | null;
  entityType: string;
  rawPayload: Record<string, unknown>;
  createdAt: Date;
};

function createPrismaStub() {
  const sources: SourceRow[] = [
    {
      id: 'src_legacy_ofac',
      code: 'OFAC',
      name: 'Legacy OFAC',
      status: 'ACTIVE',
      versions: [],
    },
    {
      id: 'src_ofac_sdn',
      code: 'OFAC_SDN',
      name: 'OFAC SDN',
      status: 'ACTIVE',
      versions: [
        {
          id: 'ver_ofac_active',
          versionLabel: 'OFAC-SDN-2025-01',
          fileHash: 'hash-ofac-active',
          importedAt: new Date('2025-01-12T09:00:00.000Z'),
          recordCount: 2,
          status: 'ACTIVE',
        },
      ],
    },
    {
      id: 'src_ofac_consolidated',
      code: 'OFAC_CONSOLIDATED',
      name: 'OFAC Consolidated',
      status: 'ACTIVE',
      versions: [],
    },
    {
      id: 'src_legacy_unsec',
      code: 'UNSEC',
      name: 'Legacy UN',
      status: 'ACTIVE',
      versions: [],
    },
    {
      id: 'src_unsec_consolidated',
      code: 'UNSEC_CONSOLIDATED',
      name: 'UN Consolidated',
      status: 'ACTIVE',
      versions: [
        {
          id: 'ver_un_active',
          versionLabel: 'UN-2025-01',
          fileHash: 'hash-un-active',
          importedAt: new Date('2025-01-10T09:00:00.000Z'),
          recordCount: 1,
          status: 'ACTIVE',
        },
      ],
    },
    {
      id: 'src_local_manual',
      code: 'LOCAL_MANUAL',
      name: 'Local Manual',
      status: 'ACTIVE',
      versions: [],
    },
  ];

  const records: RecordRow[] = [
    {
      id: 'rec_1',
      dataSourceId: 'src_ofac_sdn',
      versionId: 'ver_ofac_active',
      primaryName: 'Mohammed Ali',
      normalizedName: 'mohammed ali',
      aliases: ['Ali Mohammed'],
      dateOfBirth: '1980-01-01',
      nationality: 'LB',
      country: 'LB',
      documentNumbers: ['DOC-123'],
      externalReference: 'OFAC-1',
      entityType: 'PERSON',
      rawPayload: { program: 'SDN', listType: 'Sanctions', notes: 'Primary record' },
      createdAt: new Date('2025-01-12T09:01:00.000Z'),
    },
    {
      id: 'rec_2',
      dataSourceId: 'src_ofac_sdn',
      versionId: 'ver_ofac_active',
      primaryName: 'Test Entity',
      normalizedName: 'test entity',
      aliases: ['Entity Example'],
      dateOfBirth: null,
      nationality: 'US',
      country: 'US',
      documentNumbers: ['DOC-999'],
      externalReference: 'OFAC-2',
      entityType: 'ENTITY',
      rawPayload: { programs: ['NS-CMIC'], listType: 'Consolidated' },
      createdAt: new Date('2025-01-12T09:02:00.000Z'),
    },
  ];

  const dataSource = {
    findMany: jest.fn(async (args?: { where?: { code?: { in?: string[] } } }) => {
      const codes = args?.where?.code?.in;
      const rows = codes ? sources.filter((source) => codes.includes(source.code)) : sources;
      return rows.map((source) => ({ ...source }));
    }),
    findUnique: jest.fn(async (args: { where: { code: string }; select?: Record<string, boolean> }) => {
      const source = sources.find((entry) => entry.code === args.where.code);
      if (!source) {
        return null;
      }

      if (!args.select) {
        return { ...source };
      }

      const selected = Object.entries(args.select).reduce<Record<string, unknown>>((acc, [key, include]) => {
        if (include) {
          acc[key] = (source as Record<string, unknown>)[key];
        }
        return acc;
      }, {});

      return selected;
    }),
    update: jest.fn(async (args: { where: { code: string }; data: { status: string } }) => {
      const source = sources.find((entry) => entry.code === args.where.code)!;
      source.status = args.data.status;
      return { ...source };
    }),
  };

  const watchlistRecord = {
    findMany: jest.fn(
      async (args: {
        where: {
          dataSourceId: string;
          nationality?: { equals: string };
          entityType?: { equals: string };
          documentNumbers?: { has: string };
          versionId?: string;
        };
      }) => {
        return records
          .filter((record) => record.dataSourceId === args.where.dataSourceId)
          .filter((record) => !args.where.nationality || record.nationality?.toLowerCase() === args.where.nationality.equals.toLowerCase())
          .filter((record) => !args.where.entityType || record.entityType.toLowerCase() === args.where.entityType.equals.toLowerCase())
          .filter((record) => !args.where.documentNumbers || record.documentNumbers.includes(args.where.documentNumbers.has))
          .filter((record) => !args.where.versionId || record.versionId === args.where.versionId)
          .map((record) => {
            const source = sources.find((entry) => entry.id === record.dataSourceId)!;
            const version = source.versions.find((entry) => entry.id === record.versionId)!;
            return {
              ...record,
              dataSource: {
                code: source.code,
                name: source.name,
              },
              version,
            };
          });
      },
    ),
    findFirst: jest.fn(async (args: { where: { id: string; dataSourceId: string } }) => {
      const record = records.find((entry) => entry.id === args.where.id && entry.dataSourceId === args.where.dataSourceId);
      if (!record) {
        return null;
      }

      const source = sources.find((entry) => entry.id === record.dataSourceId)!;
      const version = source.versions.find((entry) => entry.id === record.versionId)!;

      return {
        ...record,
        dataSource: {
          code: source.code,
          name: source.name,
        },
        version,
      };
    }),
  };

  return {
    prisma: {
      dataSource,
      watchlistRecord,
    },
  };
}

@Injectable()
class HeaderRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: 'usr_test',
      tenantId: 'ten_test',
      role: String(req.headers['x-test-role'] ?? UserRole.SUPER_ADMIN),
    };
    return true;
  }
}

describe('Data source records service', () => {
  it('hides legacy duplicate rows from list()', async () => {
    const { prisma } = createPrismaStub();
    const auditLogsService = { log: jest.fn(async () => ({ id: 'audit_1' })) };
    const service = new DataSourcesService(prisma as never, auditLogsService as never);

    const sources = await service.list();

    expect(sources.map((entry) => entry.code)).toEqual([
      'OFAC_SDN',
      'OFAC_CONSOLIDATED',
      'UNSEC_CONSOLIDATED',
      'LOCAL_MANUAL',
    ]);
  });

  it('resolves legacy aliases and filters records by alias/program', async () => {
    const { prisma } = createPrismaStub();
    const auditLogsService = { log: jest.fn(async () => ({ id: 'audit_1' })) };
    const service = new DataSourcesService(prisma as never, auditLogsService as never);

    const response = await service.records(
      'OFAC',
      {
        alias: 'entity',
        program: 'ns-cmic',
        page: 1,
        limit: 25,
      },
      'ten_test',
      'usr_test',
    );

    expect(response.sourceCode).toBe('OFAC_SDN');
    expect(response.total).toBe(1);
    expect(response.records[0]).toMatchObject({
      id: 'rec_2',
      primaryName: 'Test Entity',
      programOrListType: 'NS-CMIC | Consolidated',
      versionId: 'ver_ofac_active',
    });
    expect(auditLogsService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATA_SOURCE_RECORD_SEARCHED' }),
    );
  });

  it('returns record detail with version file hash', async () => {
    const { prisma } = createPrismaStub();
    const auditLogsService = { log: jest.fn(async () => ({ id: 'audit_1' })) };
    const service = new DataSourcesService(prisma as never, auditLogsService as never);

    const detail = await service.recordDetail('OFAC_SDN', 'rec_1', 'ten_test', 'usr_test');

    expect(detail).toMatchObject({
      id: 'rec_1',
      sourceCode: 'OFAC_SDN',
      versionId: 'ver_ofac_active',
      versionFileHash: 'hash-ofac-active',
      rawPayload: { program: 'SDN', listType: 'Sanctions', notes: 'Primary record' },
    });
    expect(auditLogsService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATA_SOURCE_RECORD_DETAIL_VIEWED' }),
    );
  });

  it('updates canonical source status through enable/disable toggles', async () => {
    const { prisma } = createPrismaStub();
    const auditLogsService = { log: jest.fn(async () => ({ id: 'audit_1' })) };
    const service = new DataSourcesService(prisma as never, auditLogsService as never);

    const disabled = await service.disableSource('OFAC', 'ten_test', 'usr_test');
    const enabled = await service.enableSource('OFAC_SDN', 'ten_test', 'usr_test');

    expect(disabled).toEqual({ status: 'DISABLED', sourceCode: 'OFAC_SDN' });
    expect(enabled).toEqual({ status: 'ACTIVE', sourceCode: 'OFAC_SDN' });
    expect(auditLogsService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATA_SOURCE_DISABLED' }),
    );
    expect(auditLogsService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATA_SOURCE_ENABLED' }),
    );
  });
});

describe('Data source records RBAC (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DataSourcesController],
      providers: [
        Reflector,
        RolesGuard,
        {
          provide: DataSourcesService,
          useValue: {
            list: async () => [],
            versions: async () => [],
            ingestionRuns: async () => [],
            report: async () => ({}),
            records: async () => ({ total: 0, page: 1, limit: 25, records: [] }),
            recordDetail: async () => ({ id: 'rec_1' }),
            activateVersion: async () => ({ status: 'ACTIVE' }),
            archiveVersion: async () => ({ status: 'ARCHIVED' }),
            ingestUpload: async () => ({}),
            syncOfficialSources: async () => ({ synchronized: 0, results: [] }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderRoleGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows COMPLIANCE_OFFICER to read records', async () => {
    await request(app.getHttpServer())
      .get('/data-sources/OFAC_SDN/records')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .expect(200);
  });

  it('blocks NOTARY from records browser routes', async () => {
    await request(app.getHttpServer())
      .get('/data-sources/OFAC_SDN/records')
      .set('x-test-role', UserRole.NOTARY)
      .expect(403);
  });

  it('blocks COMPLIANCE_OFFICER from activate/archive routes', async () => {
    await request(app.getHttpServer())
      .post('/data-sources/OFAC_SDN/versions/ver_ofac_active/activate')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .expect(403);

    await request(app.getHttpServer())
      .post('/data-sources/OFAC_SDN/versions/ver_ofac_active/archive')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .expect(403);
  });
});