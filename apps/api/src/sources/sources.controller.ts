import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { SourcesService } from './sources.service';

@Controller('sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  list() {
    return this.sourcesService.listSources();
  }

  @Get(':source/status')
  status(@Param('source') source: string) {
    return this.sourcesService.getSourceStatus(source);
  }

  @Post(':source/health-check')
  healthCheck(@Param('source') source: string) {
    return this.sourcesService.healthCheck(source);
  }

  @Get(':source/sync-runs')
  syncRuns(@Param('source') source: string) {
    return this.sourcesService.listSyncRuns(source);
  }

  @Get(':source/import-status')
  importStatus(@Param('source') source: string) {
    return this.sourcesService.getImportStatus(source);
  }

  @Post(':source/import-from-legacy')
  importFromLegacy(@Param('source') source: string) {
    return this.sourcesService.importFromLegacy(source);
  }

  @Post('lebanon-national-list/sync')
  syncLebanonNationalList() {
    return this.sourcesService.syncLebanonNationalList();
  }

  @Get('ofac/sanctions-lists')
  ofacLists() {
    return this.sourcesService.getOfacSanctionsLists();
  }
}
