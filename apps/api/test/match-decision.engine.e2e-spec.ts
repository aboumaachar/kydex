import { MatchDecision, MatchRecommendedAction } from '@prisma/client';
import { MatchDecisionService } from '../src/scoring/match-decision.service';

describe('MatchDecisionService', () => {
  const service = new MatchDecisionService();

  it('classifies exact document evidence as TRUE_MATCH', () => {
    const result = service.evaluate({
      fullName: 'Fathi Ahmad Mohammad HAMMAD',
      documentNumber: 'section 1(b) of Executive Order 13224',
      topCandidate: {
        watchlistRecordId: 'rec_1',
        sourceCode: 'OFAC_CONSOLIDATED',
        matchedName: 'Fathi Ahmad Mohammad HAMMAD',
        score: 0.82,
        classification: 'STRONG_PROBABLE_MATCH',
        nameScore: 0.99,
        aliasScore: 0,
        aliasMatched: false,
        exactAliasMatched: false,
        transliterationMatched: false,
        nationalityMatched: false,
        nationalityMismatch: false,
        dobMatched: false,
        dobMismatch: false,
        docMatched: true,
        docMismatch: false,
        programOrCategory: 'EO13224',
      },
      totalMatches: 1,
    });

    expect(result.decision).toBe(MatchDecision.TRUE_MATCH);
    expect(result.recommendedAction).toBe(MatchRecommendedAction.BLOCK_OR_ESCALATE);
  });

  it('classifies high name similarity without supporting identifiers as POSSIBLE_MATCH', () => {
    const result = service.evaluate({
      fullName: 'Mohammed Maher Yousef BADER',
      topCandidate: {
        watchlistRecordId: 'rec_2',
        sourceCode: 'OFAC_CONSOLIDATED',
        matchedName: 'Mohammed Maher Yousef BADER',
        score: 0.67,
        classification: 'STRONG_PROBABLE_MATCH',
        nameScore: 0.98,
        aliasScore: 0,
        aliasMatched: false,
        exactAliasMatched: false,
        transliterationMatched: false,
        nationalityMatched: false,
        nationalityMismatch: false,
        dobMatched: false,
        dobMismatch: false,
        docMatched: false,
        docMismatch: false,
        programOrCategory: 'OFAC Program',
      },
      totalMatches: 1,
    });

    expect(result.decision).toBe(MatchDecision.POSSIBLE_MATCH);
    expect(result.recommendedAction).toBe(MatchRecommendedAction.ESCALATE_FOR_REVIEW);
  });

  it('classifies strong name overlap with conflicting identifiers as FALSE_MATCH', () => {
    const result = service.evaluate({
      fullName: 'Fathi Ahmad Mohammad HAMMAD',
      dateOfBirth: '1972',
      nationality: 'Lebanon',
      documentNumber: 'WRONG-DOC-001',
      topCandidate: {
        watchlistRecordId: 'rec_3',
        sourceCode: 'OFAC_CONSOLIDATED',
        matchedName: 'Fathi Ahmad Mohammad HAMMAD',
        score: 0.66,
        classification: 'POSSIBLE_MATCH',
        nameScore: 0.99,
        aliasScore: 0,
        aliasMatched: false,
        exactAliasMatched: false,
        transliterationMatched: false,
        nationalityMatched: false,
        nationalityMismatch: true,
        dobMatched: false,
        dobMismatch: true,
        docMatched: false,
        docMismatch: true,
        programOrCategory: 'EO13224',
      },
      totalMatches: 1,
    });

    expect(result.decision).toBe(MatchDecision.FALSE_MATCH);
    expect(result.recommendedAction).toBe(MatchRecommendedAction.ALLOW_WITH_NOTE);
  });

  it('classifies common-name-only input as INSUFFICIENT_DATA', () => {
    const result = service.evaluate({
      fullName: 'Mohammed Ali',
      totalMatches: 0,
    });

    expect(result.decision).toBe(MatchDecision.INSUFFICIENT_DATA);
    expect(result.recommendedAction).toBe(MatchRecommendedAction.REQUEST_MORE_INFORMATION);
  });

  it('classifies clean input with no candidate as NO_MATCH', () => {
    const result = service.evaluate({
      fullName: 'Nadia Kareem Soufi',
      nationality: 'LB',
      totalMatches: 0,
    });

    expect(result.decision).toBe(MatchDecision.NO_MATCH);
    expect(result.recommendedAction).toBe(MatchRecommendedAction.ALLOW);
  });
});