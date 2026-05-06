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

type UnifiedMatch = {
  source: string;
  entityId: string;
  primaryName: string;
  primaryNameAr: string | null;
  primaryNameEn: string | null;
  matchedName: string;
  listName: string | null;
  programs: string[];
  score: number;
  riskLevel: string;
  matchReason: string;
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
    const lebanonSource = await this.prisma.kydexDataSource.findUnique({ where: { code: 'LEBANON_NATIONAL_LIST' } });
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

    const requestedSources = normalizedInput.sources.map((value) => value.toUpperCase());
    const includeOfac = requestedSources.includes('OFAC');
    const includeLebanon = requestedSources.includes('LEBANON_NATIONAL_LIST');

    const ofacMatches: UnifiedMatch[] = [];
    if (includeOfac) {
      const candidateSets = await Promise.all(
        queryVariants.map((variant) => {
          const variantNorm = normalizeName(variant);
          const variantTokens = tokenizeName(variant).slice(0, 6);
          return this.findCandidates(variantTokens, variantNorm);
        }),
      );

      const seen = new Set<string>();
      const candidates = candidateSets.flat().filter((name) => {
        if (seen.has(name.id)) return false;
        seen.add(name.id);
        return true;
      });

      for (const name of candidates) {
        const score = calculateNameMatchScore(normalizedInput.query, name.fullName);
        if (score.score < 60) continue;
        ofacMatches.push({
          source: 'OFAC',
          entityId: name.entity.ofacEntityId,
          primaryName: name.entity.primaryName ?? name.fullName,
          primaryNameAr: null,
          primaryNameEn: name.entity.primaryName ?? name.fullName,
          matchedName: name.fullName,
          listName: name.entity.listName,
          programs: name.entity.programs,
          score: score.score,
          riskLevel: score.riskLevel,
          matchReason: score.matchReason,
        });
      }
    }

    const lebanonMatches: UnifiedMatch[] = includeLebanon
      ? await this.findLebanonLocalMatches(normalizedInput.query, queryVariants)
      : [];

    const sourcePriority = (sourceCode: string) => (sourceCode === 'LEBANON_NATIONAL_LIST' ? 2 : sourceCode === 'OFAC' ? 1 : 0);
    const mergedMatches = [...ofacMatches, ...lebanonMatches]
      .sort((left, right) => {
        const diff = right.score - left.score;
        if (Math.abs(diff) <= 5) {
          const priorityDiff = sourcePriority(right.source) - sourcePriority(left.source);
          if (priorityDiff !== 0) return priorityDiff;
        }
        return diff;
      })
      .slice(0, 25);

    const highestScore = mergedMatches[0]?.score ?? 0;
    const status = riskFromScore(highestScore);
    const sourceStatus = {
      ofac: sourceHealth,
      lebanonNationalList: lebanonSource?.status ?? SourceStatus.unknown,
      lastSuccessfulSyncAt: source?.lastSuccessfulSyncAt ?? null,
      lebanonLastSuccessfulSyncAt: lebanonSource?.lastSuccessfulSyncAt ?? null,
      localCopyAvailable,
      lebanonLocalCopyAvailable: Boolean(lebanonSource?.localCopyAvailable),
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

    await Promise.all(
      mergedMatches.map((match) =>
        this.prisma.ofacScreeningMatch.create({
          data: {
            searchId: search.id,
            ofacEntityId: match.entityId,
            ofacEntityDbId: null,
            matchedNameId: null,
            primaryName: match.primaryName,
            matchedName: match.matchedName,
            listName: match.listName,
            programs: match.programs,
            score: match.score,
            riskLevel: match.riskLevel,
            matchReason: match.matchReason,
            rawMatch: {
              source: match.source,
              candidateName: match.matchedName,
              entityId: match.entityId,
              primaryNameAr: match.primaryNameAr,
              primaryNameEn: match.primaryNameEn,
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
        matchCount: mergedMatches.length,
        responseTimeMs,
      },
    });

    const sourceDisplayNameAr: Record<string, string> = {
      OFAC: 'أوفاك',
      LEBANON_NATIONAL_LIST: 'اللائحة الوطنية اللبنانية',
    };

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
      matches: mergedMatches.map((match) => ({
        source: match.source,
        sourceDisplayNameAr: sourceDisplayNameAr[match.source] ?? match.source,
        entityId: match.entityId,
        primaryName: match.primaryName,
        primaryNameAr: match.primaryNameAr,
        primaryNameEn: match.primaryNameEn,
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
        acceptedSources: ['ALL', 'OFAC', 'LEBANON_NATIONAL_LIST'],
      });
    }

    const sources = Array.isArray(dto.sources)
      ? dto.sources.map((value) => value.trim()).filter((value) => value.length > 0)
      : [];

    // Normalize UI placeholder 'ALL' (or wildcard) to OFAC for this endpoint.
    const normalizedSources = sources.map((s) => s.toUpperCase());
    const finalSources =
      normalizedSources.length === 0 || normalizedSources.includes('ALL') || normalizedSources.includes('*')
        ? ['LEBANON_NATIONAL_LIST', 'OFAC']
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

  private async findLebanonLocalMatches(query: string, queryVariants: string[]): Promise<UnifiedMatch[]> {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { code: 'LEBANON_NATIONAL_LIST' },
      include: {
        versions: {
          where: { status: 'ACTIVE' },
          orderBy: { importedAt: 'desc' },
          take: 1,
        },
      },
    });
    const activeVersionId = dataSource?.versions?.[0]?.id;
    if (!dataSource || !activeVersionId) {
      return [];
    }

    const variantTokens = Array.from(
      new Set(
        queryVariants
          .flatMap((variant) => tokenizeName(variant))
          .filter((token) => token.length >= 2),
      ),
    ).slice(0, 8);

    const normalizedQuery = normalizeName(query);
    const candidates = await this.prisma.watchlistRecord.findMany({
      where: {
        dataSourceId: dataSource.id,
        versionId: activeVersionId,
        OR: [
          { normalizedName: { contains: normalizedQuery, mode: 'insensitive' } },
          ...variantTokens.map((token) => ({ normalizedName: { contains: token, mode: 'insensitive' as const } })),
          ...variantTokens.map((token) => ({ arabicNormalizedName: { contains: token, mode: 'insensitive' as const } })),
        ],
      },
      take: 400,
    });

    const result: UnifiedMatch[] = [];
    for (const record of candidates) {
      const payload = (record.rawPayload as Record<string, unknown> | null) ?? {};
      const primaryNameAr = typeof payload.primaryNameAr === 'string' ? payload.primaryNameAr : null;
      const primaryNameEn = typeof payload.primaryNameEn === 'string' ? payload.primaryNameEn : null;

      const names = Array.from(
        new Set([
          record.primaryName,
          ...(record.aliases ?? []),
          ...(record.arabicNormalizedName ? [record.arabicNormalizedName] : []),
          ...(record.latinTransliteratedName ? [record.latinTransliteratedName] : []),
          ...(primaryNameAr ? [primaryNameAr] : []),
          ...(primaryNameEn ? [primaryNameEn] : []),
        ].filter(Boolean)),
      );

      let best: { score: number; riskLevel: string; matchReason: string; matchedName: string } | null = null;
      for (const candidateName of names) {
        const score = calculateNameMatchScore(query, candidateName);
        if (!best || score.score > best.score) {
          best = {
            score: score.score,
            riskLevel: score.riskLevel,
            matchReason: score.matchReason,
            matchedName: candidateName,
          };
        }
      }

      if (!best || best.score < 60) continue;

      result.push({
        source: 'LEBANON_NATIONAL_LIST',
        entityId: record.externalReference ?? record.id,
        primaryName: record.primaryName,
        primaryNameAr,
        primaryNameEn,
        matchedName: best.matchedName,
        listName: typeof payload.listName === 'string' ? payload.listName : 'Lebanon National List',
        programs: Array.isArray(payload.programs) ? payload.programs.filter((value): value is string => typeof value === 'string') : [],
        score: best.score,
        riskLevel: best.riskLevel,
        matchReason: best.matchReason,
      });
    }

    return result;
  }
}