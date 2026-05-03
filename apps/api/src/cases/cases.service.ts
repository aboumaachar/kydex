import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { CasePriority, CaseStatus, CommitteeDecision, MatchDecision, Prisma, RiskLevel, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type CaseActor = {
  id?: string;
  role?: UserRole;
  tenantId?: string;
};

type CaseListFilters = {
  status?: CaseStatus;
  riskLevel?: RiskLevel;
  reviewQueue?: boolean;
};

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN];
const EVIDENCE_ROLES = [...ADMIN_ROLES, UserRole.COMPLIANCE_OFFICER];
const GOVERNED_STATUSES = new Set<CaseStatus>([
  CaseStatus.ESCALATED_INTERNALLY,
  CaseStatus.SIC_PACKAGE_PREPARED,
  CaseStatus.CLEARED,
]);
const POST_ESCALATION_STATUSES = new Set<CaseStatus>([
  CaseStatus.SIC_PACKAGE_PREPARED,
  CaseStatus.CLEARED,
  CaseStatus.REPORTED_TO_SIC,
]);
const REVIEW_REQUIRED_STATUSES = new Set<CaseStatus>([
  CaseStatus.SIC_PACKAGE_PREPARED,
  CaseStatus.CLEARED,
  CaseStatus.REPORTED_TO_SIC,
]);
const JUSTIFICATION_REQUIRED_STATUSES = new Set<CaseStatus>([
  CaseStatus.CLEARED,
  CaseStatus.REPORTED_TO_SIC,
  CaseStatus.REJECTED_BLOCKED,
]);

const REVIEW_QUEUE_STATUSES: CaseStatus[] = [
  CaseStatus.NEEDS_REVIEW,
  CaseStatus.ESCALATED_INTERNALLY,
  CaseStatus.SIC_PACKAGE_PREPARED,
];

const FINAL_AUTHORITY_STATUSES = new Set<CaseStatus>([
  CaseStatus.CLEARED,
  CaseStatus.REPORTED_TO_SIC,
  CaseStatus.REJECTED_BLOCKED,
  CaseStatus.CLOSED,
]);

const REVIEW_QUEUE_RISKS: RiskLevel[] = [RiskLevel.HIGH, RiskLevel.CRITICAL];

const COMMITTEE_DECISION_TO_STATUS: Record<CommitteeDecision, CaseStatus> = {
  [CommitteeDecision.CLEAR]: CaseStatus.CLEARED,
  [CommitteeDecision.REQUEST_MORE_INFORMATION]: CaseStatus.PENDING_ADDITIONAL_INFORMATION,
  [CommitteeDecision.ESCALATE_AS_SUSPICIOUS]: CaseStatus.ESCALATED_INTERNALLY,
  [CommitteeDecision.REJECT_OR_BLOCK]: CaseStatus.REJECTED_BLOCKED,
};
const COMMITTEE_DECISIONS = new Set<CommitteeDecision>(Object.values(CommitteeDecision));

const CASE_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.DRAFT]: [CaseStatus.SCREENED, CaseStatus.NEEDS_REVIEW, CaseStatus.REJECTED_BLOCKED],
  [CaseStatus.SCREENED]: [
    CaseStatus.NEEDS_REVIEW,
    CaseStatus.CLEARED,
    CaseStatus.PENDING_ADDITIONAL_INFORMATION,
    CaseStatus.REJECTED_BLOCKED,
  ],
  [CaseStatus.NEEDS_REVIEW]: [
    CaseStatus.ESCALATED_INTERNALLY,
    CaseStatus.PENDING_ADDITIONAL_INFORMATION,
    CaseStatus.SIC_PACKAGE_PREPARED,
    CaseStatus.CLEARED,
    CaseStatus.REJECTED_BLOCKED,
  ],
  [CaseStatus.ESCALATED_INTERNALLY]: [
    CaseStatus.SIC_PACKAGE_PREPARED,
    CaseStatus.REPORTED_TO_SIC,
    CaseStatus.CLEARED,
    CaseStatus.PENDING_ADDITIONAL_INFORMATION,
    CaseStatus.REJECTED_BLOCKED,
  ],
  [CaseStatus.PENDING_ADDITIONAL_INFORMATION]: [
    CaseStatus.NEEDS_REVIEW,
    CaseStatus.ESCALATED_INTERNALLY,
    CaseStatus.CLEARED,
    CaseStatus.REJECTED_BLOCKED,
  ],
  [CaseStatus.CLEARED]: [CaseStatus.CLOSED],
  [CaseStatus.SIC_PACKAGE_PREPARED]: [CaseStatus.REPORTED_TO_SIC, CaseStatus.CLEARED, CaseStatus.CLOSED],
  [CaseStatus.REPORTED_TO_SIC]: [CaseStatus.CLOSED],
  [CaseStatus.REJECTED_BLOCKED]: [CaseStatus.CLOSED],
  [CaseStatus.CLOSED]: [],
};

type GovernedCase = Prisma.ComplianceCaseGetPayload<{
  include: {
    tenant: true;
    screeningQuery: { include: { matches: true } };
    actions: true;
  };
}>;

type ListedCase = Prisma.ComplianceCaseGetPayload<{
  include: {
    screeningQuery: true;
    actions: true;
  };
}>;

type CaseSummary = {
  id: string;
  status: CaseStatus;
  riskLevel: RiskLevel;
  createdAt: Date;
  updatedAt: Date;
  screeningQuery: {
    id: string;
    fullName: string;
  };
};

type ReviewerLockUpdate = {
  reviewerLockedById?: string | null;
  reviewerLockAcquiredAt?: Date | null;
  reviewerLockExpiresAt?: Date | null;
};

type SlaBreachAlert = {
  caseId: string;
  priority: CasePriority;
  status: CaseStatus;
  slaTargetAt: string;
  breachedAt: string;
  overdueMinutes: number;
};

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async list(actor?: CaseActor, filters?: CaseListFilters): Promise<ListedCase[] | CaseSummary[]> {
    const where: Prisma.ComplianceCaseWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.riskLevel) {
      where.riskLevel = filters.riskLevel;
    }

    if (filters?.reviewQueue) {
      where.status = { in: REVIEW_QUEUE_STATUSES };
      where.riskLevel = { in: REVIEW_QUEUE_RISKS };
    }

    const cases = await this.prisma.complianceCase.findMany({
      where,
      include: {
        screeningQuery: true,
        actions: actor?.role !== UserRole.NOTARY,
      },
      orderBy: { createdAt: 'desc' },
    });

    return actor?.role === UserRole.NOTARY
      ? cases.map((entry) => this.toCaseSummary(entry))
      : cases;
  }

  async getById(caseId: string, actor?: CaseActor): Promise<GovernedCase | CaseSummary> {
    const complianceCase = await this.prisma.complianceCase.findUnique({
      where: { id: caseId },
      include: {
        screeningQuery: { include: { matches: true } },
        actions: true,
      },
    });

    if (!complianceCase) {
      throw new NotFoundException('Case not found');
    }

    return actor?.role === UserRole.NOTARY ? this.toCaseSummary(complianceCase) : complianceCase;
  }

  async addAction(caseId: string, actor: CaseActor | undefined, action: string, notes?: string) {
    const complianceCase = await this.getCaseForGovernance(caseId);

    const entry = await this.prisma.caseAction.create({
      data: {
        caseId,
        actorId: actor?.id,
        action,
        notes,
      },
    });

    await this.auditLogsService.log({
      tenantId: complianceCase.tenantId,
      userId: actor?.id,
      action: 'CASE_ACTION',
      entityType: 'COMPLIANCE_CASE',
      entityId: caseId,
      metadata: { action, notes },
    });

    return entry;
  }

  async assignReviewer(
    caseId: string,
    actor: CaseActor | undefined,
    reviewerId?: string,
    notes?: string,
  ) {
    if (!reviewerId?.trim()) {
      throw new BadRequestException('reviewerId is required');
    }

    const complianceCase = await this.getCaseForGovernance(caseId);
    this.assertReviewerLockAvailability(complianceCase, actor, 'reviewer assignment');

    const updated = await this.applyCaseUpdateWithLock(complianceCase, {
      assignedReviewerId: reviewerId.trim(),
      decisionNotes: notes?.trim() || complianceCase.decisionNotes,
      ...this.buildReviewerAssignmentLock(reviewerId.trim()),
    });

    await this.prisma.caseAction.create({
      data: {
        caseId,
        actorId: actor?.id,
        action: 'REVIEWER_ASSIGNED',
        notes: notes?.trim(),
        metadata: {
          reviewerId: reviewerId.trim(),
          assignedBy: actor?.id ?? null,
        },
      },
    });

    await this.auditLogsService.log({
      tenantId: complianceCase.tenantId,
      userId: actor?.id,
      action: 'CASE_REVIEWER_ASSIGNED',
      entityType: 'COMPLIANCE_CASE',
      entityId: caseId,
      metadata: {
        reviewerId: reviewerId.trim(),
        notes: notes?.trim() ?? null,
      },
    });

    return updated;
  }

  async recordCommitteeDecision(
    caseId: string,
    actor: CaseActor | undefined,
    decision?: string,
    notes?: string,
  ) {
    const normalizedDecision = this.normalizeCommitteeDecision(decision);
    if (!normalizedDecision) {
      throw new BadRequestException(
        'decision must be one of CLEAR, REQUEST_MORE_INFORMATION, ESCALATE_AS_SUSPICIOUS, REJECT_OR_BLOCK',
      );
    }

    const trimmedNotes = notes?.trim();
    if (!trimmedNotes) {
      throw new BadRequestException('notes are required for committee decisions');
    }

    const nextStatus = COMMITTEE_DECISION_TO_STATUS[normalizedDecision];
    const updated = await this.updateStatus(caseId, actor, nextStatus, trimmedNotes);

    await this.prisma.caseAction.create({
      data: {
        caseId,
        actorId: actor?.id,
        action: 'COMMITTEE_DECISION_RECORDED',
        notes: trimmedNotes,
        metadata: {
          decision: normalizedDecision,
          status: nextStatus,
        },
      },
    });

    await this.applyCaseUpdateWithLock(updated, {
      committeeDecision: normalizedDecision,
      decisionNotes: trimmedNotes,
      assignedReviewerId: updated.assignedReviewerId ?? actor?.id ?? null,
    });

    return this.getCaseForGovernance(caseId);
  }

  async reviewMatchDecision(
    caseId: string,
    actor: CaseActor | undefined,
    reviewerDecision?: MatchDecision,
    reviewerJustification?: string,
  ) {
    const complianceCase = await this.getCaseForGovernance(caseId);
    const originalDecision = complianceCase.originalDecision ?? complianceCase.screeningQuery.matchDecision;

    if (!originalDecision) {
      throw new BadRequestException('No machine decision is available for reviewer confirmation or override');
    }

    if (!reviewerDecision || !Object.values(MatchDecision).includes(reviewerDecision)) {
      throw new BadRequestException('reviewerDecision must be a valid MatchDecision value');
    }

    const trimmedJustification = reviewerJustification?.trim();
    const isOverride = reviewerDecision !== originalDecision;
    if (isOverride && !trimmedJustification) {
      throw new BadRequestException('reviewerJustification is required when overriding the machine decision');
    }

    const updated = await this.applyCaseUpdateWithLock(complianceCase, {
      originalDecision,
      reviewerDecision,
      reviewerJustification: trimmedJustification ?? null,
      reviewedAt: new Date(),
      assignedReviewerId: complianceCase.assignedReviewerId ?? actor?.id ?? null,
      decisionNotes: trimmedJustification ?? complianceCase.decisionNotes,
      ...this.buildReviewerActionLock(complianceCase, actor),
    });

    await this.prisma.caseAction.create({
      data: {
        caseId,
        actorId: actor?.id,
        action: isOverride ? 'MATCH_DECISION_OVERRIDDEN' : 'MATCH_DECISION_CONFIRMED',
        notes: trimmedJustification,
        metadata: {
          originalDecision,
          reviewerDecision,
          reviewerId: actor?.id ?? null,
        },
      },
    });

    await this.auditLogsService.log({
      tenantId: complianceCase.tenantId,
      userId: actor?.id,
      action: isOverride ? 'MATCH_DECISION_OVERRIDDEN' : 'MATCH_DECISION_CONFIRMED',
      entityType: 'COMPLIANCE_CASE',
      entityId: caseId,
      metadata: {
        queryId: complianceCase.screeningQueryId,
        caseId,
        decision: reviewerDecision,
        confidence: complianceCase.screeningQuery.decisionConfidence,
        recommendedAction: complianceCase.screeningQuery.recommendedAction,
        supportingFactors: complianceCase.screeningQuery.supportingFactors,
        weakeningFactors: complianceCase.screeningQuery.weakeningFactors,
        reviewerId: actor?.id ?? null,
        justification: trimmedJustification ?? null,
      },
    });

    return updated;
  }

  async processSicApproval(
    caseId: string,
    actor: CaseActor | undefined,
    approved?: boolean,
    notes?: string,
  ) {
    if (typeof approved !== 'boolean') {
      throw new BadRequestException('approved must be true or false');
    }

    const complianceCase = await this.getCaseForGovernance(caseId);
    if (complianceCase.status !== CaseStatus.SIC_PACKAGE_PREPARED) {
      throw new ForbiddenException('SIC approval workflow requires SIC_PACKAGE_PREPARED status');
    }

    const decisionNotes = notes?.trim();
    if (!decisionNotes) {
      throw new BadRequestException('notes are required for SIC approval workflow');
    }

    const nextStatus = approved ? CaseStatus.REPORTED_TO_SIC : CaseStatus.NEEDS_REVIEW;
    const updatedAfterStatus = await this.updateStatus(caseId, actor, nextStatus, decisionNotes);

    const updated = await this.applyCaseUpdateWithLock(updatedAfterStatus, {
      sicSubmissionStatus: approved ? 'APPROVED' : 'REJECTED',
      decisionNotes,
    });

    await this.prisma.caseAction.create({
      data: {
        caseId,
        actorId: actor?.id,
        action: 'SIC_PACKAGE_APPROVAL_PROCESSED',
        notes: decisionNotes,
        metadata: {
          approved,
          nextStatus,
        },
      },
    });

    return updated;
  }

  async updateStatus(
    caseId: string,
    actor: CaseActor | undefined,
    status: CaseStatus,
    notes?: string,
    extraData?: Prisma.ComplianceCaseUncheckedUpdateInput,
  ) {
    const complianceCase = await this.getCaseForGovernance(caseId);

    this.assertStatusTransition(complianceCase.status, status);
    this.assertReviewerLockAvailability(complianceCase, actor, `status change to ${status}`);

    const nextData = this.buildStatusUpdate(complianceCase, actor, status, notes);
    const updateData = {
      ...nextData,
      ...this.buildReviewerActionLock(complianceCase, actor),
      ...extraData,
    };

    const updated = await this.applyCaseUpdateWithLock(complianceCase, updateData);

    await this.prisma.caseAction.create({
      data: {
        caseId,
        actorId: actor?.id,
        action: `STATUS_CHANGED_${status}`,
        notes,
        metadata: {
          fromStatus: complianceCase.status,
          toStatus: status,
          reviewerId: actor?.id ?? null,
          reviewerRole: actor?.role ?? null,
        },
      },
    });

    await this.auditLogsService.log({
      tenantId: complianceCase.tenantId,
      userId: actor?.id,
      action: 'CASE_STATUS_CHANGED',
      entityType: 'COMPLIANCE_CASE',
      entityId: caseId,
      metadata: {
        status,
        assignedReviewerId: updated.assignedReviewerId,
        decisionNotes: updated.decisionNotes,
        priority: updated.priority,
        slaTargetAt: updated.slaTargetAt,
      },
    });

    return updated;
  }

  async generateEvidencePackage(caseId: string, actor: CaseActor | undefined) {
    const complianceCase = await this.getCaseForGovernance(caseId);

    this.assertEvidenceAccess(complianceCase, actor);

    if (!['HIGH', 'CRITICAL'].includes(complianceCase.riskLevel as string)) {
      throw new NotFoundException('Evidence package is only available for HIGH/CRITICAL cases');
    }

    if (complianceCase.riskLevel === RiskLevel.HIGH && !complianceCase.assignedReviewerId) {
      if (actor?.role !== UserRole.COMPLIANCE_OFFICER || !actor.id) {
        throw new ForbiddenException('HIGH cases require compliance officer review before evidence access');
      }

      const updatedCase = await this.applyCaseUpdateWithLock(complianceCase, {
        assignedReviewerId: actor.id,
        decisionNotes:
          complianceCase.decisionNotes ?? 'Compliance officer review recorded during evidence generation',
        ...this.buildReviewerActionLock(complianceCase, actor),
      });
      complianceCase.assignedReviewerId = updatedCase.assignedReviewerId;
      complianceCase.decisionNotes = updatedCase.decisionNotes;
      complianceCase.reviewerLockedById = updatedCase.reviewerLockedById;
      complianceCase.reviewerLockAcquiredAt = updatedCase.reviewerLockAcquiredAt;
      complianceCase.reviewerLockExpiresAt = updatedCase.reviewerLockExpiresAt;
    }

    if (
      complianceCase.riskLevel === RiskLevel.CRITICAL &&
      complianceCase.status !== CaseStatus.ESCALATED_INTERNALLY &&
      complianceCase.status !== CaseStatus.SIC_PACKAGE_PREPARED &&
      complianceCase.status !== CaseStatus.REPORTED_TO_SIC
    ) {
      throw new ForbiddenException('CRITICAL cases must be escalated internally before evidence access');
    }

    const auditTrail = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          {
            entityType: 'COMPLIANCE_CASE',
            entityId: caseId,
          },
          {
            entityType: 'SCREENING_QUERY',
            entityId: complianceCase.screeningQueryId,
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const payload = {
      generatedAt: new Date().toISOString(),
      case: {
        id: complianceCase.id,
        status: complianceCase.status,
        riskLevel: complianceCase.riskLevel,
        originalDecision: complianceCase.originalDecision ?? complianceCase.screeningQuery.matchDecision,
        reviewerDecision: complianceCase.reviewerDecision,
        reviewerJustification: complianceCase.reviewerJustification,
        reviewedAt: complianceCase.reviewedAt,
        committeeDecision: complianceCase.committeeDecision,
        decisionNotes: complianceCase.decisionNotes,
      },
      screening: {
        id: complianceCase.screeningQuery.id,
        fullName: complianceCase.screeningQuery.fullName,
        normalizedName: complianceCase.screeningQuery.normalizedName,
        highestScore: complianceCase.screeningQuery.highestScore,
        riskLevel: complianceCase.screeningQuery.riskLevel,
        matchDecision: complianceCase.screeningQuery.matchDecision,
        decisionConfidence: complianceCase.screeningQuery.decisionConfidence,
        reasonSummary: complianceCase.screeningQuery.reasonSummary,
        recommendedAction: complianceCase.screeningQuery.recommendedAction,
        supportingFactors: complianceCase.screeningQuery.supportingFactors,
        weakeningFactors: complianceCase.screeningQuery.weakeningFactors,
        matches: complianceCase.screeningQuery.matches,
      },
      caseActions: complianceCase.actions,
      auditTrail,
      disclaimer: 'Decision-support evidence package. Human review remains mandatory.',
    };

    const payloadString = JSON.stringify(payload);
    const packageHash = createHash('sha256').update(payloadString).digest('hex');

    const evidencePackage = await this.prisma.evidencePackage.create({
      data: {
        caseId: complianceCase.id,
        packageHash,
        payload,
        generatedBy: actor?.id,
      },
    });

    await this.prisma.caseAction.create({
      data: {
        caseId: complianceCase.id,
        actorId: actor?.id,
        action: 'EVIDENCE_PACKAGE_CREATED',
        notes: 'Immutable evidence snapshot created',
        metadata: {
          evidencePackageId: evidencePackage.id,
          packageHash,
        },
      },
    });

    if (complianceCase.status !== CaseStatus.SIC_PACKAGE_PREPARED) {
      await this.updateStatus(
        complianceCase.id,
        actor,
        CaseStatus.SIC_PACKAGE_PREPARED,
        'Evidence package generated under governed workflow',
      );
    }

    await this.auditLogsService.log({
      tenantId: complianceCase.tenantId,
      userId: actor?.id,
      action: 'EVIDENCE_GENERATED',
      entityType: 'EVIDENCE_PACKAGE',
      entityId: evidencePackage.id,
      metadata: {
        caseId: complianceCase.id,
        packageHash,
      },
    });

    return {
      evidencePackageId: evidencePackage.id,
      caseId: complianceCase.id,
      packageHash,
      payload,
    };
  }

  async getLatestEvidencePackage(caseId: string, actor?: CaseActor) {
    const complianceCase = await this.getCaseForGovernance(caseId);
    this.assertEvidenceAccess(complianceCase, actor);

    const evidencePackage = await this.prisma.evidencePackage.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });

    if (!evidencePackage) {
      throw new NotFoundException('Evidence package not found');
    }

    const computedHash = createHash('sha256').update(JSON.stringify(evidencePackage.payload)).digest('hex');
    if (computedHash !== evidencePackage.packageHash) {
      throw new ForbiddenException('Evidence package integrity verification failed');
    }

    return evidencePackage;
  }

  async getComplianceTimeline(caseId: string, actor?: CaseActor, options?: { exportRequested?: boolean }) {
    if (options?.exportRequested) {
      this.assertTimelineExportAccess(actor);
    }

    const complianceCase = await this.getCaseForGovernance(caseId);
    this.assertEvidenceAccess(complianceCase, actor);

    const [caseActions, evidencePackages] = await Promise.all([
      this.prisma.caseAction.findMany({
        where: { caseId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.evidencePackage.findMany({
        where: { caseId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const evidenceIds = evidencePackages.map((entry) => entry.id);
    const auditTrail = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          {
            entityType: 'COMPLIANCE_CASE',
            entityId: caseId,
          },
          {
            entityType: 'SCREENING_QUERY',
            entityId: complianceCase.screeningQueryId,
          },
          ...(evidenceIds.length > 0
            ? [
                {
                  entityType: 'EVIDENCE_PACKAGE',
                  entityId: { in: evidenceIds },
                },
              ]
            : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const timeline = [
      {
        type: 'MATCH_DECISION',
        ts: complianceCase.screeningQuery.createdAt.toISOString(),
        decision: complianceCase.screeningQuery.matchDecision,
        confidence: complianceCase.screeningQuery.decisionConfidence,
        reasonSummary: complianceCase.screeningQuery.reasonSummary,
        recommendedAction: complianceCase.screeningQuery.recommendedAction,
        supportingFactors: complianceCase.screeningQuery.supportingFactors,
        weakeningFactors: complianceCase.screeningQuery.weakeningFactors,
      },
      ...(complianceCase.reviewerDecision
        ? [
            {
              type: 'MATCH_DECISION_REVIEW',
              ts: (complianceCase.reviewedAt ?? complianceCase.updatedAt).toISOString(),
              originalDecision: complianceCase.originalDecision ?? complianceCase.screeningQuery.matchDecision,
              reviewerDecision: complianceCase.reviewerDecision,
              reviewerJustification: complianceCase.reviewerJustification,
              reviewerId: complianceCase.assignedReviewerId,
            },
          ]
        : []),
      ...caseActions.map((entry) => ({
        type: 'CASE_ACTION',
        ts: entry.createdAt.toISOString(),
        action: entry.action,
        actorId: entry.actorId,
        notes: entry.notes,
        metadata: entry.metadata,
      })),
      ...auditTrail.map((entry) => ({
        type: 'AUDIT_LOG',
        ts: entry.createdAt.toISOString(),
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entryHash: entry.entryHash,
        previousHash: entry.previousHash,
      })),
      ...evidencePackages.map((entry) => ({
        type: 'EVIDENCE_PACKAGE',
        ts: entry.createdAt.toISOString(),
        evidencePackageId: entry.id,
        packageHash: entry.packageHash,
      })),
    ].sort((a, b) => a.ts.localeCompare(b.ts));

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      caseId,
      screeningQueryId: complianceCase.screeningQueryId,
      decisionTrail: {
        machineDecision: complianceCase.screeningQuery.matchDecision,
        decisionConfidence: complianceCase.screeningQuery.decisionConfidence,
        reasonSummary: complianceCase.screeningQuery.reasonSummary,
        recommendedAction: complianceCase.screeningQuery.recommendedAction,
        supportingFactors: complianceCase.screeningQuery.supportingFactors,
        weakeningFactors: complianceCase.screeningQuery.weakeningFactors,
        reviewerOverride: complianceCase.reviewerDecision
          ? {
              originalDecision: complianceCase.originalDecision ?? complianceCase.screeningQuery.matchDecision,
              reviewerDecision: complianceCase.reviewerDecision,
              reviewerJustification: complianceCase.reviewerJustification,
              reviewerId: complianceCase.assignedReviewerId,
              reviewedAt: complianceCase.reviewedAt,
            }
          : null,
        finalDecision:
          complianceCase.reviewerDecision ??
          complianceCase.originalDecision ??
          complianceCase.screeningQuery.matchDecision,
      },
      timeline,
    };

    const exportHash = createHash('sha256').update(JSON.stringify(exportPayload)).digest('hex');
    const exportSignature = this.createSignedExportHash(exportHash);

    if (options?.exportRequested && actor?.id && actor.role) {
      const refreshedCase = await this.getCaseForGovernance(caseId);
      await this.applyCaseUpdateWithLock(refreshedCase, {
        finalAuthorityUserId: actor.id,
        finalAuthorityRole: actor.role,
        finalAuthoritySignedAt: new Date(),
        finalAuthoritySignatureHash: exportSignature,
      });

      await this.prisma.caseAction.create({
        data: {
          caseId,
          actorId: actor.id,
          action: 'COMPLIANCE_TIMELINE_EXPORTED',
          notes: 'Final authority signed compliance timeline export',
          metadata: {
            exportHash,
            exportSignature,
          },
        },
      });
    }

    return {
      ...exportPayload,
      exportHash,
      exportSignature,
    };
  }

  async detectSlaBreaches(): Promise<SlaBreachAlert[]> {
    const now = new Date();
    const cases = await this.prisma.complianceCase.findMany({
      where: {
        slaTargetAt: { lt: now },
        closedAt: null,
        status: { not: CaseStatus.CLOSED },
        OR: [{ slaAlertedAt: null }, { slaBreachedAt: null }],
      },
      orderBy: { slaTargetAt: 'asc' },
    });

    const alerts: SlaBreachAlert[] = [];

    for (const complianceCase of cases) {
      const breachedAt = complianceCase.slaBreachedAt ?? now;
      const alertedAt = complianceCase.slaAlertedAt ?? now;
      const updated = await this.applyCaseUpdateWithLock(complianceCase, {
        slaBreachedAt: breachedAt,
        slaAlertedAt: alertedAt,
      });

      const overdueMinutes = Math.max(
        1,
        Math.round((now.getTime() - (updated.slaTargetAt?.getTime() ?? now.getTime())) / 60000),
      );

      await this.prisma.caseAction.create({
        data: {
          caseId: updated.id,
          actorId: null,
          action: 'SLA_BREACH_ALERTED',
          notes: 'Regulatory SLA breach detected',
          metadata: {
            priority: updated.priority,
            status: updated.status,
            slaTargetAt: updated.slaTargetAt?.toISOString() ?? null,
            breachedAt: breachedAt.toISOString(),
            overdueMinutes,
          },
        },
      });

      alerts.push({
        caseId: updated.id,
        priority: updated.priority,
        status: updated.status,
        slaTargetAt: updated.slaTargetAt?.toISOString() ?? breachedAt.toISOString(),
        breachedAt: breachedAt.toISOString(),
        overdueMinutes,
      });
    }

    return alerts;
  }

  private async getCaseForGovernance(caseId: string) {
    const complianceCase = await this.prisma.complianceCase.findUnique({
      where: { id: caseId },
      include: {
        tenant: true,
        screeningQuery: {
          include: {
            matches: true,
          },
        },
        actions: true,
      },
    });

    if (!complianceCase) {
      throw new NotFoundException('Case not found');
    }

    return complianceCase;
  }

  private assertEvidenceAccess(complianceCase: GovernedCase, actor?: CaseActor) {
    if (!actor?.role || !(EVIDENCE_ROLES as UserRole[]).includes(actor.role)) {
      throw new ForbiddenException('Evidence packages are restricted to admins and compliance officers');
    }

    if (actor.role === UserRole.API_CLIENT && complianceCase.tenant.type === 'COUNCIL') {
      throw new ForbiddenException('API clients cannot access council evidence packages');
    }
  }

  private assertTimelineExportAccess(actor?: CaseActor) {
    if (!actor?.role || !(ADMIN_ROLES as UserRole[]).includes(actor.role)) {
      throw new ForbiddenException('Only admins may export compliance timelines');
    }
  }

  private assertReviewerLockAvailability(
    complianceCase: {
      reviewerLockedById: string | null;
      reviewerLockExpiresAt: Date | null;
    },
    actor: CaseActor | undefined,
    action: string,
  ) {
    if (!this.hasActiveReviewerLock(complianceCase)) {
      return;
    }

    if (actor?.id && complianceCase.reviewerLockedById === actor.id) {
      return;
    }

    throw new ConflictException(
      `Case is locked by another reviewer until ${complianceCase.reviewerLockExpiresAt?.toISOString()} during ${action}`,
    );
  }

  private buildReviewerAssignmentLock(reviewerId: string): ReviewerLockUpdate {
    const now = new Date();
    return {
      reviewerLockedById: reviewerId,
      reviewerLockAcquiredAt: now,
      reviewerLockExpiresAt: new Date(now.getTime() + this.getReviewerLockTtlMs()),
    };
  }

  private buildReviewerActionLock(
    complianceCase: {
      reviewerLockedById: string | null;
      reviewerLockAcquiredAt: Date | null;
      reviewerLockExpiresAt: Date | null;
    },
    actor: CaseActor | undefined,
  ): ReviewerLockUpdate {
    if (!actor?.id) {
      return {};
    }

    if (this.hasActiveReviewerLock(complianceCase) && complianceCase.reviewerLockedById === actor.id) {
      return this.buildReviewerAssignmentLock(actor.id);
    }

    if (!this.hasActiveReviewerLock(complianceCase)) {
      return this.buildReviewerAssignmentLock(actor.id);
    }

    return {};
  }

  private hasActiveReviewerLock(complianceCase: {
    reviewerLockExpiresAt: Date | null;
    reviewerLockedById: string | null;
  }) {
    return !!complianceCase.reviewerLockedById && !!complianceCase.reviewerLockExpiresAt && complianceCase.reviewerLockExpiresAt.getTime() > Date.now();
  }

  private getReviewerLockTtlMs() {
    const minutes = Number(process.env.REVIEWER_LOCK_TTL_MINUTES ?? 30);
    return Math.max(1, minutes) * 60 * 1000;
  }

  private createSignedExportHash(exportHash: string) {
    return createHmac('sha256', this.getExportHmacSecret()).update(exportHash).digest('hex');
  }

  private getExportHmacSecret() {
    return process.env.EXPORT_HMAC_SECRET ?? process.env.JWT_SECRET ?? 'change_this_in_production';
  }

  private async applyCaseUpdateWithLock(
    snapshot: { id: string; updatedAt: Date },
    data: Prisma.ComplianceCaseUncheckedUpdateInput,
  ) {
    if (typeof this.prisma.complianceCase.updateMany !== 'function') {
      const updated = await this.prisma.complianceCase.update({
        where: { id: snapshot.id },
        data,
      });
      return updated;
    }

    const updateResult = await this.prisma.complianceCase.updateMany({
      where: {
        id: snapshot.id,
        updatedAt: snapshot.updatedAt,
      },
      data: {
        ...data,
        lockVersion: { increment: 1 },
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictException('Case was updated by another reviewer. Refresh and retry.');
    }

    const updated = await this.prisma.complianceCase.findUnique({
      where: { id: snapshot.id },
    });

    if (!updated) {
      throw new NotFoundException('Case not found after update');
    }

    return updated;
  }

  private buildStatusUpdate(
    complianceCase: GovernedCase,
    actor: CaseActor | undefined,
    status: CaseStatus,
    notes?: string,
  ) {
    this.assertGovernedStatusActor(actor, status);
    this.assertCriticalEscalation(complianceCase, status);

    const nextData: {
      status: CaseStatus;
      assignedReviewerId?: string;
      decisionNotes?: string;
      committeeDecision?: CommitteeDecision;
      reviewerLockedById?: string | null;
      reviewerLockAcquiredAt?: Date | null;
      reviewerLockExpiresAt?: Date | null;
      finalAuthorityUserId?: string;
      finalAuthorityRole?: UserRole;
      finalAuthoritySignedAt?: Date;
    } = { status };

    this.applyHighRiskReviewRequirements(complianceCase, actor, status, nextData);
    this.assertReviewerJustification(status, actor, notes);
    this.applyClearanceDecision(complianceCase, actor, status, notes, nextData);
    this.applyFinalAuthorityStamp(actor, status, nextData);
    this.applyTerminalLockRelease(status, nextData);

    return nextData;
  }

  private assertGovernedStatusActor(actor: CaseActor | undefined, status: CaseStatus) {
    if (GOVERNED_STATUSES.has(status) && !actor?.role) {
      throw new ForbiddenException('Authenticated reviewer context is required for governed status changes');
    }

    if (
      GOVERNED_STATUSES.has(status) &&
      actor?.role &&
      !(EVIDENCE_ROLES as UserRole[]).includes(actor.role)
    ) {
      throw new ForbiddenException('Only admins and compliance officers may change governed case statuses');
    }
  }

  private assertCriticalEscalation(complianceCase: GovernedCase, status: CaseStatus) {
    if (
      complianceCase.riskLevel === RiskLevel.CRITICAL &&
      POST_ESCALATION_STATUSES.has(status) &&
      complianceCase.status !== CaseStatus.ESCALATED_INTERNALLY &&
      complianceCase.status !== status
    ) {
      throw new ForbiddenException('CRITICAL cases require escalation before downstream actions');
    }
  }

  private applyHighRiskReviewRequirements(
    complianceCase: GovernedCase,
    actor: CaseActor | undefined,
    status: CaseStatus,
    nextData: {
      status: CaseStatus;
      assignedReviewerId?: string;
      decisionNotes?: string;
      committeeDecision?: CommitteeDecision;
      reviewerLockedById?: string | null;
      reviewerLockAcquiredAt?: Date | null;
      reviewerLockExpiresAt?: Date | null;
      finalAuthorityUserId?: string;
      finalAuthorityRole?: UserRole;
      finalAuthoritySignedAt?: Date;
    },
  ) {
    if (complianceCase.riskLevel !== RiskLevel.HIGH || !REVIEW_REQUIRED_STATUSES.has(status)) {
      return;
    }

    if (actor?.role === UserRole.COMPLIANCE_OFFICER && actor.id) {
      nextData.assignedReviewerId = complianceCase.assignedReviewerId ?? actor.id;
      nextData.decisionNotes = complianceCase.decisionNotes ?? 'Compliance officer review completed';
      return;
    }

    if (!complianceCase.assignedReviewerId) {
      throw new ForbiddenException('HIGH cases require compliance officer review before governed status changes');
    }
  }

  private assertReviewerJustification(status: CaseStatus, actor: CaseActor | undefined, notes?: string) {
    if (!JUSTIFICATION_REQUIRED_STATUSES.has(status)) {
      return;
    }

    if (!actor?.id) {
      throw new ForbiddenException('Reviewer identity is required for governed decision statuses');
    }

    if (!notes?.trim()) {
      throw new ForbiddenException('Reviewer justification notes are required for governed decision statuses');
    }
  }

  private applyClearanceDecision(
    complianceCase: GovernedCase,
    actor: CaseActor | undefined,
    status: CaseStatus,
    notes: string | undefined,
    nextData: {
      status: CaseStatus;
      assignedReviewerId?: string;
      decisionNotes?: string;
      committeeDecision?: CommitteeDecision;
    },
  ) {
    if (status !== CaseStatus.CLEARED) {
      return;
    }

    const reviewerId = actor?.id;
    const reviewerNotes = notes?.trim();

    if (!reviewerId || !reviewerNotes) {
      throw new ForbiddenException('Case clearance requires reviewer identity and justification');
    }

    nextData.assignedReviewerId = complianceCase.assignedReviewerId ?? reviewerId;
    nextData.decisionNotes = reviewerNotes;
    nextData.committeeDecision = CommitteeDecision.CLEAR;
  }

  private applyFinalAuthorityStamp(
    actor: CaseActor | undefined,
    status: CaseStatus,
    nextData: {
      status: CaseStatus;
      assignedReviewerId?: string;
      decisionNotes?: string;
      committeeDecision?: CommitteeDecision;
      reviewerLockedById?: string | null;
      reviewerLockAcquiredAt?: Date | null;
      reviewerLockExpiresAt?: Date | null;
      finalAuthorityUserId?: string;
      finalAuthorityRole?: UserRole;
      finalAuthoritySignedAt?: Date;
    },
  ) {
    if (!FINAL_AUTHORITY_STATUSES.has(status) || !actor?.id || !actor.role) {
      return;
    }

    nextData.finalAuthorityUserId = actor.id;
    nextData.finalAuthorityRole = actor.role;
    nextData.finalAuthoritySignedAt = new Date();
  }

  private applyTerminalLockRelease(
    status: CaseStatus,
    nextData: {
      status: CaseStatus;
      assignedReviewerId?: string;
      decisionNotes?: string;
      committeeDecision?: CommitteeDecision;
      reviewerLockedById?: string | null;
      reviewerLockAcquiredAt?: Date | null;
      reviewerLockExpiresAt?: Date | null;
      finalAuthorityUserId?: string;
      finalAuthorityRole?: UserRole;
      finalAuthoritySignedAt?: Date;
    },
  ) {
    if (!FINAL_AUTHORITY_STATUSES.has(status)) {
      return;
    }

    nextData.reviewerLockedById = null;
    nextData.reviewerLockAcquiredAt = null;
    nextData.reviewerLockExpiresAt = null;
  }

  private normalizeCommitteeDecision(decision?: string): CommitteeDecision | undefined {
    const normalizedDecision = (decision ?? '').trim().toUpperCase();
    if (!normalizedDecision) {
      return undefined;
    }

    return COMMITTEE_DECISIONS.has(normalizedDecision as CommitteeDecision)
      ? (normalizedDecision as CommitteeDecision)
      : undefined;
  }

  private assertStatusTransition(current: CaseStatus, next: CaseStatus) {
    if (current === next) {
      return;
    }

    const allowed = CASE_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new ForbiddenException(`Invalid case status transition: ${current} -> ${next}`);
    }
  }

  private toCaseSummary(
    complianceCase: GovernedCase | ListedCase,
  ): CaseSummary {
    return {
      id: complianceCase.id,
      status: complianceCase.status,
      riskLevel: complianceCase.riskLevel,
      createdAt: complianceCase.createdAt,
      updatedAt: complianceCase.updatedAt,
      screeningQuery: {
        id: complianceCase.screeningQuery.id,
        fullName: complianceCase.screeningQuery.fullName,
      },
    };
  }
}
