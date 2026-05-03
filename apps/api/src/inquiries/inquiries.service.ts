import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NameNormalizationService } from '../name-normalization/name-normalization.service';
import { OfacScreeningService } from '../ofac-screening/ofac-screening.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nameNormalization: NameNormalizationService,
    private readonly ofacScreening: OfacScreeningService,
  ) {}

  async screen(
    dto: CreateInquiryDto,
    context: {
      notarySlug?: string;
      ipAddress?: string;
      userAgent?: string;
      apiClient?: string | string[];
      apiKeyId?: string;
      clientType?: string;
    },
  ) {
    const startedAt = Date.now();
    const variants = this.nameNormalization.generateVariants(dto.query);
    const normalizedQuery = this.nameNormalization.normalizeLatin(dto.query);
    const apiClient = Array.isArray(context.apiClient) ? context.apiClient[0] : context.apiClient;

    // Create transaction record
    const transaction = await this.prisma.screeningTransaction.create({
      data: {
        query: dto.query,
        normalizedQuery,
        queryVariants: variants,
        requesterType: context.clientType ?? 'api',
        requesterSlug: dto.notarySlug ?? context.notarySlug ?? null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        apiClient: apiClient ?? null,
        apiKeyId: context.apiKeyId ?? null,
        wordpressSite: dto.wordpressSite ?? null,
        wpUserId: dto.wpUserId ?? null,
        clientReference: dto.clientReference ?? null,
        status: 'pending',
        sourceMode: 'local_only',
        usedFallback: false,
      },
    });

    // Run screening through ofac-screening service
    let screeningResult: Awaited<ReturnType<OfacScreeningService['search']>>;
    try {
      screeningResult = await this.ofacScreening.search(
        {
          query: dto.query,
          screeningType: dto.screeningType ?? 'ofac',
          source: 'api',
          notarySlug: dto.notarySlug ?? context.notarySlug,
          wpUserId: dto.wpUserId,
          wordpressSite: dto.wordpressSite,
          clientReference: dto.clientReference,
          dateOfBirth: dto.dateOfBirth,
          nationality: dto.nationality,
        },
        {
          userId: null,
          apiKeyId: context.apiKeyId ?? null,
          wordpressSite: dto.wordpressSite ?? null,
          wpUserId: dto.wpUserId ?? null,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          apiClient: apiClient ?? null,
          requesterType: context.clientType ?? 'api',
        },
      );
    } catch (err: unknown) {
      await this.prisma.screeningTransaction.update({
        where: { id: transaction.id },
        data: { status: 'error' },
      });
      throw err;
    }

    // Update transaction with result
    await this.prisma.screeningTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        highestScore: screeningResult.highestScore,
        matchCount: screeningResult.matches.length,
        sourceMode: screeningResult.sourceMode,
        usedFallback: Boolean(screeningResult.usedFallback),
        liveSourceChecked: false,
        sourceStatus: JSON.parse(JSON.stringify(screeningResult.sourceStatus ?? null)),
        warning: screeningResult.warning ?? null,
        responseTimeMs: Date.now() - startedAt,
      },
    });

    // Create inquiry record
    const inquiry = await this.prisma.incomingInquiry.create({
      data: {
        transactionId: transaction.id,
        clientType: context.clientType ?? 'api',
        clientId: context.apiKeyId ?? null,
        notarySlug: dto.notarySlug ?? null,
        wordpressSite: dto.wordpressSite ?? null,
        originalPayload: JSON.parse(JSON.stringify(dto)),
        responsePayload: JSON.parse(JSON.stringify(screeningResult)),
        status: 'completed',
      },
    });

    return {
      inquiryId: inquiry.id,
      transactionId: transaction.id,
      ...screeningResult,
      queryVariants: variants,
    };
  }

  async list(take = 50, skip = 0) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.incomingInquiry.count(),
      this.prisma.incomingInquiry.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { transaction: { select: { id: true, query: true, highestScore: true, matchCount: true, status: true, createdAt: true } } },
      }),
    ]);
    return { total, take, skip, items };
  }

  async get(id: string) {
    const inquiry = await this.prisma.incomingInquiry.findUnique({
      where: { id },
      include: { transaction: true },
    });
    if (!inquiry) throw new NotFoundException(`Inquiry not found: ${id}`);
    return inquiry;
  }
}
