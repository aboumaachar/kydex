import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { CaseStatus, MatchDecision, RiskLevel, UserRole } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CaseActionDto } from './dto/case-action.dto';
import { CasesService } from './cases.service';

const TIMELINE_EXPORT_ROLES = new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN]);

@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.COUNCIL_ADMIN,
  UserRole.COMPLIANCE_OFFICER,
  UserRole.NOTARY,
)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('status') status?: CaseStatus,
    @Query('riskLevel') riskLevel?: RiskLevel,
    @Query('reviewQueue') reviewQueue?: string,
  ) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.list(user, {
      status,
      riskLevel,
      reviewQueue: reviewQueue === 'true',
    });
  }

  @Get('review-queue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  reviewQueue(@Req() req: Request) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.list(user, { reviewQueue: true });
  }

  @Get(':caseId/compliance-timeline')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async getComplianceTimeline(
    @Param('caseId') caseId: string,
    @Req() req: Request,
    @Query('download') download?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    const exportRequested = download === 'true';

    if (exportRequested && (!user?.role || !TIMELINE_EXPORT_ROLES.has(user.role))) {
      throw new ForbiddenException('Only admins may export compliance timelines');
    }

    const timeline = await this.casesService.getComplianceTimeline(caseId, user, {
      exportRequested,
    });
    if (download === 'true' && res) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="case-${caseId}-timeline.json"`);
    }
    return timeline;
  }

  @Get(':caseId')
  getById(@Param('caseId') caseId: string, @Req() req: Request) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.getById(caseId, user);
  }

  @Post(':caseId/actions')
  addAction(@Param('caseId') caseId: string, @Req() req: Request, @Body() dto: CaseActionDto) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.addAction(caseId, user, dto.action, dto.notes);
  }

  @Post(':caseId/assign-reviewer')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  assignReviewer(
    @Param('caseId') caseId: string,
    @Req() req: Request,
    @Body('reviewerId') reviewerId?: string,
    @Body('notes') notes?: string,
  ) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.assignReviewer(caseId, user, reviewerId, notes);
  }

  @Post(':caseId/committee-decision')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  recordCommitteeDecision(
    @Param('caseId') caseId: string,
    @Req() req: Request,
    @Body('decision') decision?: string,
    @Body('notes') notes?: string,
  ) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.recordCommitteeDecision(caseId, user, decision, notes);
  }

  @Post(':caseId/match-decision-review')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  reviewMatchDecision(
    @Param('caseId') caseId: string,
    @Req() req: Request,
    @Body('reviewerDecision') reviewerDecision?: MatchDecision,
    @Body('reviewerJustification') reviewerJustification?: string,
  ) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.reviewMatchDecision(caseId, user, reviewerDecision, reviewerJustification);
  }

  @Post(':caseId/escalate-internal')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  escalateInternal(
    @Param('caseId') caseId: string,
    @Req() req: Request,
    @Body('notes') notes?: string,
  ) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.updateStatus(caseId, user, CaseStatus.ESCALATED_INTERNALLY, notes);
  }

  @Post(':caseId/prepare-sic-package')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  prepareSicPackage(
    @Param('caseId') caseId: string,
    @Req() req: Request,
    @Body('notes') notes?: string,
  ) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.updateStatus(caseId, user, CaseStatus.SIC_PACKAGE_PREPARED, notes);
  }

  @Post(':caseId/sic-approval')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  processSicApproval(
    @Param('caseId') caseId: string,
    @Req() req: Request,
    @Body('approved') approved?: boolean,
    @Body('notes') notes?: string,
  ) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.processSicApproval(caseId, user, approved, notes);
  }

  @Post(':caseId/evidence-package')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  generateEvidencePackage(@Param('caseId') caseId: string, @Req() req: Request) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.generateEvidencePackage(caseId, user);
  }

  @Get(':caseId/evidence-package')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  getLatestEvidencePackage(@Param('caseId') caseId: string, @Req() req: Request) {
    const user = req.user as { id?: string; role?: UserRole; tenantId?: string } | undefined;
    return this.casesService.getLatestEvidencePackage(caseId, user);
  }
}
