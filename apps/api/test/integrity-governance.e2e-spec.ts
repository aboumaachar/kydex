import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CasePriority, CaseStatus, MatchDecision, MatchRecommendedAction, RiskLevel, TenantType, UserRole } from '@prisma/client';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { CasesService } from '../src/cases/cases.service';

type MockAuditLog = {
  id: string;
  chainScope: string;
  previousHash: string | null;
  entryHash: string | null;
  tenantId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
};

describe('Audit chain integrity', () => {
  it('creates hash-chained audit entries per scope', async () => {
    const rows: MockAuditLog[] = [];

    const prisma = {
      auditLog: {
        findFirst: jest.fn(async (args: { where: { chainScope: string } }) => {
          const scoped = rows
            .filter((row) => row.chainScope === args.where.chainScope)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return scoped[0]
            ? {
                entryHash: scoped[0].entryHash,
              }
            : null;
        }),
        create: jest.fn(async (args: { data: Omit<MockAuditLog, 'id'> }) => {
          const row: MockAuditLog = {
            id: `audit_${rows.length + 1}`,
            ...args.data,
          };
          rows.push(row);
          return row;
        }),
      },
    };

    const service = new AuditLogsService(prisma as never);

    const first = await service.log({
      tenantId: 'ten_1',
      userId: 'usr_1',
      action: 'SCREEN_QUERY',
      entityType: 'SCREENING_QUERY',
      entityId: 'qry_1',
    });

    const second = await service.log({
      tenantId: 'ten_1',
      userId: 'usr_1',
      action: 'CASE_CREATED',
      entityType: 'COMPLIANCE_CASE',
      entityId: 'case_1',
    });

    expect(first.entryHash).toBeTruthy();
    expect(first.previousHash).toBeNull();
    expect(second.entryHash).toBeTruthy();
    expect(second.previousHash).toBe(first.entryHash);
    expect(second.chainScope).toBe('ten_1');
  });
});

describe('Case lifecycle governance integrity', () => {
  const makeGovernedCase = (status: CaseStatus) => ({
    id: 'case_1',
    tenantId: 'ten_1',
    screeningQueryId: 'qry_1',
    status,
    riskLevel: RiskLevel.HIGH,
    priority: CasePriority.HIGH,
    priorityRaisedAt: new Date('2026-01-01T00:00:00.000Z'),
    slaTargetAt: new Date('2026-01-02T00:00:00.000Z'),
    slaBreachedAt: null as Date | null,
    slaAlertedAt: null as Date | null,
    lockVersion: 0,
    assignedReviewerId: null as string | null,
    reviewerLockedById: null as string | null,
    reviewerLockAcquiredAt: null as Date | null,
    reviewerLockExpiresAt: null as Date | null,
    committeeDecision: null as string | null,
    decisionNotes: null as string | null,
    originalDecision: MatchDecision.POSSIBLE_MATCH,
    reviewerDecision: null as MatchDecision | null,
    reviewerJustification: null as string | null,
    reviewedAt: null as Date | null,
    sicSubmissionStatus: null as string | null,
    finalAuthorityUserId: null as string | null,
    finalAuthorityRole: null as UserRole | null,
    finalAuthoritySignedAt: null as Date | null,
    finalAuthoritySignatureHash: null as string | null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    closedAt: null as Date | null,
    tenant: {
      id: 'ten_1',
      name: 'Council One',
      country: 'LB',
      type: TenantType.COUNCIL,
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    screeningQuery: {
      id: 'qry_1',
      tenantId: 'ten_1',
      userId: 'usr_1',
      fullName: 'Mohammed Ali',
      normalizedName: 'mohammed ali',
      dateOfBirth: null,
      nationality: null,
      documentNumber: null,
      transactionType: null,
      sourcesUsed: ['OFAC'],
      highestScore: 0.91,
      riskLevel: RiskLevel.HIGH,
      matchDecision: MatchDecision.POSSIBLE_MATCH,
      decisionConfidence: 0.78,
      reasonSummary: 'High name similarity but identifiers are incomplete.',
      recommendedAction: MatchRecommendedAction.ESCALATE_FOR_REVIEW,
      supportingFactors: [{ factor: 'NAME_SIMILARITY', weight: 0.34 }],
      weakeningFactors: [{ factor: 'MISSING_DOB', weight: -0.1 }],
      clientReference: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ipAddress: null,
      matches: [],
    },
    actions: [],
  });

  it('blocks invalid status transitions via matrix', async () => {
    let currentCase = makeGovernedCase(CaseStatus.CLOSED);

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
        update: jest.fn(async (args: { data: Partial<typeof currentCase> }) => {
          currentCase = {
            ...currentCase,
            ...args.data,
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          };
          return currentCase;
        }),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);

    await expect(
      service.updateStatus(
        'case_1',
        { id: 'usr_admin', role: UserRole.SUPER_ADMIN, tenantId: 'ten_1' },
        CaseStatus.NEEDS_REVIEW,
        'attempt reopen',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires reviewer justification for clearance', async () => {
    let currentCase = makeGovernedCase(CaseStatus.NEEDS_REVIEW);

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
        update: jest.fn(async (args: { data: Partial<typeof currentCase> }) => {
          currentCase = {
            ...currentCase,
            ...args.data,
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          };
          return currentCase;
        }),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);

    await expect(
      service.updateStatus(
        'case_1',
        { id: 'usr_comp', role: UserRole.COMPLIANCE_OFFICER, tenantId: 'ten_1' },
        CaseStatus.CLEARED,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('detects evidence package tampering using immutable hash', async () => {
    const currentCase = makeGovernedCase(CaseStatus.SIC_PACKAGE_PREPARED);

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => ({
          id: 'ev_1',
          caseId: 'case_1',
          packageHash: 'deadbeef',
          payload: { changed: true },
          generatedBy: 'usr_comp',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);

    await expect(
      service.getLatestEvidencePackage('case_1', {
        id: 'usr_comp',
        role: UserRole.COMPLIANCE_OFFICER,
        tenantId: 'ten_1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks conflicting governed action when reviewer lock is active', async () => {
    const currentCase = {
      ...makeGovernedCase(CaseStatus.NEEDS_REVIEW),
      reviewerLockedById: 'usr_other',
      reviewerLockAcquiredAt: new Date('2026-01-01T00:00:00.000Z'),
      reviewerLockExpiresAt: new Date('2099-01-01T00:30:00.000Z'),
    };

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);

    await expect(
      service.updateStatus(
        'case_1',
        { id: 'usr_comp', role: UserRole.COMPLIANCE_OFFICER, tenantId: 'ten_1' },
        CaseStatus.ESCALATED_INTERNALLY,
        'reviewing case',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns HMAC signed export and stamps final authority on timeline export', async () => {
    process.env.EXPORT_HMAC_SECRET = 'unit-test-signing-secret';
    let currentCase = makeGovernedCase(CaseStatus.SIC_PACKAGE_PREPARED);

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
        update: jest.fn(async (args: { data: Partial<typeof currentCase> }) => {
          currentCase = {
            ...currentCase,
            ...args.data,
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          };
          return currentCase;
        }),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);

    const timeline = await service.getComplianceTimeline(
      'case_1',
      {
        id: 'usr_admin',
        role: UserRole.SUPER_ADMIN,
        tenantId: 'ten_1',
      },
      { exportRequested: true },
    );

    expect(timeline.exportHash).toHaveLength(64);
    expect(timeline.exportSignature).toHaveLength(64);
    expect(currentCase.finalAuthorityUserId).toBe('usr_admin');
    expect(currentCase.finalAuthorityRole).toBe(UserRole.SUPER_ADMIN);
  });

  it('requires justification for match decision override', async () => {
    const currentCase = makeGovernedCase(CaseStatus.NEEDS_REVIEW);

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);

    await expect(
      service.reviewMatchDecision(
        'case_1',
        { id: 'usr_comp', role: UserRole.COMPLIANCE_OFFICER, tenantId: 'ten_1' },
        MatchDecision.TRUE_MATCH,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('audit-logs match decision override and stores reviewer justification', async () => {
    let currentCase = makeGovernedCase(CaseStatus.NEEDS_REVIEW);

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
        update: jest.fn(async (args: { data: Partial<typeof currentCase> }) => {
          currentCase = {
            ...currentCase,
            ...args.data,
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          };
          return currentCase;
        }),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);
    const updated = await service.reviewMatchDecision(
      'case_1',
      { id: 'usr_comp', role: UserRole.COMPLIANCE_OFFICER, tenantId: 'ten_1' },
      MatchDecision.FALSE_MATCH,
      'DOB and document number conflict with the matched record',
    );

    expect(updated.reviewerDecision).toBe(MatchDecision.FALSE_MATCH);
    expect(updated.reviewerJustification).toContain('DOB and document number conflict');
    expect(auditLogs.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MATCH_DECISION_OVERRIDDEN',
        entityType: 'COMPLIANCE_CASE',
      }),
    );
  });

  it('detects SLA breaches and emits alert actions once', async () => {
    let currentCase = {
      ...makeGovernedCase(CaseStatus.NEEDS_REVIEW),
      slaTargetAt: new Date('2025-12-31T23:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const prisma = {
      complianceCase: {
        findMany: jest.fn(async () => [currentCase]),
        findUnique: jest.fn(async () => currentCase),
        update: jest.fn(async (args: { data: Partial<typeof currentCase> }) => {
          currentCase = {
            ...currentCase,
            ...args.data,
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          };
          return currentCase;
        }),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);
    const alerts = await service.detectSlaBreaches();

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.caseId).toBe('case_1');
    expect(currentCase.slaBreachedAt).toBeTruthy();
    expect(currentCase.slaAlertedAt).toBeTruthy();
  });

  it('hides internal governance fields from notary case views', async () => {
    const currentCase = {
      ...makeGovernedCase(CaseStatus.NEEDS_REVIEW),
      assignedReviewerId: 'usr_reviewer',
      reviewerLockedById: 'usr_reviewer',
    };

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);
    const caseView = await service.getById('case_1', {
      id: 'usr_notary',
      role: UserRole.NOTARY,
      tenantId: 'ten_1',
    });

    expect(caseView).not.toHaveProperty('assignedReviewerId');
    expect(caseView).not.toHaveProperty('priority');
    expect(caseView.screeningQuery).not.toHaveProperty('highestScore');
  });

  it('exports a deterministic compliance timeline per case', async () => {
    const currentCase = makeGovernedCase(CaseStatus.SIC_PACKAGE_PREPARED);

    const prisma = {
      complianceCase: {
        findUnique: jest.fn(async () => currentCase),
      },
      caseAction: {
        create: jest.fn(async () => ({ id: 'act_1' })),
        findMany: jest.fn(async () => [
          {
            id: 'act_1',
            caseId: 'case_1',
            actorId: 'usr_comp',
            action: 'STATUS_CHANGED_SIC_PACKAGE_PREPARED',
            notes: 'prepared',
            metadata: { fromStatus: 'NEEDS_REVIEW', toStatus: 'SIC_PACKAGE_PREPARED' },
            createdAt: new Date('2026-01-01T01:00:00.000Z'),
          },
        ]),
      },
      auditLog: {
        findMany: jest.fn(async () => [
          {
            id: 'audit_1',
            tenantId: 'ten_1',
            userId: 'usr_comp',
            chainScope: 'ten_1',
            previousHash: null,
            entryHash: 'hash_1',
            action: 'CASE_STATUS_CHANGED',
            entityType: 'COMPLIANCE_CASE',
            entityId: 'case_1',
            ipAddress: null,
            userAgent: null,
            metadata: null,
            createdAt: new Date('2026-01-01T01:30:00.000Z'),
          },
        ]),
      },
      evidencePackage: {
        create: jest.fn(async () => ({ id: 'ev_1' })),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => [
          {
            id: 'ev_1',
            caseId: 'case_1',
            packageHash: 'hash_payload',
            payload: { sample: true },
            generatedBy: 'usr_comp',
            createdAt: new Date('2026-01-01T02:00:00.000Z'),
          },
        ]),
      },
    };

    const auditLogs = {
      log: jest.fn(async () => ({ id: 'audit_1' })),
    };

    const service = new CasesService(prisma as never, auditLogs as never);

    const timeline = await service.getComplianceTimeline('case_1', {
      id: 'usr_admin',
      role: UserRole.SUPER_ADMIN,
      tenantId: 'ten_1',
    });

    expect(timeline.caseId).toBe('case_1');
    expect(timeline.timeline.length).toBeGreaterThan(0);
    expect(timeline.decisionTrail.machineDecision).toBe(MatchDecision.POSSIBLE_MATCH);
    expect(Array.isArray(timeline.decisionTrail.supportingFactors)).toBe(true);
    expect(timeline.exportHash).toHaveLength(64);
  });
});
