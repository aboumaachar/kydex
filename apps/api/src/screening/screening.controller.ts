import { Body, Controller, Get, Param, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ScreenDto, screenSchema } from './dto/screen.dto';
import { ScreeningService } from './screening.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScreeningController {
  constructor(private readonly screeningService: ScreeningService) {}

  @Post('screen')
  @UsePipes(new ZodValidationPipe(screenSchema))
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COUNCIL_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.NOTARY,
  )
  async screen(@Body() dto: ScreenDto, @Req() req: Request) {
    const user = req.user as { id: string; tenantId: string };
    return this.screeningService.screen(user.tenantId, user.id, dto, req.ip, req.get('user-agent'));
  }

  @Get('screen/:queryId/audit-trail')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COUNCIL_ADMIN,
    UserRole.AUDITOR,
    UserRole.COMPLIANCE_OFFICER,
  )
  getAuditTrail(@Param('queryId') queryId: string) {
    return this.screeningService.getAuditTrail(queryId);
  }
}
