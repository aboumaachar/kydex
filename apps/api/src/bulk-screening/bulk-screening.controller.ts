import { Body, Controller, Get, Param, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BulkScreeningService } from './bulk-screening.service';
import { BulkScreenDto, bulkScreenSchema } from './dto/bulk-screen.dto';

@Controller('bulk-screen')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulkScreeningController {
  constructor(private readonly bulkScreeningService: BulkScreeningService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(bulkScreenSchema))
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  enqueue(@Body() dto: BulkScreenDto, @Req() req: Request) {
    const user = req.user as { id: string; tenantId: string };
    return this.bulkScreeningService.enqueue(user.tenantId, user.id, dto);
  }

  @Get(':jobId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  getStatus(@Param('jobId') jobId: string) {
    return this.bulkScreeningService.getStatus(jobId);
  }
}
