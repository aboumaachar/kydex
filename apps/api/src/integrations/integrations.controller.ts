import { Body, Controller, Get, Param, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { bulkScreenSchema, BulkScreenDto } from '../bulk-screening/dto/bulk-screen.dto';
import { screenSchema, ScreenDto } from '../screening/dto/screen.dto';
import { IntegrationApiKeyGuard } from './integration-api-key.guard';
import { CreateIntegrationKeyDto } from './dto/create-integration-key.dto';
import { UpdateIntegrationKeyStatusDto } from './dto/update-integration-key-status.dto';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('screen')
  @UseGuards(IntegrationApiKeyGuard, RolesGuard)
  @Roles(UserRole.API_CLIENT)
  @UsePipes(new ZodValidationPipe(screenSchema))
  screen(@Body() dto: ScreenDto, @Req() req: Request) {
    const actor = req.user as { tenantId: string; apiKeyId: string; integrationCapabilities?: string[] };
    this.integrationsService.assertCapability(actor, 'screen');
    return this.integrationsService.integrationScreen(actor, dto, req.ip, req.headers['user-agent']);
  }

  @Post('bulk-screen')
  @UseGuards(IntegrationApiKeyGuard, RolesGuard)
  @Roles(UserRole.API_CLIENT)
  @UsePipes(new ZodValidationPipe(bulkScreenSchema))
  bulkScreen(@Body() dto: BulkScreenDto, @Req() req: Request) {
    const actor = req.user as { tenantId: string; apiKeyId: string; integrationCapabilities?: string[] };
    this.integrationsService.assertCapability(actor, 'bulk-screen');
    return this.integrationsService.integrationBulkScreen(actor, dto, req.ip, req.headers['user-agent']);
  }

  @Get('status')
  @UseGuards(IntegrationApiKeyGuard, RolesGuard)
  @Roles(UserRole.API_CLIENT)
  status(@Req() req: Request) {
    const actor = req.user as { tenantId: string; apiKeyId: string; integrationCapabilities?: string[] };
    this.integrationsService.assertCapability(actor, 'status');
    return this.integrationsService.integrationStatus(actor);
  }

  @Get('usage')
  @UseGuards(IntegrationApiKeyGuard, RolesGuard)
  @Roles(UserRole.API_CLIENT)
  usage(@Req() req: Request) {
    const actor = req.user as { tenantId: string; apiKeyId: string; integrationCapabilities?: string[] };
    this.integrationsService.assertCapability(actor, 'usage');
    return this.integrationsService.integrationUsage(actor);
  }

  @Get('keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  listKeys(@Req() req: Request) {
    const user = req.user as { tenantId: string };
    return this.integrationsService.listKeys(user.tenantId);
  }

  @Post('keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  createKey(@Body() dto: CreateIntegrationKeyDto, @Req() req: Request) {
    const user = req.user as { id?: string; tenantId: string };
    return this.integrationsService.createKey(user.tenantId, user.id, dto);
  }

  @Post('keys/:keyId/rotate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  rotateKey(@Param('keyId') keyId: string, @Req() req: Request) {
    const user = req.user as { id?: string; tenantId: string };
    return this.integrationsService.rotateKey(user.tenantId, user.id, keyId);
  }

  @Post('keys/:keyId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  updateKeyStatus(@Param('keyId') keyId: string, @Body() dto: UpdateIntegrationKeyStatusDto, @Req() req: Request) {
    const user = req.user as { id?: string; tenantId: string };
    return this.integrationsService.updateKeyStatus(user.tenantId, user.id, keyId, dto.status);
  }
}