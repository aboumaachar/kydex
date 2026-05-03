import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SourceLibraryService } from './source-library.service';

@Controller('sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
export class SourceLibraryController {
  constructor(private readonly sourceLibraryService: SourceLibraryService) {}

  /** Sources with a local copy available for offline screening. */
  @Get('available')
  available() {
    return this.sourceLibraryService.getAvailableSources();
  }

  @Get(':source/lists')
  lists(@Param('source') source: string) {
    return this.sourceLibraryService.listImportedLists(source);
  }

  @Get(':source/lists/:listName/preview')
  preview(
    @Param('source') source: string,
    @Param('listName') listName: string,
    @Query('take', new DefaultValuePipe(25), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.sourceLibraryService.previewList(source, listName, Math.min(take, 100), skip);
  }

  /** Bulk export of all entities in a list (max 10 000). Returns JSON; frontend handles CSV conversion. */
  @Get(':source/lists/:listName/download')
  download(
    @Param('source') source: string,
    @Param('listName') listName: string,
  ) {
    return this.sourceLibraryService.downloadList(source, listName);
  }

  /** Arabic / bilingual coverage statistics for a list. */
  @Get(':source/lists/:listName/translation-status')
  translationStatus(
    @Param('source') source: string,
    @Param('listName') listName: string,
  ) {
    return this.sourceLibraryService.getTranslationStatus(source, listName);
  }

  @Get(':source/entities/:entityId')
  entity(@Param('source') source: string, @Param('entityId') entityId: string) {
    return this.sourceLibraryService.getEntity(source, entityId);
  }

  @Get(':source/files')
  files(@Param('source') source: string) {
    return this.sourceLibraryService.listSourceFiles(source);
  }

  @Get(':source/stats')
  stats(@Param('source') source: string) {
    return this.sourceLibraryService.getSourceStats(source);
  }
}
