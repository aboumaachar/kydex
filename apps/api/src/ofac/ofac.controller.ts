import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { OFAC_SYNC_TOKEN } from './ofac.constants';
import { OfacClientService } from './ofac.client';
import { OfacService } from './ofac.service';
import { OfacSyncDto } from './dto/ofac-sync.dto';

@Controller('ofac')
export class OfacController {
  constructor(
    private readonly ofac: OfacService,
    private readonly client: OfacClientService,
  ) {}

  @Get('health')
  health() {
    return this.ofac.health();
  }

  @Get('lists')
  lists() {
    return this.ofac.lists();
  }

  @Get('programs')
  programs() {
    return this.ofac.programs();
  }

  @Get('changes/latest')
  latestChanges() {
    return this.client.getLatestChanges();
  }

  @Get('entities/:entityId')
  entity(@Param('entityId') entityId: string) {
    return this.client.getEntity(entityId);
  }

  @Get('entities')
  entities(@Query('list') list?: string, @Query('program') program?: string) {
    if (list) return this.client.getEntitiesByList(list);
    if (program) return this.client.getEntitiesByProgram(program);
    throw new BadRequestException('Provide either list or program.');
  }

  @Post('sync')
  sync(@Headers('x-kydex-sync-token') token: string | undefined, @Body() body: OfacSyncDto) {
    if (token !== OFAC_SYNC_TOKEN) {
      throw new UnauthorizedException('Invalid sync token.');
    }

    return this.ofac.sync({
      files: body.files,
      force: body.force,
      mode: body.mode ?? 'manual',
    });
  }

  @Get('sync/status')
  syncStatus() {
    return this.ofac.syncStatus();
  }
}