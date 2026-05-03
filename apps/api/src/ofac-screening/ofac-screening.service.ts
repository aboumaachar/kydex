import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SourceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateNameMatchScore, riskFromScore } from '../ofac/utils/match-score';
import { normalizeName, tokenizeName } from '../ofac/utils/ofac-normalizer';
import { OfacScreeningSearchDto } from './dto/ofac-screening-search.dto';
import { ScreeningLogsQueryDto } from './dto/screening-logs-query.dto';
import {
  generateQueryVariants,
  containsArabic,
  arabicToLatin,
} from '../name-normalization/name-normalization.service';
import { SourcesService } from '../sources/sources.service';

type NormalizedScreeningInput = {
  query: string;
  screeningType: string;
  source: string;
  sources: string[];
  liveVerify: boolean;
};

@Injectable()
export class OfacScreeningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sourcesService: SourcesService,
  ) {}

  async logs(query: ScreeningLogsQueryDto) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const skip = Math.max(query.skip ?? 0, 0);

    const where: Prisma.ScreeningTransactionWhereInput = {};

    if (query.sourceMode) {
      where.sourceMode = query.sourceMode;
    }

    if (typeof query.usedFallback === 'boolean') {
      where.usedFallback = query.usedFallback;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.requesterSlug) {
      where.requesterSlug = { contains: query.requesterSlug, mode: 'insensitive' };
    }

    if (query.apiClient) {
      where.apiClient = { contains: query.apiClient, mode: 'insensitive' };
    }

    if (query.query) {
      where.query = { contains: query.query, mode: 'insensitive' };
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.screeningTransaction.count({ where }),
      this.prisma.screeningTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          query: true,
          normalizedQuery: true,
          queryVariants: true,
          requesterType: true,
          requesterSlug: true,
          sourceMode: true,
          usedFallback: true,
          liveSourceChecked: true,
          sourceStatus: true,
          warning: true,
          apiClient: true,
          wordpressSite: true,
          wpUserId: true,
          clientReference: true,
          ipAddress: true,
          userAgent: true,
          status: true,
          highestScore: true,
          matchCount: true,
          responseTimeMs: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      total,
      take,
      skip,
      items,
    };
  }

  async search(
    dto: OfacScreeningSearchDto,
    context?: {
      userId?: string | null;
      apiKeyId?: string | null;
      wordpressSite?: string | null;
      wpUserId?: string | null;
      endpointType?: 'manual' | 'image' | 'other';
      ipAddress?: string | null;
      userAgent?: string | null;
      apiClient?: string | null;
      requesterType?: string | null;
      ocrMetadata?: {
        fileType?: string | null;
        fileSize?: number | null;
        ocrSuccess?: boolean;
        candidateName?: string | null;
        queryOverrideUsed?: boolean;
        documentNumber?: string | null;
        confidence?: number | null;
        text?: string | null;
      };
    },
  ) {
    const startedAt = Date.now();
    const normalizedInput = this.normalizeScreeningInput(dto);
    const queryVariants = generateQueryVariants(normalizedInput.query);
    const normalizedQuery = containsArabic(normalizedInput.query)
      ? arabicToLatin(normalizedInput.query)
      : normalizeName(normalizedInput.query);

    const source = await this.prisma.kydexDataSource.findUnique({ where: { code: 'OFAC' } });
    const sourceEntityCount = source
      ? await this.prisma.sourceEntity.count({ where: { sourceId: source.id } })
      : 0;

    let sourceHealth = source?.status ?? SourceStatus.unknown;
    const localCopyAvailable = Boolean(source?.localCopyAvailable) || sourceEntityCount > 0;
    let sourceHttpStatus: number | null = null;
    let sourceLatencyMs: number | null = null;
    let sourceCheckedAt: Date | null = null;
    let liveSourceChecked = false;

    if (normalizedInput.liveVerify) {
      liveSourceChecked = true;
      try {
        const liveCheck = await this.sourcesService.healthCheck('OFAC');
        sourceHealth = liveCheck.status;
        sourceHttpStatus = liveCheck.httpStatus;
        sourceLatencyMs = liveCheck.latencyMs;
        sourceCheckedAt = liveCheck.checkedAt;
      } catch {
        sourceHealth = SourceStatus.offline;
      }
    }

    const sourceUnavailable = sourceHealth === SourceStatus.offline;
    const sourceDegraded = sourceHealth === SourceStatus.degraded;
    const usedFallback = (sourceUnavailable || sourceDegraded) && localCopyAvailable;

    let sourceMode = 'local_only';
    let warning: string | null = null;

    if (normalizedInput.liveVerify) {
      if (sourceHealth === SourceStatus.connected) {
        sourceMode = 'live_verified';
      } else if (usedFallback) {
        sourceMode = 'local_fallback';
        warning = 'Live source verification was unavailable. Screening completed using local KYDEX source-library fallback.';
      } else {
        sourceMode = 'degraded';
        warning = 'Live source verification returned incomplete or unavailable status.';
      }
    } else if (usedFallback) {
      sourceMode = 'local_fallback';
      warning = 'Screening completed using local KYDEX copy. Original source unavailable at search time.';
    }

    // Search across all bilingual variants
    const candidateSets = await Promise.all(
      queryVariants.map((variant) => {
        const variantNorm = normalizeName(variant);
        const variantTokens = tokenizeName(variant).slice(0, 6);
        return this.findCandidates(variantTokens, variantNorm);
      }),
    );

    // Deduplicate candidates by OfacName.id
    const seen = new Set<string>();
    const candidates = candidateSets.flat().filter((name) => {
      if (seen.has(name.id)) return false;
      seen.add(name.id);
      return true;
    });

    const scored = candidates
      .map((name) => {
        const score = calculateNameMatchScore(normalizedInput.query, name.fullName);
        return {
          name,
          score: score.score,
          riskLevel: score.riskLevel,
          matchReason: score.matchReason,
        };
      })
      .filter((match) => match.score >= 60)
      .sort((left, right) => right.score - left.score)
      .slice(0, 25);

    const highestScore = scored[0]?.score ?? 0;
    const status = riskFromScore(highestScore);
    const sourceStatus = {
      ofac: sourceHealth,
      lastSuccessfulSyncAt: source?.lastSuccessfulSyncAt ?? null,
      localCopyAvailable,
      checkedAt: sourceCheckedAt,
      httpStatus: sourceHttpStatus,
      latencyMs: sourceLatencyMs,
      liveVerifyRequested: normalizedInput.liveVerify,
      requestedSources: normalizedInput.sources,
    };
    const transactionSourceStatus = context?.ocrMetadata
      ? {
          ...sourceStatus,
          ocr: {
            fileType: context.ocrMetadata.fileType ?? null,
            fileSize: context.ocrMetadata.fileSize ?? null,
            ocrSuccess: context.ocrMetadata.ocrSuccess ?? null,
            candidateName: context.ocrMetadata.candidateName ?? null,
            queryOverrideUsed: context.ocrMetadata.queryOverrideUsed ?? false,
            documentNumber: context.ocrMetadata.documentNumber ?? null,
            confidence: context.ocrMetadata.confidence ?? null,
            text: context.ocrMetadata.text ?? null,
          },
        }
      : sourceStatus;
    const responseTimeMs = Date.now() - startedAt;

    const search = await this.prisma.ofacScreeningSearch.create({
      data: {
        notarySlug: dto.notarySlug,
        userId: context?.userId ?? null,
        apiKeyId: context?.apiKeyId ?? null,
        query: normalizedInput.query,
        normalizedQuery,
        source: normalizedInput.source,
        screeningType: normalizedInput.screeningType,
        clientReference: dto.clientReference,
        wordpressSite: dto.wordpressSite ?? context?.wordpressSite ?? null,
        wpUserId: dto.wpUserId ?? context?.wpUserId ?? null,
        resultStatus: status,
        highestScore,
        queryVariants,
        usedFallback,
        sourceMode,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        responseTimeMs,
      },
    });

    const savedMatches = await Promise.all(
      scored.map((match) =>
        this.prisma.ofacScreeningMatch.create({
          data: {
            searchId: search.id,
            ofacEntityId: match.name.entity.ofacEntityId,
            ofacEntityDbId: match.name.entity.id,
            matchedNameId: match.name.id,
            primaryName: match.name.entity.primaryName,
            matchedName: match.name.fullName,
            listName: match.name.entity.listName,
            programs: match.name.entity.programs,
            score: match.score,
            riskLevel: match.riskLevel,
            matchReason: match.matchReason,
            rawMatch: {
              candidateName: match.name.fullName,
              entityId: match.name.entity.ofacEntityId,
            },
          },
        }),
      ),
    );

    await this.prisma.screeningTransaction.create({
      data: {
        query: normalizedInput.query,
        normalizedQuery,
        queryVariants,
        requesterType: context?.requesterType ?? (dto.notarySlug ? 'notary' : 'api'),
        requesterSlug: dto.notarySlug ?? null,
        sourceMode,
        usedFallback,
        liveSourceChecked,
        sourceStatus: transactionSourceStatus as Prisma.InputJsonValue,
        warning,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        apiClient: context?.apiClient ?? null,
        apiKeyId: context?.apiKeyId ?? null,
        wordpressSite: dto.wordpressSite ?? context?.wordpressSite ?? null,
        wpUserId: dto.wpUserId ?? context?.wpUserId ?? null,
        clientReference: dto.clientReference ?? null,
        status: 'completed',
        highestScore,
        matchCount: savedMatches.length,
        responseTimeMs,
      },
    });

    return {
      status,
      query: normalizedInput.query,
      normalizedQuery,
      highestScore,
      auditId: search.id,
      queryVariants,
      sourceMode,
      usedFallback,
      liveSourceChecked,
      sourceStatus,
      warning,
      matches: savedMatches.map((match) => ({
        source: 'OFAC',
        entityId: match.ofacEntityId,
        primaryName: match.primaryName,
        matchedName: match.matchedName,
        listName: match.listName,
        programs: match.programs,
        score: match.score,
        riskLevel: match.riskLevel,
        matchReason: match.matchReason,
      })),
      disclaimer:
        'KYDEX screening results are decision-support outputs and require professional review before any legal or compliance decision.',
    };
  }

  private normalizeScreeningInput(dto: OfacScreeningSearchDto): NormalizedScreeningInput {
    const query = [dto.query, dto.fullName, dto.subject, dto.name]
      .find((value) => typeof value === 'string' && value.trim().length > 0)
      ?.trim();

    if (!query) {
      throw new BadRequestException({
        status: 'validation_failed',
        message: 'مصدر الفحص غير صالح أو عبارة البحث مفقودة.',
        acceptedFields: ['query', 'fullName', 'subject', 'name'],
        acceptedSources: ['ALL', 'OFAC'],
      });
    }

    const sources = Array.isArray(dto.sources)
      ? dto.sources.map((value) => value.trim()).filter((value) => value.length > 0)
      : [];

    // Normalize UI placeholder 'ALL' (or wildcard) to OFAC for this endpoint.
    const normalizedSources = sources.map((s) => s.toUpperCase());
    const finalSources =
      normalizedSources.length === 0 || normalizedSources.includes('ALL') || normalizedSources.includes('*')
        ? ['OFAC']
        : normalizedSources;

    return {
      query,
      screeningType: dto.screeningType?.trim() || 'ofac',
      source: dto.source?.trim() || 'dashboard',
      sources: finalSources,
      liveVerify: dto.liveVerify === true,
    };
  }

  async audit(id: string) {
    return this.prisma.ofacScreeningSearch.findUnique({
      where: { id },
      include: { matches: true },
    });
  }

  private async findCandidates(tokens: string[], normalizedQuery: string) {
    const whereClauses = tokens.slice(0, 6).map((token) => ({
      normalizedName: { contains: token, mode: 'insensitive' as const },
    }));

    const exact = normalizedQuery
      ? [
          {
            normalizedName: normalizedQuery,
          },
        ]
      : [];

    return this.prisma.ofacName.findMany({
      where: {
        OR: [...exact, ...whereClauses],
      },
      include: {
        entity: true,
      },
      take: 500,
    });
  }
}