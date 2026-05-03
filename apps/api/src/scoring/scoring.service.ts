import { Injectable } from '@nestjs/common';
import { MatchClassification, RiskLevel } from '@prisma/client';

@Injectable()
export class ScoringService {
  classifyRisk(score: number, hasDocumentMatch: boolean): RiskLevel {
    if (hasDocumentMatch) {
      return RiskLevel.CRITICAL;
    }

    if (score >= 0.9) return RiskLevel.CRITICAL;
    if (score >= 0.75) return RiskLevel.HIGH;
    if (score >= 0.5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  classifyMatch(score: number): MatchClassification {
    if (score >= 0.95) return MatchClassification.EXACT_MATCH;
    if (score >= 0.75) return MatchClassification.STRONG_PROBABLE_MATCH;
    if (score >= 0.5) return MatchClassification.POSSIBLE_MATCH;
    if (score >= 0.25) return MatchClassification.WEAK_SIMILARITY;
    return MatchClassification.NO_MATCH;
  }

  buildExplanation(input: {
    nameScore: number;
    nationalityMatched: boolean;
    dobMatched: boolean;
    docMatched: boolean;
    source: string;
    version: string;
    riskLevel: RiskLevel;
  }) {
    return [
      `Name similarity: ${(input.nameScore * 100).toFixed(1)}%`,
      `Nationality match: ${input.nationalityMatched ? 'yes' : 'no'}`,
      `Date of birth match: ${input.dobMatched ? 'yes' : 'no'}`,
      `Document number match: ${input.docMatched ? 'yes' : 'no'}`,
      `Source: ${input.source}`,
      `Version: ${input.version}`,
      `Risk: ${input.riskLevel}`,
    ].join(' | ');
  }
}
