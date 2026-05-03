import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScreeningSearchDto } from './dto/screening-search.dto';
import { normalizeName, tokenizeName } from '../ofac/utils/ofac-normalizer';
import { calculateNameMatchScore, riskFromScore } from '../ofac/utils/match-score';

@Injectable()
export class ScreeningService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: ScreeningSearchDto, context?: { userId?: string | null; apiKeyId?: string | null }) {
    const normalizedQuery = normalizeName(dto.query);
    const tokens = tokenizeName(dto.query);

    const candidates = await this.findCandidates(tokens, normalizedQuery);

    const scored = candidates
      .map((name) => {
        const score = calculateNameMatchScore(dto.query, name.fullName);
        return {
          name,
          score: score.score,
          riskLevel: score.riskLevel,
          matchReason: score.matchReason,
        };
      })
      .filter((match) => match.score >= 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);

    const highestScore = scored[0]?.score ?? 0;
    const status = riskFromScore(highestScore);

    const search = await this.prisma.screeningSearch.create({
      data: {
        notarySlug: dto.notarySlug,
        userId: context?.userId ?? null,
        apiKeyId: context?.apiKeyId ?? null,
        query: dto.query,
        normalizedQuery,
        source: dto.source ?? 'api',
        screeningType: dto.screeningType ?? 'ofac',
        clientReference: dto.clientReference,
        resultStatus: status,
        highestScore,
      },
    });

    const savedMatches = await Promise.all(
      scored.map((match) =>
        this.prisma.screeningMatch.create({
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

    return {
      status,
      query: dto.query,
      normalizedQuery,
      highestScore,
      auditId: search.id,
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

  async audit(id: string) {
    return this.prisma.screeningSearch.findUnique({
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
