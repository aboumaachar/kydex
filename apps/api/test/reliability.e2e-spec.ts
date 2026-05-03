import { INestApplication, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { DataSourcesController } from '../src/data-sources/data-sources.controller';
import { DataSourcesService } from '../src/data-sources/data-sources.service';
import { ScreeningController } from '../src/screening/screening.controller';
import { ScreeningService } from '../src/screening/screening.service';
import { CasesController } from '../src/cases/cases.controller';
import { CasesService } from '../src/cases/cases.service';
import { BulkScreeningController } from '../src/bulk-screening/bulk-screening.controller';
import { BulkScreeningService } from '../src/bulk-screening/bulk-screening.service';

@Injectable()
class AllowGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: 'usr_test',
      tenantId: 'ten_test',
      role: 'SUPER_ADMIN',
    };
    return true;
  }
}

describe('Reliability flows (e2e)', () => {
  let app: INestApplication;
  const loginCredential = process.env.KYDEX_E2E_CREDENTIAL ?? 'e2e-credential-value';

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [
        AuthController,
        DataSourcesController,
        ScreeningController,
        CasesController,
        BulkScreeningController,
      ],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: async () => ({
              accessToken: 'token',
              tokenType: 'Bearer',
              user: {
                id: 'usr_test',
                tenantId: 'ten_test',
                fullName: 'Test User',
                role: 'SUPER_ADMIN',
                email: 'admin@test.local',
              },
            }),
          },
        },
        {
          provide: DataSourcesService,
          useValue: {
            list: async () => [],
            versions: async () => [],
            ingestionRuns: async () => [],
            ingestUpload: async () => ({
              versionId: 'ver_1',
              sourceCode: 'OFAC',
              totalRows: 3,
              insertedRecords: 2,
              rejectedRows: 1,
              duplicateRows: 0,
              validationErrors: [],
              rejectedReport: [],
            }),
          },
        },
        {
          provide: ScreeningService,
          useValue: {
            screen: async () => ({
              queryId: 'qry_1',
              riskLevel: 'HIGH',
              highestScore: 0.81,
              requiresEscalation: true,
              caseId: 'case_1',
              caseStatus: 'NEEDS_REVIEW',
              caseLink: '/cases/case_1',
              matches: [],
            }),
            getAuditTrail: async () => ({ query: {}, auditLogs: [] }),
          },
        },
        {
          provide: CasesService,
          useValue: {
            list: async () => [{ id: 'case_1', status: 'NEEDS_REVIEW', riskLevel: 'HIGH' }],
            getById: async () => ({ id: 'case_1' }),
            addAction: async () => ({ id: 'act_1' }),
            updateStatus: async () => ({ id: 'case_1', status: 'ESCALATED_INTERNALLY' }),
            generateEvidencePackage: async () => ({ evidencePackageId: 'ev_1', caseId: 'case_1' }),
            getLatestEvidencePackage: async () => ({ id: 'ev_1', caseId: 'case_1' }),
          },
        },
        {
          provide: BulkScreeningService,
          useValue: {
            enqueue: async () => ({ bulkJobId: 'job_1', status: 'QUEUED' }),
            getStatus: async () => ({
              bulkJobId: 'job_1',
              status: 'COMPLETED',
              progress: 100,
              failedReason: null,
              result: { total: 1, results: [] },
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowGuard);

    const moduleRef = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.local', password: loginCredential })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
      });
  });

  it('POST /data-sources/upload', async () => {
    await request(app.getHttpServer())
      .post('/data-sources/upload')
      .field('code', 'OFAC')
      .field('name', 'OFAC SDN')
      .field('type', 'OFAC')
      .attach('file', Buffer.from(String.raw`name
    Mohammad Ali
    `), 'watchlist.csv')
      .expect(201)
      .expect((res) => {
        expect(res.body.versionId).toBe('ver_1');
      });
  });

  it('POST /screen creates escalated response', async () => {
    await request(app.getHttpServer())
      .post('/screen')
      .send({ fullName: 'Mohammad Ali', sources: ['OFAC'] })
      .expect(201)
      .expect((res) => {
        expect(res.body.caseId).toBe('case_1');
      });
  });

  it('GET /cases returns case list', async () => {
    await request(app.getHttpServer())
      .get('/cases')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('POST /cases/:id/evidence-package', async () => {
    await request(app.getHttpServer())
      .post('/cases/case_1/evidence-package')
      .expect(201)
      .expect((res) => {
        expect(res.body.evidencePackageId).toBe('ev_1');
      });
  });

  it('POST /bulk-screen and GET /bulk-screen/:jobId', async () => {
    await request(app.getHttpServer())
      .post('/bulk-screen')
      .send({ records: [{ fullName: 'Mohammad Ali' }], sources: ['OFAC'] })
      .expect(201)
      .expect((res) => {
        expect(res.body.bulkJobId).toBe('job_1');
      });

    await request(app.getHttpServer())
      .get('/bulk-screen/job_1')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('COMPLETED');
      });
  });
});
