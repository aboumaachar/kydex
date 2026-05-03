import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from '../prisma/prisma.service';
import { OfacScreeningSearchDto } from '../ofac-screening/dto/ofac-screening-search.dto';
import { OfacScreeningService } from '../ofac-screening/ofac-screening.service';
import { NotaryApiKeyGuard } from './notary-api-key.guard';
import { NotaryImageScreeningDto } from './dto/notary-image-screening.dto';
import { NotaryOcrService } from './notary-ocr.service';
import { NotaryUsagePolicyService } from './notary-usage-policy.service';

type UploadedDocument = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
};

const BASE_ALLOWED_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/heic',
]);

@Controller('notaries/:slug/screening')
export class NotaryScreeningController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly screening: OfacScreeningService,
    private readonly ocr: NotaryOcrService,
    private readonly usagePolicy: NotaryUsagePolicyService,
  ) {}

  @Get('config')
  async config(@Param('slug') slug: string) {
    const notary = await this.prisma.notaryProfile.findUnique({
      where: { slug },
      select: {
        slug: true,
        displayName: true,
        isScreeningEnabled: true,
        membershipStatus: true,
        featureManualScreening: true,
        featureImageScreening: true,
        featureAuditLookup: true,
        featureAdminStatusTools: true,
      },
    });

    return {
      slug,
      displayName: notary?.displayName ?? slug,
      enabled: Boolean(notary?.isScreeningEnabled),
      membershipActive: notary?.membershipStatus === 'ACTIVE',
      requiredHeader: 'x-kydex-notary-key',
      supportedScreeningTypes: ['ofac'],
      features: {
        manualScreening: notary?.featureManualScreening ?? true,
        imageScreening: notary?.featureImageScreening ?? false,
        auditLookup: notary?.featureAuditLookup ?? false,
        adminStatusTools: notary?.featureAdminStatusTools ?? false,
      },
      disclaimer:
        'KYDEX screening results are decision-support outputs and require professional review before any legal or compliance decision.',
    };
  }

  @Post('search')
  @UseGuards(NotaryApiKeyGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async search(@Param('slug') slug: string, @Body() body: OfacScreeningSearchDto, @Req() req: any) {
    const notary = req.kydexNotaryProfile as Awaited<ReturnType<typeof this.prisma.notaryProfile.findUnique>>;

    if (!notary) {
      throw new ForbiddenException('Notary profile is required for screening.');
    }

    if (!notary.featureManualScreening) {
      throw new ForbiddenException('Manual screening is not enabled for this notary account.');
    }

    await this.usagePolicy.enforceMembershipAndRateLimit({
      profile: notary,
      apiKey: req.kydexNotaryApiKey,
      endpointType: 'manual',
      ipAddress: (req.headers['x-forwarded-for'] as string) ?? req.socket?.remoteAddress ?? null,
      wordpressSite: req.kydexWordPressSite ?? null,
    });

    const apiClient = (req.headers['x-kydex-client'] as string | undefined) ?? null;
    const apiClientName = (req.headers['x-kydex-client-name'] as string | undefined) ?? null;
    const sourceDefault = apiClient === 'external-api-client' ? 'external_api_client' : 'notary_webpage';

    const result = await this.screening.search(
      {
        ...body,
        notarySlug: slug,
        source: body.source ?? sourceDefault,
        screeningType: 'ofac',
      },
      {
        apiKeyId: req.kydexNotaryApiKey?.id,
        wordpressSite: req.kydexWordPressSite ?? null,
        wpUserId: body.wpUserId ?? null,
        ipAddress: (req.headers['x-forwarded-for'] as string) ?? req.socket?.remoteAddress ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        apiClient: apiClientName ? `${apiClient ?? 'unknown'}:${apiClientName}` : apiClient,
        requesterType: 'notary',
        endpointType: 'manual',
      },
    );

    await this.prisma.notaryScreeningUsage.create({
      data: {
        notarySlug: slug,
        apiKeyId: req.kydexNotaryApiKey?.id ?? null,
        screeningSearchId: result.auditId,
      },
    });

    await this.usagePolicy.incrementUsage(slug, 'manual');

    return result;
  }

  @Post('image')
  @UseGuards(NotaryApiKeyGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024),
      },
      fileFilter: (_req, file, callback) => {
        if (!BASE_ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException(`unsupported upload type: ${file.mimetype}`), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  async imageSearch(
    @Param('slug') slug: string,
    @Body() body: NotaryImageScreeningDto,
    @UploadedFile() file: UploadedDocument | undefined,
    @Req() req: any,
  ) {
    const notary = req.kydexNotaryProfile as Awaited<ReturnType<typeof this.prisma.notaryProfile.findUnique>>;

    if (!notary) {
      throw new ForbiddenException('Notary profile is required for image screening.');
    }

    if (!notary.featureImageScreening) {
      throw new ForbiddenException('Image screening is not enabled for this notary account.');
    }

    await this.usagePolicy.enforceMembershipAndRateLimit({
      profile: notary,
      apiKey: req.kydexNotaryApiKey,
      endpointType: 'image',
      ipAddress: (req.headers['x-forwarded-for'] as string) ?? req.socket?.remoteAddress ?? null,
      wordpressSite: body.wordpressSite ?? req.kydexWordPressSite ?? null,
    });

    const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024);

    let imageBuffer: Buffer;
    let mimeType = file?.mimetype ?? body.mimeType ?? 'application/octet-stream';
    let fileSize = file?.size ?? file?.buffer?.length ?? 0;

    if (file) {
      imageBuffer = file.buffer;
    } else if (body.imageBase64) {
      try {
        imageBuffer = Buffer.from(body.imageBase64, 'base64');
      } catch {
        throw new BadRequestException('imageBase64 is not valid base64.');
      }
      fileSize = imageBuffer.length;
    } else {
      throw new BadRequestException('file or imageBase64 is required.');
    }

    if (!BASE_ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`unsupported upload type: ${mimeType}`);
    }

    if (mimeType === 'image/heic' && !(await this.ocr.supportsHeicRuntime())) {
      throw new BadRequestException('image/heic is not supported by current runtime.');
    }

    if (fileSize <= 0) {
      throw new BadRequestException('uploaded file is empty.');
    }

    if (fileSize > maxUploadBytes) {
      throw new BadRequestException(`uploaded file exceeds max size (${maxUploadBytes} bytes).`);
    }

    const ocrResult = this.ocr.extract({
      buffer: imageBuffer,
      mimeType,
      size: fileSize,
    });

    const queryOverride = body.queryOverride?.trim() || undefined;
    const screeningQuery = queryOverride || ocrResult.candidateName;
    const hasReliableName = Boolean(queryOverride) || ocrResult.reliableName;

    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.socket?.remoteAddress ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    const apiClient = req.headers['x-kydex-client'] ?? null;
    const wordpressSite = body.wordpressSite ?? req.kydexWordPressSite ?? null;
    const wpUserId = body.wpUserId ?? null;

    if (!screeningQuery || !hasReliableName) {
      await this.prisma.screeningTransaction.create({
        data: {
          query: screeningQuery ?? '[ocr:no-reliable-name]',
          normalizedQuery: null,
          queryVariants: [],
          requesterType: 'notary',
          requesterSlug: slug,
          sourceMode: 'ocr_only',
          usedFallback: false,
          liveSourceChecked: false,
          sourceStatus: {
            ofac: 'not_checked',
            localCopyAvailable: null,
            lastSuccessfulSyncAt: null,
            ocr: {
              fileType: mimeType,
              fileSize,
              ocrSuccess: false,
              candidateName: ocrResult.candidateName ?? null,
              queryOverrideUsed: Boolean(queryOverride),
              documentNumber: ocrResult.documentNumber ?? null,
              confidence: ocrResult.confidence,
              text: ocrResult.text,
            },
          },
          warning: null,
          ipAddress,
          userAgent,
          apiClient,
          apiKeyId: req.kydexNotaryApiKey?.id ?? null,
          wordpressSite,
          wpUserId,
          clientReference: body.clientReference ?? null,
          status: 'ocr_review_required',
          highestScore: 0,
          matchCount: 0,
          responseTimeMs: null,
        },
      });

      return {
        status: 'ocr_review_required',
        message: 'No reliable name was extracted. Please enter a manual name override.',
        ocr: {
          candidateName: ocrResult.candidateName ?? null,
          dateOfBirth: ocrResult.dateOfBirth ?? null,
          nationality: ocrResult.nationality ?? null,
          documentNumber: ocrResult.documentNumber ?? null,
          confidence: ocrResult.confidence,
          text: ocrResult.text,
        },
      };
    }

    const result = await this.screening.search(
      {
        query: screeningQuery,
        dateOfBirth: ocrResult.dateOfBirth,
        nationality: ocrResult.nationality,
        notarySlug: slug,
        source: 'notary_image_screening',
        screeningType: 'ofac',
        clientReference: body.clientReference,
        wpUserId: body.wpUserId,
        wordpressSite: body.wordpressSite,
      },
      {
        apiKeyId: req.kydexNotaryApiKey?.id,
        wordpressSite,
        wpUserId,
        ipAddress,
        userAgent,
        apiClient,
        requesterType: 'notary',
        endpointType: 'image',
        ocrMetadata: {
          fileType: mimeType,
          fileSize,
          ocrSuccess: true,
          candidateName: ocrResult.candidateName ?? null,
          queryOverrideUsed: Boolean(queryOverride),
          documentNumber: ocrResult.documentNumber ?? null,
          confidence: ocrResult.confidence,
          text: ocrResult.text,
        },
      },
    );

    await this.prisma.notaryScreeningUsage.create({
      data: {
        notarySlug: slug,
        apiKeyId: req.kydexNotaryApiKey?.id ?? null,
        screeningSearchId: result.auditId,
      },
    });

    await this.usagePolicy.incrementUsage(slug, 'image');

    return {
      ...result,
      ocr: {
        candidateName: ocrResult.candidateName ?? null,
        dateOfBirth: ocrResult.dateOfBirth ?? null,
        nationality: ocrResult.nationality ?? null,
        documentNumber: ocrResult.documentNumber ?? null,
        confidence: ocrResult.confidence,
        text: ocrResult.text,
      },
    };
  }
}