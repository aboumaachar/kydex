import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateNotaryKeyDto } from './dto/create-notary-key.dto';
import { NotaryAdminService } from './notary-admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
export class NotaryAdminController {
  constructor(private readonly adminService: NotaryAdminService) {}

  @Get('notary-keys')
  listNotaryKeys() {
    return this.adminService.listNotaryKeys();
  }

  @Post('notary-keys')
  createNotaryKey(@Body() dto: CreateNotaryKeyDto) {
    return this.adminService.createNotaryKey(dto);
  }

  @Post('notary-keys/:id/rotate')
  rotateNotaryKey(@Param('id') id: string) {
    return this.adminService.rotateKey(id);
  }

  @Post('notary-keys/:id/revoke')
  revokeNotaryKey(@Param('id') id: string) {
    return this.adminService.revokeKey(id);
  }

  @Post('notary-keys/:id/suspend')
  suspendNotaryKey(@Param('id') id: string) {
    return this.adminService.suspendKey(id);
  }

  @Post('notary-keys/:id/activate')
  activateNotaryKey(@Param('id') id: string) {
    return this.adminService.activateKey(id);
  }

  @Get('notary-keys/:id/usage')
  usageByKey(@Param('id') id: string) {
    return this.adminService.keyUsage(id);
  }

  @Get('notaries')
  listNotaries() {
    return this.adminService.listNotaries();
  }

  @Get('notaries/:slug')
  notaryBySlug(@Param('slug') slug: string) {
    return this.adminService.getNotaryBySlug(slug);
  }

  @Get('usage')
  usageSummary() {
    return this.adminService.usageSummary();
  }

  @Get('monitoring')
  monitoringSummary() {
    return this.adminService.monitoringSummary();
  }
}
