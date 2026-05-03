import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { CasesController } from '../src/cases/cases.controller';
import { CasesService } from '../src/cases/cases.service';
import { AuditLogsController } from '../src/audit-logs/audit-logs.controller';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';

@Injectable()
class TestJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: req.headers['x-test-user-id'] ?? 'usr_test',
      tenantId: 'ten_test',
      role: req.headers['x-test-role'] ?? UserRole.NOTARY,
    };
    return true;
  }
}

describe('Governance RBAC (e2e)', () => {
  let app: Awaited<ReturnType<typeof Test.createTestingModule>> extends never ? never : any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CasesController, AuditLogsController, HealthController],
      providers: [
        Reflector,
        RolesGuard,
        {
          provide: CasesService,
          useValue: {
            list: async () => [],
            getById: async () => ({ id: 'case_1' }),
            getComplianceTimeline: async () => ({
              caseId: 'case_1',
              timeline: [],
              exportHash: 'x'.repeat(64),
              exportSignature: 'y'.repeat(64),
            }),
            addAction: async () => ({ id: 'act_1' }),
            assignReviewer: async () => ({ id: 'case_1', assignedReviewerId: 'usr_reviewer' }),
            recordCommitteeDecision: async () => ({ id: 'case_1', committeeDecision: 'CLEAR' }),
            reviewMatchDecision: async () => ({ id: 'case_1', reviewerDecision: 'TRUE_MATCH' }),
            updateStatus: async () => ({ id: 'case_1', status: 'ESCALATED_INTERNALLY' }),
            processSicApproval: async () => ({ id: 'case_1', sicSubmissionStatus: 'APPROVED' }),
            generateEvidencePackage: async () => ({ evidencePackageId: 'ev_1', caseId: 'case_1' }),
            getLatestEvidencePackage: async () => ({ id: 'ev_1', caseId: 'case_1' }),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            list: async () => [{ id: 'audit_1' }],
          },
        },
        {
          provide: HealthService,
          useValue: {
            preflight: async () => ({ status: 'ok' }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('unauthorized evidence access returns 403', async () => {
    await request(app.getHttpServer())
      .get('/cases/case_1/evidence-package')
      .set('x-test-role', UserRole.NOTARY)
      .expect(403);
  });

  it('notary cannot generate evidence package', async () => {
    await request(app.getHttpServer())
      .post('/cases/case_1/evidence-package')
      .set('x-test-role', UserRole.NOTARY)
      .expect(403);
  });

  it('compliance officer can generate evidence package', async () => {
    await request(app.getHttpServer())
      .post('/cases/case_1/evidence-package')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .expect(201)
      .expect((res) => {
        expect(res.body.evidencePackageId).toBe('ev_1');
      });
  });

  it('compliance officer can access review queue', async () => {
    await request(app.getHttpServer())
      .get('/cases/review-queue')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .expect(200);
  });

  it('compliance officer can assign reviewer', async () => {
    await request(app.getHttpServer())
      .post('/cases/case_1/assign-reviewer')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .send({ reviewerId: 'usr_reviewer', notes: 'Assigning committee reviewer' })
      .expect(201)
      .expect((res) => {
        expect(res.body.assignedReviewerId).toBe('usr_reviewer');
      });
  });

  it('compliance officer can record committee decision', async () => {
    await request(app.getHttpServer())
      .post('/cases/case_1/committee-decision')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .send({ decision: 'CLEAR', notes: 'Committee approved case' })
      .expect(201)
      .expect((res) => {
        expect(res.body.committeeDecision).toBe('CLEAR');
      });
  });

  it('compliance officer can review match decision', async () => {
    await request(app.getHttpServer())
      .post('/cases/case_1/match-decision-review')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .send({ reviewerDecision: 'TRUE_MATCH', reviewerJustification: 'Identifiers corroborate the machine decision' })
      .expect(201)
      .expect((res) => {
        expect(res.body.reviewerDecision).toBe('TRUE_MATCH');
      });
  });

  it('compliance officer can process SIC approval workflow', async () => {
    await request(app.getHttpServer())
      .post('/cases/case_1/sic-approval')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .send({ approved: true, notes: 'SIC package approved' })
      .expect(201)
      .expect((res) => {
        expect(res.body.sicSubmissionStatus).toBe('APPROVED');
      });
  });

  it('timeline export supports download headers', async () => {
    await request(app.getHttpServer())
      .get('/cases/case_1/compliance-timeline?download=true')
      .set('x-test-role', UserRole.SUPER_ADMIN)
      .expect(200)
      .expect((res) => {
        expect(res.headers['content-disposition']).toContain('case-case_1-timeline.json');
      });
  });

  it('compliance officer cannot export timeline download', async () => {
    await request(app.getHttpServer())
      .get('/cases/case_1/compliance-timeline?download=true')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .expect(403);
  });

  it('audit logs cannot be deleted', async () => {
    await request(app.getHttpServer())
      .delete('/audit-logs/audit_1')
      .set('x-test-role', UserRole.SUPER_ADMIN)
      .expect(405)
      .expect((res) => {
        expect(res.body.message).toContain('cannot be deleted');
      });
  });

  it('admin can access preflight', async () => {
    await request(app.getHttpServer())
      .get('/health/preflight')
      .set('x-test-role', UserRole.SUPER_ADMIN)
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('non-admin cannot access preflight', async () => {
    await request(app.getHttpServer())
      .get('/health/preflight')
      .set('x-test-role', UserRole.COMPLIANCE_OFFICER)
      .expect(403);
  });
});