import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { NotaryApiKeyGuard } from '../notaries/notary-api-key.guard';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  /**
   * External endpoint — accepts notary API key (x-kydex-notary-key)
   * or JWT. Used by WordPress plugins and external clients.
   */
  @Post('screen')
  @UseGuards(NotaryApiKeyGuard)
  screen(@Body() dto: CreateInquiryDto, @Req() req: Request) {
    const r = req as Request & { kydexNotaryProfile?: { slug: string }; kydexNotaryApiKey?: { id: string } };
    return this.inquiriesService.screen(dto, {
      notarySlug: dto.notarySlug ?? r.kydexNotaryProfile?.slug,
      ipAddress: (req.headers['x-forwarded-for'] as string) ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      apiClient: req.headers['x-kydex-client'],
      apiKeyId: r.kydexNotaryApiKey?.id,
      clientType: r.kydexNotaryProfile ? 'notary' : 'api',
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  list(
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.inquiriesService.list(Math.min(take, 200), skip);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.AUDITOR)
  get(@Param('id') id: string) {
    return this.inquiriesService.get(id);
  }
}
