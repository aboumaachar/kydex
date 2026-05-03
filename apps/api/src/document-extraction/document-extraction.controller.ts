import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import { ConfirmDocumentExtractionDto } from './dto/confirm-document-extraction.dto';
import { DocumentExtractionService } from './document-extraction.service';

type UploadedDocument = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
};

@Controller('document-extraction')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.NOTARY)
export class DocumentExtractionController {
  private static readonly ALLOWED_MIME_TYPES = new Set<string>([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain',
  ]);
  private static readonly MALWARE_SIGNATURES = ['X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE'];

  constructor(private readonly documentExtractionService: DocumentExtractionService) {}

  @Post('extract')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024),
      },
      fileFilter: (_req, file, callback) => {
        if (!DocumentExtractionController.ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException(`unsupported upload type: ${file.mimetype}`), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  extract(
    @UploadedFile() file: UploadedDocument | undefined,
    @Req() req: Request,
    @Query('documentType') documentType?: string,
    @Query('redactAfterExtract') redactAfterExtract?: string,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (this.hasKnownMalwareSignature(file.buffer)) {
      throw new BadRequestException('upload rejected by malware signature validation');
    }

    const user = req.user as { id?: string; tenantId?: string; role?: string } | undefined;
    return this.documentExtractionService.extractDocument(
      file,
      user,
      documentType,
      redactAfterExtract === 'true',
    );
  }

  private hasKnownMalwareSignature(buffer: Buffer) {
    const body = buffer.toString('utf-8');
    return DocumentExtractionController.MALWARE_SIGNATURES.some((signature) => body.includes(signature));
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: Request, @Body() dto: ConfirmDocumentExtractionDto) {
    const user = req.user as { id?: string; tenantId?: string; role?: string } | undefined;
    return this.documentExtractionService.confirmAndScreen(id, dto, user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id?: string; tenantId?: string; role?: string } | undefined;
    return this.documentExtractionService.getExtraction(id, user);
  }
}
