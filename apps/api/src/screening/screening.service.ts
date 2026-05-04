import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CasePriority, CaseStatus, MatchDecision, RiskLevel } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchDecisionService } from '../scoring/match-decision.service';
import { ScoringService } from '../scoring/scoring.service';
import { ScreenDto } from './dto/screen.dto';

const WEAK_COMMON_NAME_TOKENS = new Set([
  'ali',
  'ahmad',
  'ahmed',
  'john',
  'mohamad',
  'mohamed',
  'mohammad',
  'mohammed',
  'muhammad',
  'omar',
  'smith',
]);

type CandidateField = 'primaryName' | 'alias';

type CandidateVariant = {
  field: CandidateField;
  displayName: string;
  comparableName: string;
};

type CandidateEvidence = {
  field: CandidateField;
  displayName: string;
  comparableName: string;
  similarity: number;
  matchedToken: string | null;
  tokenOverlap: number;
  normalizedExactMatch: boolean;
  transliterationMatched: boolean;
  nearTokenMatched: boolean;
};

@Injectable()
export class ScreeningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingService: MatchingService,
    private readonly scoringService: ScoringService,
    private readonly matchDecisionService: MatchDecisionService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async screen(
    tenantId: string,
    userId: string | undefined,
    dto: ScreenDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const resolvedQuery = this.resolveScreeningQuery(dto);
    dto.fullName = resolvedQuery;
    const screeningName = resolvedQuery;

    const normalizedName = this.matchingService.normalizeName(screeningName);
    const queryTokens = this.matchingService.getNormalizedTokens(normalizedName);
    const hasArabicQuery = this.matchingService.containsArabicScript(screeningName);
    const screeningSources = await this.resolveScreeningSources(dto.sources);
    this.assertLocalOnlyScreeningContext(screeningSources);

    const records = await this.prisma.watchlistRecord.findMany({
      where: {
        versionId: {
          in: screeningSources.usedLocalVersions.map((entry) => entry.versionId),
        },
      },
      include: {
        dataSource: true,
        version: true,
      },
    });

    let highestScore = 0;
    let highestRisk: RiskLevel = RiskLevel.LOW;

    const computedMatches = records
      .map((record) => {
        const primaryNameCandidates = this.collectCandidateNames(
          record.primaryName,
          record.normalizedName,
          record.arabicNormalizedName,
          record.latinTransliteratedName,
        );
        const aliasCandidates = this.collectCandidateNames(
          record.aliases,
          record.normalizedAliases,
          record.arabicNormalizedAliases,
        );
        const primaryCandidateVariants = this.collectPrimaryCandidateVariants(
          record.primaryName,
          record.normalizedName,
          record.arabicNormalizedName,
          record.latinTransliteratedName,
        );
        const aliasCandidateVariants = this.collectAliasCandidateVariants(
          record.aliases,
          record.normalizedAliases,
          record.arabicNormalizedAliases,
        );
        const candidateNames = [...primaryNameCandidates, ...aliasCandidates];
        const rawScriptCandidates = this.collectCandidateNames(record.primaryName, record.aliases);
        const primaryEvidence = this.findBestEvidence(screeningName, queryTokens, primaryCandidateVariants);
        const aliasEvidence = this.findBestEvidence(screeningName, queryTokens, aliasCandidateVariants);
        const bestEvidence = this.chooseBestEvidence(primaryEvidence, aliasEvidence);
        const aliasEvidenceMatched = Boolean(aliasEvidence && this.hasCandidateLevelEvidence(aliasEvidence));
        const primaryNameScore = primaryEvidence?.similarity ?? 0;
        const aliasScore = aliasEvidenceMatched && aliasEvidence
          ? aliasEvidence.similarity
          : 0;
        const nameScore = Math.max(primaryNameScore, aliasScore);
        const normalizedQueryName = this.matchingService.normalizeName(screeningName);
        const exactAliasMatched = Boolean(aliasEvidence?.normalizedExactMatch && this.hasCandidateLevelEvidence(aliasEvidence));
        const nationalityMatched =
          !!dto.nationality &&
          !!record.nationality &&
          this.matchingService.normalizeName(dto.nationality) === this.matchingService.normalizeName(record.nationality);
        const nationalityMismatch =
          !!dto.nationality &&
          !!record.nationality &&
          !nationalityMatched;
        const dobMatched =
          !!dto.dateOfBirth && !!record.dateOfBirth && dto.dateOfBirth === record.dateOfBirth;
        const dobMismatch = !!dto.dateOfBirth && !!record.dateOfBirth && !dobMatched;
        const docMatched =
          !!dto.documentNumber &&
          Array.isArray(record.documentNumbers) &&
          record.documentNumbers.some(
            (documentNumber) =>
              this.matchingService.normalizeName(documentNumber) ===
              this.matchingService.normalizeName(dto.documentNumber!),
          );
        const docMismatch =
          !!dto.documentNumber &&
          Array.isArray(record.documentNumbers) &&
          record.documentNumbers.length > 0 &&
          !docMatched;
        const maxSharedTokenCount = candidateNames.reduce(
          (highestSharedTokenCount, candidateName) =>
            Math.max(
              highestSharedTokenCount,
              this.matchingService.countSharedTokens(normalizedName, candidateName),
            ),
          0,
        );
        const hasLongCandidateOverlap = candidateNames.some((candidateName) => {
          const candidateTokens = this.matchingService.getNormalizedTokens(candidateName);
          return (
            candidateTokens.length > 4 &&
            this.matchingService.countSharedTokens(normalizedName, candidateName) > 0
          );
        });
        const hasShortPermutationCandidate = candidateNames.some((candidateName) => {
          const candidateTokens = this.matchingService.getNormalizedTokens(candidateName);
          return (
            queryTokens.length === 2 &&
            candidateTokens.length === 2 &&
            this.matchingService.countSharedTokens(normalizedName, candidateName) === 2 &&
            this.matchingService.normalizeName(candidateName) !== normalizedName
          );
        });
        const arabicSignals = this.buildArabicSignals(screeningName, queryTokens, candidateNames, rawScriptCandidates);
        const tokenOverlap = Math.max(bestEvidence?.tokenOverlap ?? 0, arabicSignals.arabicTokenOverlap);
        const hasCandidateLevelEvidence = Boolean(bestEvidence && this.hasCandidateLevelEvidence(bestEvidence));
        const hasStrongPrimaryEvidence = Boolean(
          primaryEvidence &&
            (
              primaryEvidence.normalizedExactMatch ||
              primaryEvidence.tokenOverlap > 0 ||
              primaryEvidence.transliterationMatched ||
              primaryEvidence.nearTokenMatched ||
              primaryEvidence.similarity >= 0.75
            ),
        );
        const isWeakSingleTokenEntityAliasOnlyMatch =
          !hasArabicQuery &&
          this.isWeakCommonNameQuery(queryTokens) &&
          queryTokens.length === 1 &&
          bestEvidence?.field === 'alias' &&
          !hasStrongPrimaryEvidence &&
          !nationalityMatched &&
          !dobMatched &&
          !docMatched;

        let score = Math.min(
          1,
          nameScore * 0.67 +
            (nationalityMatched ? 0.1 : 0) +
            (dobMatched ? 0.1 : 0) +
            (docMatched ? 0.25 : 0),
        );

        if (arabicSignals.arabicNormalizedMatch || arabicSignals.arabicTransliterationMatch) {
          score = Math.min(1, score + 0.05);
        }

        if (arabicSignals.arabicFamilyNameMatch) {
          score = Math.min(1, score + 0.03);
        }

        if (
          !hasArabicQuery &&
          !nationalityMatched &&
          !dobMatched &&
          !docMatched &&
          queryTokens.length > 1 &&
          maxSharedTokenCount < 2 &&
          nameScore < 0.85
        ) {
          score = Math.min(score, 0.49);
        }

        if (
          !hasArabicQuery &&
          !nationalityMatched &&
          !dobMatched &&
          !docMatched &&
          queryTokens.length <= 2 &&
          hasLongCandidateOverlap
        ) {
          score = Math.min(score, 0.49);
        }

        if (
          !hasArabicQuery &&
          !nationalityMatched &&
          !dobMatched &&
          !docMatched &&
          hasShortPermutationCandidate
        ) {
          score = Math.min(score, 0.49);
        }

        if (
          this.isWeakCommonNameQuery(queryTokens) &&
          !hasCandidateLevelEvidence &&
          !exactAliasMatched &&
          nameScore < 0.9 &&
          !nationalityMatched &&
          !dobMatched &&
          !docMatched
        ) {
          score = Math.min(score, 0.49);
        }

        if (isWeakSingleTokenEntityAliasOnlyMatch) {
          score = 0;
        }

        if (!hasCandidateLevelEvidence) {
          score = 0;
        }

        const riskLevel = this.scoringService.classifyRisk(score, docMatched);
        const classification = this.scoringService.classifyMatch(score);
        const matchEvidence = this.buildMatchEvidence(bestEvidence, normalizedQueryName);
        const simpleReasonArabic = this.buildSimpleArabicReason(bestEvidence, normalizedQueryName);

        if (score > highestScore) {
          highestScore = score;
          highestRisk = riskLevel;
        }

        return {
          watchlistRecordId: record.id,
          sourceCode: record.dataSource.code,
          matchedName: record.primaryName,
          matchedField: bestEvidence?.field ?? null,
          matchedAlias: aliasEvidenceMatched && aliasEvidence ? aliasEvidence.displayName : null,
          matchedAliasScore: aliasScore,
          matchedToken: bestEvidence?.matchedToken ?? null,
          tokenOverlap,
          matchEvidence,
          simpleReasonArabic,
          simplifiedArabicReason: simpleReasonArabic,
          score,
          nameScore: primaryNameScore,
          aliasScore,
          aliasMatched: aliasScore >= 0.75,
          exactAliasMatched,
          transliterationMatched: Boolean(bestEvidence?.transliterationMatched),
          arabicExactMatch: arabicSignals.arabicExactMatch,
          arabicNormalizedMatch: arabicSignals.arabicNormalizedMatch,
          arabicTransliterationMatch: arabicSignals.arabicTransliterationMatch,
          arabicTokenOverlap: arabicSignals.arabicTokenOverlap,
          arabicFatherNameMatch: arabicSignals.arabicFatherNameMatch,
          arabicFamilyNameMatch: arabicSignals.arabicFamilyNameMatch,
          nationalityMatched,
          nationalityMismatch,
          dobMatched,
          dobMismatch,
          docMatched,
          docMismatch,
          programOrCategory: this.extractProgramText(record.rawPayload),
          riskLevel,
          classification,
          matchReason: [matchEvidence, this.scoringService.buildExplanation({
            nameScore,
            nationalityMatched,
            dobMatched,
            docMatched,
            source: record.dataSource.code,
            version: record.version.versionLabel,
            riskLevel,
          })].filter(Boolean).join(' | '),
          sourceVersionLabel: record.version.versionLabel,
        };
      })
      .filter((match) => match.score >= 0.5 && this.hasVisibleEvidenceForResult(match))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const topDecisionCandidate = computedMatches[0]
      ? {
          watchlistRecordId: computedMatches[0].watchlistRecordId,
          sourceCode: computedMatches[0].sourceCode,
          matchedName: computedMatches[0].matchedName,
          score: computedMatches[0].score,
          classification: String(computedMatches[0].classification),
          nameScore: computedMatches[0].nameScore,
          aliasScore: computedMatches[0].aliasScore,
          aliasMatched: computedMatches[0].aliasMatched,
          exactAliasMatched: computedMatches[0].exactAliasMatched,
          transliterationMatched: computedMatches[0].transliterationMatched,
          arabicExactMatch: computedMatches[0].arabicExactMatch,
          arabicNormalizedMatch: computedMatches[0].arabicNormalizedMatch,
          arabicTransliterationMatch: computedMatches[0].arabicTransliterationMatch,
          arabicTokenOverlap: computedMatches[0].arabicTokenOverlap,
          arabicFatherNameMatch: computedMatches[0].arabicFatherNameMatch,
          arabicFamilyNameMatch: computedMatches[0].arabicFamilyNameMatch,
          nationalityMatched: computedMatches[0].nationalityMatched,
          nationalityMismatch: computedMatches[0].nationalityMismatch,
          dobMatched: computedMatches[0].dobMatched,
          dobMismatch: computedMatches[0].dobMismatch,
          docMatched: computedMatches[0].docMatched,
          docMismatch: computedMatches[0].docMismatch,
          programOrCategory: computedMatches[0].programOrCategory,
        }
      : undefined;
    const decision = this.matchDecisionService.evaluate({
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      nationality: dto.nationality,
      documentNumber: dto.documentNumber,
      topCandidate: topDecisionCandidate,
      totalMatches: computedMatches.length,
    });
    const resolvedRiskLevel = this.resolveDecisionRisk(decision.decision, highestRisk);

    const query = await this.prisma.screeningQuery.create({
      data: {
        tenantId,
        userId,
        fullName: dto.fullName,
        normalizedName,
        dateOfBirth: dto.dateOfBirth,
        nationality: dto.nationality,
        documentNumber: dto.documentNumber,
        transactionType: dto.transactionType,
        sourcesUsed: screeningSources.searchedSources,
        highestScore,
        riskLevel: resolvedRiskLevel,
        matchDecision: decision.decision,
        decisionConfidence: decision.decisionConfidence,
        reasonSummary: decision.reasonSummary,
        recommendedAction: decision.recommendedAction,
        supportingFactors: decision.supportingFactors,
        weakeningFactors: decision.weakeningFactors,
        clientReference: dto.clientReference,
        ipAddress,
      },
    });

    if (computedMatches.length > 0) {
      await this.prisma.screeningMatch.createMany({
        data: computedMatches.map((match) => ({
          watchlistRecordId: match.watchlistRecordId,
          sourceCode: match.sourceCode,
          matchedName: match.matchedName,
          score: match.score,
          riskLevel: match.riskLevel,
          classification: match.classification,
          matchReason: match.matchReason,
          sourceVersionLabel: match.sourceVersionLabel,
          queryId: query.id,
        })),
      });
    }

    const caseRouting = this.resolveCaseRouting(decision.decision);
    const requiresEscalation = caseRouting.shouldCreateCase;

    let caseId: string | undefined;
    let caseStatus: CaseStatus | undefined;
    if (caseRouting.shouldCreateCase) {
      const desiredStatus = caseRouting.status;

      const existingCase = await this.prisma.complianceCase.findUnique({
        where: { screeningQueryId: query.id },
      });

      if (existingCase) {
        caseId = existingCase.id;
        caseStatus = existingCase.status;

        await this.auditLogsService.log({
          tenantId,
          userId,
          action: 'CASE_LINKED',
          entityType: 'COMPLIANCE_CASE',
          entityId: existingCase.id,
          ipAddress,
          userAgent,
          metadata: {
            screeningQueryId: query.id,
          },
        });
      } else {
        const priority = this.deriveCasePriority(caseRouting.riskLevel);
        const slaTargetAt = this.deriveSlaTarget(priority);

        const createdCase = await this.prisma.complianceCase.create({
          data: {
            tenantId,
            screeningQueryId: query.id,
            riskLevel: caseRouting.riskLevel,
            originalDecision: decision.decision,
            priority,
            priorityRaisedAt:
              priority === CasePriority.HIGH || priority === CasePriority.CRITICAL
                ? new Date()
                : null,
            slaTargetAt,
            reviewerLockedById: null,
            reviewerLockAcquiredAt: null,
            reviewerLockExpiresAt: null,
            slaBreachedAt: null,
            slaAlertedAt: null,
            finalAuthorityUserId: null,
            finalAuthorityRole: null,
            finalAuthoritySignedAt: null,
            finalAuthoritySignatureHash: null,
            status: desiredStatus,
          },
        });

        caseId = createdCase.id;
        caseStatus = createdCase.status;

        await this.auditLogsService.log({
          tenantId,
          userId,
          action: 'CASE_CREATED',
          entityType: 'COMPLIANCE_CASE',
          entityId: createdCase.id,
          ipAddress,
          userAgent,
          metadata: {
            status: createdCase.status,
            riskLevel: caseRouting.riskLevel,
            screeningQueryId: query.id,
            decision: decision.decision,
            recommendedAction: decision.recommendedAction,
          },
        });

        await this.auditLogsService.log({
          tenantId,
          userId,
          action: 'CASE_STATUS_CHANGED',
          entityType: 'COMPLIANCE_CASE',
          entityId: createdCase.id,
          ipAddress,
          userAgent,
          metadata: {
            status: createdCase.status,
          },
        });
      }
    }

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'MATCH_DECISION_GENERATED',
      entityType: 'SCREENING_QUERY',
      entityId: query.id,
      ipAddress,
      userAgent,
      metadata: {
        queryId: query.id,
        caseId,
        decision: decision.decision,
        confidence: decision.decisionConfidence,
        recommendedAction: decision.recommendedAction,
        supportingFactors: decision.supportingFactors,
        weakeningFactors: decision.weakeningFactors,
      },
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'SCREEN_LOCAL_ONLY_ENFORCED',
      entityType: 'SCREENING_QUERY',
      entityId: query.id,
      ipAddress,
      userAgent,
      metadata: {
        searchedSources: screeningSources.searchedSources,
        usedLocalVersions: screeningSources.usedLocalVersions,
      },
    });

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'SCREEN_QUERY',
      entityType: 'SCREENING_QUERY',
      entityId: query.id,
      ipAddress,
      userAgent,
      metadata: {
        searchedSources: screeningSources.searchedSources,
        usedLocalVersions: screeningSources.usedLocalVersions,
        riskLevel: resolvedRiskLevel,
        matchCount: computedMatches.length,
        decision: decision.decision,
      },
    });

    return {
      queryId: query.id,
      riskLevel: resolvedRiskLevel,
      highestScore,
      classification: this.scoringService.classifyMatch(highestScore),
      candidateClassification: this.scoringService.classifyMatch(highestScore),
      matchDecision: decision.decision,
      decision: decision.decision,
      confidence: decision.decisionConfidence,
      decisionConfidence: decision.decisionConfidence,
      reasonSummary: decision.reasonSummary,
      recommendedAction: decision.recommendedAction,
      supportingFactors: decision.supportingFactors,
      weakeningFactors: decision.weakeningFactors,
      requiresEscalation,
      caseId,
      caseStatus,
      caseLink: caseId ? `/cases/${caseId}` : null,
      matches: computedMatches.map((m) => ({
        source: m.sourceCode,
        matchedName: m.matchedName,
        matchedField: m.matchedField,
        matchedAlias: m.matchedAlias,
        matchedAliasScore: m.matchedAliasScore,
        matchedToken: m.matchedToken,
        tokenOverlap: m.tokenOverlap,
        matchEvidence: m.matchEvidence,
        simpleReasonArabic: m.simpleReasonArabic,
        simplifiedArabicReason: m.simplifiedArabicReason,
        score: m.score,
        riskLevel: m.riskLevel,
        classification: m.classification,
        candidateClassification: m.classification,
        reason: m.matchReason,
        nameScore: m.nameScore,
        aliasScore: m.aliasScore,
        aliasMatched: m.aliasMatched,
        transliterationMatched: m.transliterationMatched,
        arabicExactMatch: m.arabicExactMatch,
        arabicNormalizedMatch: m.arabicNormalizedMatch,
        arabicTransliterationMatch: m.arabicTransliterationMatch,
        arabicTokenOverlap: m.arabicTokenOverlap,
        arabicFatherNameMatch: m.arabicFatherNameMatch,
        arabicFamilyNameMatch: m.arabicFamilyNameMatch,
        nationalityMatched: m.nationalityMatched,
        nationalityMismatch: m.nationalityMismatch,
        dobMatched: m.dobMatched,
        dobMismatch: m.dobMismatch,
        docMatched: m.docMatched,
        docMismatch: m.docMismatch,
        programOrCategory: m.programOrCategory,
        sourceVersion: m.sourceVersionLabel,
      })),
      searchedSources: screeningSources.searchedSources,
      usedLocalVersions: screeningSources.usedLocalVersions,
      audit: {
        screenedAt: query.createdAt,
        sourcesUsed: screeningSources.searchedSources,
      },
    };
  }

  private resolveScreeningQuery(dto: ScreenDto): string {
    const value = [dto.query, dto.fullName, dto.subject, dto.name]
      .find((entry) => typeof entry === 'string' && entry.trim().length > 0)
      ?.trim();

    if (value) {
      return value;
    }

    throw new BadRequestException({
      status: 'validation_failed',
      message: 'A screening query is required.',
      acceptedFields: ['query', 'fullName', 'subject', 'name'],
    });
  }

  private collectCandidateNames(...values: Array<string | string[] | null | undefined>) {
    return [...new Set(values
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .flatMap((value) => String(value ?? '').split('|'))
      .map((value) => value.trim())
      .filter(Boolean))];
  }

  private collectPrimaryCandidateVariants(...values: Array<string | null | undefined>) {
    const displayName = values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ?? '';
    return this.collectComparableCandidates('primaryName', displayName, values);
  }

  private collectAliasCandidateVariants(
    aliases?: string[] | null,
    normalizedAliases?: string[] | null,
    arabicNormalizedAliases?: string[] | null,
  ) {
    const originalAliases = this.collectCandidateNames(aliases);
    const normalized = this.collectCandidateNames(normalizedAliases);
    const arabicNormalized = this.collectCandidateNames(arabicNormalizedAliases);
    const variants: CandidateVariant[] = [];

    originalAliases.forEach((alias) => {
      variants.push({
        field: 'alias',
        displayName: alias,
        comparableName: alias,
      });
    });

    normalized.forEach((alias, index) => {
      variants.push({
        field: 'alias',
        displayName: originalAliases[index] ?? alias,
        comparableName: alias,
      });
    });

    arabicNormalized.forEach((alias, index) => {
      variants.push({
        field: 'alias',
        displayName: originalAliases[index] ?? alias,
        comparableName: alias,
      });
    });

    return this.deduplicateComparableCandidates(variants);
  }

  private collectComparableCandidates(
    field: CandidateField,
    displayName: string,
    values: Array<string | null | undefined>,
  ) {
    return this.deduplicateComparableCandidates(
      values
        .flatMap((value) => String(value ?? '').split('|'))
        .map((value) => value.trim())
        .filter(Boolean)
        .map((comparableName) => ({
          field,
          displayName: displayName || comparableName,
          comparableName,
        })),
    );
  }

  private deduplicateComparableCandidates(candidates: CandidateVariant[]) {
    const seen = new Set<string>();

    return candidates.filter((candidate) => {
      const key = `${candidate.field}:${candidate.displayName}:${candidate.comparableName}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private findBestEvidence(
    screeningName: string,
    queryTokens: string[],
    candidates: CandidateVariant[],
  ): CandidateEvidence | null {
    if (candidates.length === 0) {
      return null;
    }

    return candidates
      .map((candidate) => this.evaluateCandidateEvidence(screeningName, queryTokens, candidate))
      .sort((left, right) => this.scoreEvidence(right) - this.scoreEvidence(left))[0] ?? null;
  }

  private evaluateCandidateEvidence(
    screeningName: string,
    queryTokens: string[],
    candidate: CandidateVariant,
  ): CandidateEvidence {
    const similarity = this.matchingService.computeNameSimilarity(screeningName, candidate.comparableName);
    const normalizedCandidate = this.matchingService.normalizeName(candidate.comparableName);
    const normalizedQuery = this.matchingService.normalizeName(screeningName);
    const candidateTokens = this.matchingService.getNormalizedTokens(candidate.comparableName);
    const sharedTokens = [...new Set(queryTokens.filter((token) => candidateTokens.includes(token)))];
    const normalizedExactMatch = normalizedCandidate === normalizedQuery;

    let matchedToken = sharedTokens[0] ?? null;
    let transliterationMatched = false;
    let nearTokenMatched = false;

    if (!matchedToken) {
      for (const token of queryTokens) {
        const queryKey = this.matchingService.toLatinSearchKey(token);
        const transliteratedToken = candidateTokens.find((candidateToken) => {
          const candidateKey = this.matchingService.toLatinSearchKey(candidateToken);
          return Boolean(queryKey) && candidateKey === queryKey;
        });

        if (transliteratedToken) {
          matchedToken = transliteratedToken;
          transliterationMatched = true;
          break;
        }
      }
    }

    if (!matchedToken && queryTokens.length === 1) {
      const [queryToken] = queryTokens;
      const nearToken = candidateTokens.find(
        (candidateToken) => this.matchingService.computeNameSimilarity(queryToken, candidateToken) >= 0.92,
      );

      if (nearToken) {
        matchedToken = nearToken;
        nearTokenMatched = true;
      }
    }

    const tokenOverlap = sharedTokens.length > 0 ? sharedTokens.length : 0;

    return {
      field: candidate.field,
      displayName: candidate.displayName,
      comparableName: candidate.comparableName,
      similarity,
      matchedToken,
      tokenOverlap: tokenOverlap || (matchedToken ? 1 : 0),
      normalizedExactMatch,
      transliterationMatched,
      nearTokenMatched,
    };
  }

  private chooseBestEvidence(primaryEvidence: CandidateEvidence | null, aliasEvidence: CandidateEvidence | null) {
    if (!primaryEvidence) {
      return aliasEvidence;
    }

    if (!aliasEvidence) {
      return primaryEvidence;
    }

    return this.scoreEvidence(aliasEvidence) > this.scoreEvidence(primaryEvidence)
      ? aliasEvidence
      : primaryEvidence;
  }

  private scoreEvidence(evidence: CandidateEvidence) {
    return (
      evidence.tokenOverlap * 100 +
      Number(evidence.normalizedExactMatch) * 40 +
      Number(evidence.transliterationMatched) * 20 +
      Number(evidence.nearTokenMatched) * 10 +
      evidence.similarity
    );
  }

  private hasCandidateLevelEvidence(evidence: CandidateEvidence) {
    return Boolean(
      evidence.normalizedExactMatch ||
      evidence.tokenOverlap > 0 ||
      evidence.transliterationMatched ||
      evidence.nearTokenMatched,
    );
  }

  private hasVisibleEvidenceForResult(match: {
    matchedField?: string | null;
    matchedAlias?: string | null;
    matchedToken?: string | null;
    tokenOverlap?: number;
    matchEvidence?: string | null;
  }) {
    return Boolean(
      (match.matchedField && match.matchEvidence) ||
      match.matchedAlias ||
      match.matchedToken ||
      Number(match.tokenOverlap ?? 0) > 0,
    );
  }

  private buildMatchEvidence(evidence: CandidateEvidence | null, normalizedQuery: string) {
    if (!evidence || !this.hasCandidateLevelEvidence(evidence)) {
      return 'No explainable identity evidence was found for this candidate.';
    }

    const target = evidence.field === 'alias' ? `Alias "${evidence.displayName}"` : `Primary name "${evidence.displayName}"`;

    if (evidence.normalizedExactMatch) {
      return `${target} exactly matches the query "${normalizedQuery}" after normalization.`;
    }

    if (evidence.transliterationMatched && evidence.matchedToken) {
      return `${target} matched the query through transliteration on token "${evidence.matchedToken}".`;
    }

    if (evidence.nearTokenMatched && evidence.matchedToken) {
      return `${target} contains the near-name token "${evidence.matchedToken}" that aligns with the query.`;
    }

    if (evidence.matchedToken) {
      return `${target} contains the token "${evidence.matchedToken}" that matches the query.`;
    }

    return `${target} produced explainable identity evidence for the submitted query.`;
  }

  private buildSimpleArabicReason(evidence: CandidateEvidence | null, normalizedQuery: string) {
    if (!evidence || !this.hasCandidateLevelEvidence(evidence)) {
      return 'لم يتم عرض هذه النتيجة لأن KYDEX لم يجد دليلا اسميا قابلا للتفسير.';
    }

    const subject = evidence.field === 'alias'
      ? `ظهر هذا السجل لأن الاسم البديل "${evidence.displayName}"`
      : `ظهر هذا السجل لأن الاسم المدرج "${evidence.displayName}"`;

    if (evidence.normalizedExactMatch) {
      return `${subject} يطابق عبارة البحث "${normalizedQuery}" بعد التطبيع.`;
    }

    if (evidence.transliterationMatched && evidence.matchedToken) {
      return `${subject} يطابق عبارة البحث عبر التحويل الصوتي في المقطع "${evidence.matchedToken}".`;
    }

    if (evidence.nearTokenMatched && evidence.matchedToken) {
      return `${subject} يحتوي على مقطع قريب من عبارة البحث وهو "${evidence.matchedToken}".`;
    }

    if (evidence.matchedToken) {
      return `${subject} يحتوي على المقطع "${evidence.matchedToken}" المطابق لعبارة البحث.`;
    }

    return `${subject} قدم دليلا اسميا مباشرا يبرر ظهوره في النتائج.`;
  }

  private buildArabicSignals(
    queryFullName: string,
    queryTokens: string[],
    candidateNames: string[],
    rawScriptCandidates: string[],
  ) {
    const queryArabic = this.matchingService.containsArabicScript(queryFullName)
      ? this.matchingService.normalizeArabicName(queryFullName)
      : null;
    const queryLatinKey = this.matchingService.toLatinSearchKey(queryFullName);
    const hasArabicContext = !!queryArabic || rawScriptCandidates.some((name) => this.matchingService.containsArabicScript(name));

    if (!hasArabicContext) {
      return {
        arabicExactMatch: false,
        arabicNormalizedMatch: false,
        arabicTransliterationMatch: false,
        arabicTokenOverlap: 0,
        arabicFatherNameMatch: false,
        arabicFamilyNameMatch: false,
      };
    }

    const candidateTokenSets = candidateNames.map((name) => this.matchingService.getNormalizedTokens(name));
    const arabicExactMatch = rawScriptCandidates.some((name) => name.trim() === queryFullName.trim());
    const arabicNormalizedMatch = !!queryArabic && rawScriptCandidates.some(
      (name) => this.matchingService.containsArabicScript(name) && this.matchingService.normalizeArabicName(name) === queryArabic,
    );
    const arabicTransliterationMatch = candidateNames.some(
      (name) => this.matchingService.toLatinSearchKey(name) === queryLatinKey,
    );
    const arabicTokenOverlap = candidateNames.reduce(
      (best, name) => Math.max(best, this.matchingService.countSharedTokens(queryFullName, name)),
      0,
    );
    const arabicFatherNameMatch = queryTokens.length >= 2 && candidateTokenSets.some(
      (tokens) => tokens.length >= 2 && tokens[1] === queryTokens[1],
    );
    const arabicFamilyNameMatch = queryTokens.length >= 2 && candidateTokenSets.some(
      (tokens) => tokens.length >= 2 && tokens.at(-1) === queryTokens.at(-1),
    );

    return {
      arabicExactMatch,
      arabicNormalizedMatch,
      arabicTransliterationMatch,
      arabicTokenOverlap,
      arabicFatherNameMatch,
      arabicFamilyNameMatch,
    };
  }

  private isWeakCommonNameQuery(queryTokens: string[]) {
    return queryTokens.length > 0 && queryTokens.length <= 2 && queryTokens.every((token) => WEAK_COMMON_NAME_TOKENS.has(token));
  }

  private async resolveScreeningSources(requestedSources?: string[]) {
    const normalized = (requestedSources ?? [])
      .map((entry) => entry.trim().toUpperCase())
      .filter(Boolean);

    const normalizedForScreening = normalized.includes('ALL') ? ['OFAC'] : normalized;

    const searchedSources =
      normalizedForScreening.length === 0 || normalizedForScreening.includes('*')
        ? this.expandRequestedSources(['OFAC'])
        : this.expandRequestedSources(normalizedForScreening);

    const uniqueCodes = [...new Set(searchedSources)];
    const usedLocalVersions = await Promise.all(
      uniqueCodes.map(async (sourceCode) => {
        const activeVersion = await this.getActiveVersionOrFail(sourceCode);
        return {
          sourceCode,
          versionId: activeVersion.id,
          versionLabel: activeVersion.versionLabel,
          importedAt: activeVersion.importedAt,
          fileHash: activeVersion.fileHash,
          sourceHealth: this.deriveSourceHealth(activeVersion.importedAt),
          lastSyncAt: activeVersion.importedAt,
          stale: this.isStale(activeVersion.importedAt),
          warning: this.isStale(activeVersion.importedAt)
            ? `This source was last synchronized ${this.ageInDays(activeVersion.importedAt)} days ago. Please refresh before relying on results.`
            : null,
        };
      }),
    );

    return {
      searchedSources: uniqueCodes,
      usedLocalVersions,
    };
  }

  private expandRequestedSources(normalizedSources: string[]) {
    const expanded: string[] = [];

    for (const source of normalizedSources) {
      if (source === 'OFAC') {
        expanded.push('OFAC_SDN');
        continue;
      }

      if (source === 'UNSEC' || source === 'UN' || source === 'UNSEC_CONSOLIDATED') {
        expanded.push('UNSEC_CONSOLIDATED');
        continue;
      }

      if (source === 'OFAC_SDN' || source === 'OFAC_CONSOLIDATED') {
        expanded.push(source);
        continue;
      }

      if (source === 'LOCAL' || source === 'LOCAL_MANUAL' || source === 'MANUAL') {
        expanded.push('LOCAL_MANUAL');
        continue;
      }

      expanded.push(source);
    }

    return expanded;
  }

  private async getAllImportedSourceCodes() {
    const sources = await this.prisma.dataSource.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        code: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    const codes = sources.map((source) => source.code);
    if (codes.length === 0) {
      throw new ServiceUnavailableException({
        code: 'SOURCE_NOT_READY',
        message: 'No active local source versions are available for screening.',
        reason: 'NO_ACTIVE_SOURCES',
      });
    }

    return codes;
  }

  private async getActiveVersionOrFail(sourceCode: string) {
    const source = await this.prisma.dataSource.findUnique({
      where: { code: sourceCode },
      include: {
        versions: {
          where: {
            status: 'ACTIVE',
            recordCount: {
              gt: 0,
            },
          },
          orderBy: {
            importedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!source) {
      throw new BadRequestException(`Unknown source: ${sourceCode}`);
    }

    if (source.status !== 'ACTIVE') {
      throw new ServiceUnavailableException({
        code: 'SOURCE_NOT_READY',
        sourceCode,
        reason: 'SOURCE_DISABLED',
        message: `Source is disabled: ${sourceCode}`,
      });
    }

    const activeVersion = source.versions[0];
    if (activeVersion) {
      return activeVersion;
    }

    throw new ServiceUnavailableException({
      code: 'SOURCE_NOT_READY',
      sourceCode,
      reason: 'NO_ACTIVE_VERSION',
      message: `No active version for source: ${sourceCode}`,
    });
  }

  private assertLocalOnlyScreeningContext(context: {
    searchedSources: string[];
    usedLocalVersions: Array<{
      sourceCode: string;
      versionId: string;
      versionLabel: string;
      importedAt: Date;
      fileHash: string | null;
      sourceHealth: string;
      lastSyncAt: Date;
      stale: boolean;
      warning: string | null;
    }>;
  }) {
    if (context.searchedSources.length === 0 || context.usedLocalVersions.length === 0) {
      throw new ServiceUnavailableException({
        code: 'SOURCE_NOT_READY',
        message: 'Local-only screening context could not be resolved.',
        reason: 'LOCAL_CONTEXT_UNRESOLVED',
      });
    }
  }

  private deriveSourceHealth(importedAt: Date) {
    return this.isStale(importedAt) ? 'STALE' : 'OK';
  }

  private isStale(importedAt: Date) {
    return this.ageInDays(importedAt) >= Number(process.env.SOURCE_STALE_DAYS ?? 14);
  }

  private ageInDays(importedAt: Date) {
    return Math.floor((Date.now() - importedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  async getAuditTrail(queryId: string) {
    const query = await this.prisma.screeningQuery.findUnique({
      where: { id: queryId },
      include: {
        matches: true,
      },
    });

    if (!query) {
      throw new NotFoundException('Screening not found');
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'SCREENING_QUERY',
        entityId: queryId,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { query, auditLogs };
  }

  private deriveCasePriority(riskLevel: RiskLevel): CasePriority {
    if (riskLevel === RiskLevel.CRITICAL) {
      return CasePriority.CRITICAL;
    }

    if (riskLevel === RiskLevel.HIGH) {
      return CasePriority.HIGH;
    }

    return CasePriority.STANDARD;
  }

  private deriveSlaTarget(priority: CasePriority): Date | null {
    const now = Date.now();

    if (priority === CasePriority.CRITICAL) {
      return new Date(now + 4 * 60 * 60 * 1000);
    }

    if (priority === CasePriority.HIGH) {
      return new Date(now + 24 * 60 * 60 * 1000);
    }

    return null;
  }

  private resolveDecisionRisk(decision: MatchDecision, fallbackRisk: RiskLevel): RiskLevel {
    if (decision === MatchDecision.TRUE_MATCH) {
      return RiskLevel.CRITICAL;
    }

    if (decision === MatchDecision.POSSIBLE_MATCH) {
      return fallbackRisk === RiskLevel.CRITICAL ? RiskLevel.CRITICAL : RiskLevel.HIGH;
    }

    if (decision === MatchDecision.INSUFFICIENT_DATA) {
      return RiskLevel.MEDIUM;
    }

    if (decision === MatchDecision.FALSE_MATCH || decision === MatchDecision.NO_MATCH) {
      return RiskLevel.LOW;
    }

    return fallbackRisk;
  }

  private resolveCaseRouting(decision: MatchDecision) {
    if (decision === MatchDecision.TRUE_MATCH) {
      return {
        shouldCreateCase: true,
        riskLevel: RiskLevel.CRITICAL,
        status: CaseStatus.ESCALATED_INTERNALLY,
      };
    }

    if (decision === MatchDecision.POSSIBLE_MATCH) {
      return {
        shouldCreateCase: true,
        riskLevel: RiskLevel.HIGH,
        status: CaseStatus.NEEDS_REVIEW,
      };
    }

    if (decision === MatchDecision.INSUFFICIENT_DATA) {
      return {
        shouldCreateCase: true,
        riskLevel: RiskLevel.MEDIUM,
        status: CaseStatus.PENDING_ADDITIONAL_INFORMATION,
      };
    }

    return {
      shouldCreateCase: false,
      riskLevel: RiskLevel.LOW,
      status: CaseStatus.SCREENED,
    };
  }

  private extractProgramText(rawPayload: unknown) {
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      return '';
    }

    const payload = rawPayload as Record<string, unknown>;
    const values = [payload.program, payload.programs, payload.listType, payload.referenceNumber]
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());

    return values.join(' | ');
  }
}
