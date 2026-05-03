import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OfacScreeningSearchDto } from './dto/ofac-screening-search.dto';
import { ScreeningLogsQueryDto } from './dto/screening-logs-query.dto';
import { OfacScreeningService } from './ofac-screening.service';

@Controller('screening')
export class OfacScreeningController {
  constructor(private readonly screening: OfacScreeningService) {}

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.AUDITOR)
  logs(@Query() query: ScreeningLogsQueryDto) {
    return this.screening.logs(query);
  }

  @Post('search')
  search(@Body() body: OfacScreeningSearchDto) {
    return this.screening.search({
      ...body,
      source: body.source ?? 'dashboard',
      screeningType: body.screeningType ?? 'ofac',
    });
  }

  @Get('audit/:id')
  audit(@Param('id') id: string) {
    return this.screening.audit(id);
  }
}