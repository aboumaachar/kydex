import {
  Controller,
  Delete,
  Get,
  MethodNotAllowedException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  list(@Query('limit') limit?: string) {
    return this.auditLogsService.list(limit ? Number(limit) : 100);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  updateAuditLog(@Param('id') _id: string) {
    throw new MethodNotAllowedException('Audit logs are append-only and cannot be edited');
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  deleteAuditLog(@Param('id') _id: string) {
    throw new MethodNotAllowedException('Audit logs are immutable and cannot be deleted');
  }
}
