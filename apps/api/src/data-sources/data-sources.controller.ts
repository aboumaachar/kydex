import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateDataSourceDto } from './dto/create-data-source.dto';
import { SyncOfficialSourcesDto } from './dto/sync-official-sources.dto';
import { DataSourcesService } from './data-sources.service';

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
};

@Controller('data-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
export class DataSourcesController {
  private readonly logger = new Logger(DataSourcesController.name);
  private static readonly ALLOWED_MIME_TYPES = new Set<string>([
    'text/csv',
    'application/csv',
    'application/json',
    'application/xml',
    'text/xml',
    'text/plain',
  ]);
  private static readonly MALWARE_SIGNATURES = [
    String.raw`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE`,
  ];

  constructor(private readonly dataSourcesService: DataSourcesService) {}

  @Get()
  list() {
    return this.dataSourcesService.list();
  }

  @Post('upload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024),
      },
      fileFilter: (_req, file, callback) => {
        if (!DataSourcesController.ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException(`unsupported upload type: ${file.mimetype}`), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  upload(
    @Body() dto: CreateDataSourceDto,
    @UploadedFile() file: UploadedFile | undefined,
    @Req() req: Request,
  ) {
    if (file && this.hasKnownMalwareSignature(file.buffer)) {
      throw new BadRequestException('upload rejected by malware signature validation');
    }

    if (process.env.UPLOAD_DEBUG_LOGS === 'true') {
      this.logger.log(
        JSON.stringify({
          event: 'upload_received',
          filename: file?.originalname ?? null,
          mimetype: file?.mimetype ?? null,
          size: file?.size ?? file?.buffer?.length ?? 0,
          preview: file?.buffer?.toString('utf-8', 0, 200) ?? '',
        }),
      );
    }

    const user = req.user as { id?: string; tenantId?: string } | undefined;
    return this.dataSourcesService.ingestUpload(dto, file, user?.tenantId, user?.id);
  }

  private hasKnownMalwareSignature(buffer: Buffer) {
    const body = buffer.toString('utf-8');
    return DataSourcesController.MALWARE_SIGNATURES.some((signature) => body.includes(signature));
  }

  @Post('sync-official')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  syncOfficialSources(@Body() dto: SyncOfficialSourcesDto, @Req() req: Request) {
    const user = req.user as { id?: string; tenantId?: string } | undefined;
    return this.dataSourcesService.syncOfficialSources(dto.sources, user?.tenantId, user?.id);
  }

  @Get(':sourceCode/versions')
  versions(@Param('sourceCode') sourceCode: string) {
    return this.dataSourcesService.versions(sourceCode);
  }

  @Get(':sourceCode/ingestion-runs')
  ingestionRuns(@Param('sourceCode') sourceCode: string) {
    return this.dataSourcesService.ingestionRuns(sourceCode);
  }

  @Get(':sourceCode/sync-history')
  syncHistory(@Param('sourceCode') sourceCode: string) {
    return this.dataSourcesService.syncHistory(sourceCode);
  }

  @Get(':sourceCode/versions/:versionId/report')
  report(@Param('sourceCode') sourceCode: string, @Param('versionId') versionId: string) {
    return this.dataSourcesService.report(sourceCode, versionId);
  }

  @Get(':sourceCode/records')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  records(
    @Param('sourceCode') sourceCode: string,
    @Query()
    query: {
      q?: string;
      alias?: string;
      nationality?: string;
      entityType?: string;
      documentNumber?: string;
      program?: string;
      versionId?: string;
      page?: string;
      limit?: string;
      sort?: string;
      createdFrom?: string;
      createdTo?: string;
    },
    @Req() req: Request,
  ) {
    const user = req.user as { id?: string; tenantId?: string } | undefined;
    return this.dataSourcesService.records(
      sourceCode,
      {
        ...query,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      },
      user?.tenantId,
      user?.id,
    );
  }

  @Get(':sourceCode/records/:recordId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER)
  recordDetail(@Param('sourceCode') sourceCode: string, @Param('recordId') recordId: string, @Req() req: Request) {
    const user = req.user as { id?: string; tenantId?: string } | undefined;
    return this.dataSourcesService.recordDetail(sourceCode, recordId, user?.tenantId, user?.id);
  }

  @Post(':sourceCode/enable')
  enableSource(@Param('sourceCode') sourceCode: string, @Req() req: Request) {
    const user = req.user as { id?: string; tenantId?: string } | undefined;
    return this.dataSourcesService.enableSource(sourceCode, user?.tenantId, user?.id);
  }

  @Post(':sourceCode/disable')
  disableSource(@Param('sourceCode') sourceCode: string, @Req() req: Request) {
    const user = req.user as { id?: string; tenantId?: string } | undefined;
    return this.dataSourcesService.disableSource(sourceCode, user?.tenantId, user?.id);
  }

  @Post(':sourceCode/versions/:versionId/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  activateVersion(
    @Param('sourceCode') sourceCode: string,
    @Param('versionId') versionId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id?: string; tenantId?: string } | undefined;
    return this.dataSourcesService.activateVersion(sourceCode, versionId, user?.tenantId, user?.id);
  }

  @Post(':sourceCode/versions/:versionId/archive')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN)
  archiveVersion(
    @Param('sourceCode') sourceCode: string,
    @Param('versionId') versionId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id?: string; tenantId?: string } | undefined;
    return this.dataSourcesService.archiveVersion(sourceCode, versionId, user?.tenantId, user?.id);
  }
}
