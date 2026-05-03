import 'reflect-metadata';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { MatchClassification, MatchDecision, MatchRecommendedAction, RiskLevel, UserRole } from '@prisma/client';
import { AppModule } from '../apps/api/src/app.module';
import { AuditLogsService } from '../apps/api/src/audit-logs/audit-logs.service';
import { MatchingService } from '../apps/api/src/matching/matching.service';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';
import { MatchDecisionService } from '../apps/api/src/scoring/match-decision.service';
import { ScoringService } from '../apps/api/src/scoring/scoring.service';
import { ScreeningService } from '../apps/api/src/screening/screening.service';

type ValidationCase = {
  caseId: string;
  category: string;
  description: string;
  input: {
    fullName: string;
    dateOfBirth?: string;
    nationality?: string;
    documentNumber?: string;
    transactionType?: string;
  };
  sources: string[];
};

type ExpectedResult = {
  shouldMatch: boolean;
  expectedRiskLevel?: RiskLevel;
  expectedSource?: string;
  expectedMinimumScore?: number;
  expectedMaximumScore?: number;
  expectedDecision?: MatchDecision;
  expectedConfidenceRange?: [number, number];
  expectedRecommendedAction?: MatchRecommendedAction;
  requiredFactors?: string[];
};

type ValidationResult = {
  caseId: string;
  category: string;
  description: string;
  expected: ExpectedResult;
  actual: {
    shouldMatch: boolean;
    highestScore: number;
    riskLevel: RiskLevel;
    classification: MatchClassification;
    decision: MatchDecision;
    decisionConfidence: number;
    reasonSummary: string;
    recommendedAction: MatchRecommendedAction;
    supportingFactors: string[];
    weakeningFactors: string[];
    topSource: string | null;
    topMatchedName: string | null;
    searchedSources: string[];
    reasons: string[];
  };
  pass: boolean;
  failureReasons: string[];
};

type ReportSummary = {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  precisionProxy: number;
  recallProxy: number;
  falsePositiveRate: number;
  passRate: number;
  decisionAccuracy: number;
  decisionCoverage: {
    reasonSummaryOk: boolean;
    supportingFactorsOk: boolean;
  };
  decisionGate: {
    classificationAccuracyOk: boolean;
    trueMatchFalseNegativesOk: boolean;
    falseMatchFalsePositivesOk: boolean;
    reasonSummaryCoverageOk: boolean;
    supportingFactorsCoverageOk: boolean;
    passed: boolean;
  };
  averageScoreByCategory: Record<string, number>;
  failuresByCategory: Record<string, number>;
  thresholdGate: {
    overallPassRateOk: boolean;
    exactMatchFalseNegativesOk: boolean;
    documentNumberFalseNegativesOk: boolean;
    falsePositiveRateOk: boolean;
    passed: boolean;
  };
  scoreReview: {
    scoredTooLow: Array<{ caseId: string; category: string; highestScore: number }>;
    scoredTooHigh: Array<{ caseId: string; category: string; highestScore: number }>;
    categoryRecommendations: string[];
  };
  reportPath: string;
};

const workspaceRoot = process.cwd();
const validationDir = resolve(workspaceRoot, 'match-validation');
const testCasesPath = resolve(validationDir, 'test-cases.json');
const expectedResultsPath = resolve(validationDir, 'expected-results.json');
const validationResultsPath = resolve(validationDir, 'validation-results.json');
const reportPath = resolve(validationDir, 'MATCH_VALIDATION_REPORT.md');
const decisionReportPath = resolve(workspaceRoot, 'MATCH_DECISION_ENGINE_REPORT.md');

function loadJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function deriveCategoryRecommendations(failuresByCategory: Record<string, number>) {
  const recommendations: string[] = [];

  if ((failuresByCategory.alias_match ?? 0) > 0) {
    recommendations.push('Alias matching needs to score against watchlist aliases, not just canonical names.');
  }

  if ((failuresByCategory.arabic_to_english_transliteration ?? 0) > 0 || (failuresByCategory.english_to_arabic_transliteration ?? 0) > 0) {
    recommendations.push('Arabic/English transliteration normalization is missing and should be added before match-quality gating.');
  }

  if ((failuresByCategory.partial_name_match ?? 0) > 0 || (failuresByCategory.scoring_threshold_calibration ?? 0) > 0) {
    recommendations.push('Token weighting and threshold calibration need improvement for partial and near-threshold matches.');
  }

  if ((failuresByCategory.spelling_variation ?? 0) > 0) {
    recommendations.push('Fuzzy similarity beyond plain token Jaccard is needed for spelling drift.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Current thresholds are meeting the seeded validation categories.');
  }

  return recommendations;
}

function buildMarkdownReport(results: ValidationResult[], summary: ReportSummary) {
  const rows = results
    .map((result) => {
      const actualSource = result.actual.topSource ?? '-';
      const failureText = result.failureReasons.length > 0 ? result.failureReasons.join('; ') : 'PASS';
      return `| ${result.caseId} | ${result.category} | ${result.expected.shouldMatch ? 'match' : 'no-match'} | ${result.actual.shouldMatch ? 'match' : 'no-match'} | ${result.actual.riskLevel} | ${result.actual.decision} | ${round(result.actual.highestScore)} | ${actualSource} | ${result.pass ? 'PASS' : 'FAIL'} | ${failureText} |`;
    })
    .join('\n');

  const averageScoreLines = Object.entries(summary.averageScoreByCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, score]) => `- ${category}: ${round(score)}`)
    .join('\n');

  const failureLines = Object.entries(summary.failuresByCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, count]) => `- ${category}: ${count}`)
    .join('\n');

  const scoredTooLow = summary.scoreReview.scoredTooLow.length > 0
    ? summary.scoreReview.scoredTooLow.map((entry) => `- ${entry.caseId} (${entry.category}) score=${round(entry.highestScore)}`).join('\n')
    : '- none';

  const scoredTooHigh = summary.scoreReview.scoredTooHigh.length > 0
    ? summary.scoreReview.scoredTooHigh.map((entry) => `- ${entry.caseId} (${entry.category}) score=${round(entry.highestScore)}`).join('\n')
    : '- none';

  return [
    '# KYDEX — Match Validation Report',
    '',
    `Generated At: ${new Date().toISOString()}`,
    `Report Path: ${reportPath}`,
    '',
    '## Summary',
    `- Total cases: ${summary.totalCases}`,
    `- Passed cases: ${summary.passedCases}`,
    `- Failed cases: ${summary.failedCases}`,
    `- True positives: ${summary.truePositives}`,
    `- True negatives: ${summary.trueNegatives}`,
    `- False positives: ${summary.falsePositives}`,
    `- False negatives: ${summary.falseNegatives}`,
    `- Precision proxy: ${round(summary.precisionProxy)}`,
    `- Recall proxy: ${round(summary.recallProxy)}`,
    `- False positive rate: ${round(summary.falsePositiveRate)}`,
    `- Overall pass rate: ${round(summary.passRate)}`,
    `- Decision accuracy: ${round(summary.decisionAccuracy)}`,
    '',
    '## Threshold Gate',
    `- Overall pass rate >= 85%: ${summary.thresholdGate.overallPassRateOk ? 'PASS' : 'FAIL'}`,
    `- Exact-match false negatives = 0: ${summary.thresholdGate.exactMatchFalseNegativesOk ? 'PASS' : 'FAIL'}`,
    `- Document-number false negatives = 0: ${summary.thresholdGate.documentNumberFalseNegativesOk ? 'PASS' : 'FAIL'}`,
    `- False positive rate <= 10%: ${summary.thresholdGate.falsePositiveRateOk ? 'PASS' : 'FAIL'}`,
    `- Match-quality gate: ${summary.thresholdGate.passed ? 'PASS' : 'FAIL'}`,
    '',
    '## Decision Gate',
    `- Decision classification accuracy >= 90%: ${summary.decisionGate.classificationAccuracyOk ? 'PASS' : 'FAIL'}`,
    `- TRUE_MATCH false negatives = 0: ${summary.decisionGate.trueMatchFalseNegativesOk ? 'PASS' : 'FAIL'}`,
    `- FALSE_MATCH false positives <= 10%: ${summary.decisionGate.falseMatchFalsePositivesOk ? 'PASS' : 'FAIL'}`,
    `- All decisions include reasonSummary: ${summary.decisionGate.reasonSummaryCoverageOk ? 'PASS' : 'FAIL'}`,
    `- All non-NO_MATCH decisions include supportingFactors: ${summary.decisionGate.supportingFactorsCoverageOk ? 'PASS' : 'FAIL'}`,
    `- Decision gate: ${summary.decisionGate.passed ? 'PASS' : 'FAIL'}`,
    '',
    '## Average Score By Category',
    averageScoreLines || '- none',
    '',
    '## Failures By Category',
    failureLines || '- none',
    '',
    '## Scoring Review',
    '### Cases scored too low',
    scoredTooLow,
    '',
    '### Cases scored too high',
    scoredTooHigh,
    '',
    '### Recommendations',
    ...summary.scoreReview.categoryRecommendations.map((recommendation) => `- ${recommendation}`),
    '',
    '## Case Results',
    '| Case ID | Category | Expected | Actual | Risk | Decision | Score | Source | Status | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    rows,
  ].join('\n');
}

function buildDecisionEngineReport(results: ValidationResult[], summary: ReportSummary) {
  const sampleByDecision = (decision: MatchDecision) =>
    results.find((result) => result.actual.decision === decision && result.pass);

  const renderSample = (label: string, result: ValidationResult | undefined) => {
    if (!result) {
      return [`## ${label}`, '- No passing sample captured.'].join('\n');
    }

    return [
      `## ${label}`,
      `- Case: ${result.caseId}`,
      `- Description: ${result.description}`,
      `- Decision: ${result.actual.decision}`,
      `- Recommended Action: ${result.actual.recommendedAction}`,
      `- Reason Summary: ${result.actual.reasonSummary}`,
      `- Supporting Factors: ${result.actual.supportingFactors.join(', ') || 'none'}`,
      `- Weakening Factors: ${result.actual.weakeningFactors.join(', ') || 'none'}`,
    ].join('\n');
  };

  return [
    '# KYDEX — Match Decision Engine Report',
    '',
    `Generated At: ${new Date().toISOString()}`,
    '',
    '## Decision Rules',
    '- TRUE_MATCH: exact document evidence or very high similarity with corroborating identifiers.',
    '- POSSIBLE_MATCH: strong name or alias overlap with missing or inconclusive identifiers.',
    '- FALSE_MATCH: strong name overlap but conflicting identifiers.',
    '- NO_MATCH: no meaningful candidate found with sufficient submitted identifiers.',
    '- INSUFFICIENT_DATA: submitted identifiers are too weak to classify confidently.',
    '',
    '## Factor Weights',
    '- NAME_SIMILARITY: 0.34',
    '- ALIAS_SIMILARITY: 0.20',
    '- TRANSLITERATION_MATCH: 0.14',
    '- DOB_MATCH: 0.18 / DOB_MISMATCH: -0.20',
    '- NATIONALITY_MATCH: 0.12 / NATIONALITY_MISMATCH: -0.12',
    '- DOCUMENT_NUMBER_MATCH: 0.32 / DOCUMENT_NUMBER_MISMATCH: -0.24',
    '- SOURCE_SEVERITY: 0.11-0.14',
    '- LIST_TYPE / PROGRAM_CATEGORY: 0.05-0.06',
    '- DATA_COMPLETENESS: 0.08 or -0.16',
    '',
    '## Test Results',
    `- Decision accuracy: ${round(summary.decisionAccuracy)}`,
    `- Decision gate passed: ${summary.decisionGate.passed ? 'YES' : 'NO'}`,
    `- Reason summary coverage: ${summary.decisionGate.reasonSummaryCoverageOk ? 'PASS' : 'FAIL'}`,
    `- Supporting factor coverage: ${summary.decisionGate.supportingFactorsCoverageOk ? 'PASS' : 'FAIL'}`,
    '',
    '## Known Limitations',
    '- Decisioning currently evaluates the top-ranked candidate, not a committee across multiple candidates.',
    '- Program/category evidence is derived from raw source payload text and depends on source completeness.',
    '- Reviewer override persists at case level and does not yet replace committee decision workflows.',
    '',
    renderSample('Sample TRUE_MATCH', sampleByDecision(MatchDecision.TRUE_MATCH)),
    '',
    renderSample('Sample POSSIBLE_MATCH', sampleByDecision(MatchDecision.POSSIBLE_MATCH)),
    '',
    renderSample('Sample FALSE_MATCH', sampleByDecision(MatchDecision.FALSE_MATCH)),
    '',
    renderSample('Sample NO_MATCH', sampleByDecision(MatchDecision.NO_MATCH)),
    '',
    '## Sample Reviewer Override',
    '- Reviewer override is exercised through the governed case review flow and audit event MATCH_DECISION_OVERRIDDEN.',
  ].join('\n');
}

async function main() {
  const testCases = loadJsonFile<ValidationCase[]>(testCasesPath);
  const expectedResults = loadJsonFile<Record<string, ExpectedResult>>(expectedResultsPath);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const screeningService = new ScreeningService(
    prisma,
    new MatchingService(),
    new ScoringService(),
    new MatchDecisionService(),
    new AuditLogsService(prisma),
  );

  try {
    const tenant = await prisma.tenant.findFirst({ select: { id: true } });
    if (!tenant) {
      throw new Error('No tenant found for match validation.');
    }

    const user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: { in: [UserRole.SUPER_ADMIN, UserRole.COUNCIL_ADMIN] },
      },
      select: { id: true },
    });

    const validationResults: ValidationResult[] = [];

    for (const testCase of testCases) {
      const expected = expectedResults[testCase.caseId];
      if (!expected) {
        throw new Error(`Missing expected result for ${testCase.caseId}`);
      }

      const response = await screeningService.screen(tenant.id, user?.id, {
        ...testCase.input,
        sources: testCase.sources,
      });

      const actualShouldMatch = response.matches.length > 0;
      const topMatch = response.matches[0] ?? null;
      const failureReasons: string[] = [];

      if (actualShouldMatch !== expected.shouldMatch) {
        failureReasons.push(`shouldMatch expected ${expected.shouldMatch} but got ${actualShouldMatch}`);
      }

      if (expected.expectedRiskLevel && response.riskLevel !== expected.expectedRiskLevel) {
        failureReasons.push(`riskLevel expected ${expected.expectedRiskLevel} but got ${response.riskLevel}`);
      }

      if (expected.expectedSource && topMatch?.source !== expected.expectedSource) {
        failureReasons.push(`top source expected ${expected.expectedSource} but got ${topMatch?.source ?? 'none'}`);
      }

      if (typeof expected.expectedMinimumScore === 'number' && response.highestScore < expected.expectedMinimumScore) {
        failureReasons.push(`highestScore ${round(response.highestScore)} below minimum ${expected.expectedMinimumScore}`);
      }

      if (typeof expected.expectedMaximumScore === 'number' && response.highestScore > expected.expectedMaximumScore) {
        failureReasons.push(`highestScore ${round(response.highestScore)} above maximum ${expected.expectedMaximumScore}`);
      }

      if (expected.expectedDecision && response.decision !== expected.expectedDecision) {
        failureReasons.push(`decision expected ${expected.expectedDecision} but got ${response.decision}`);
      }

      if (expected.expectedConfidenceRange) {
        const [minimumConfidence, maximumConfidence] = expected.expectedConfidenceRange;
        if (response.decisionConfidence < minimumConfidence || response.decisionConfidence > maximumConfidence) {
          failureReasons.push(
            `decisionConfidence ${round(response.decisionConfidence)} outside expected range ${minimumConfidence}-${maximumConfidence}`,
          );
        }
      }

      if (expected.expectedRecommendedAction && response.recommendedAction !== expected.expectedRecommendedAction) {
        failureReasons.push(
          `recommendedAction expected ${expected.expectedRecommendedAction} but got ${response.recommendedAction}`,
        );
      }

      if (expected.requiredFactors?.length) {
        const actualFactors = new Set([
          ...response.supportingFactors.map((factor) => factor.factor),
          ...response.weakeningFactors.map((factor) => factor.factor),
        ]);
        for (const requiredFactor of expected.requiredFactors) {
          if (!actualFactors.has(requiredFactor)) {
            failureReasons.push(`requiredFactor missing ${requiredFactor}`);
          }
        }
      }

      if (!response.reasonSummary?.trim()) {
        failureReasons.push('reasonSummary is empty');
      }

      if (response.decision !== MatchDecision.NO_MATCH && response.supportingFactors.length === 0) {
        failureReasons.push('non-NO_MATCH decision missing supportingFactors');
      }

      validationResults.push({
        caseId: testCase.caseId,
        category: testCase.category,
        description: testCase.description,
        expected,
        actual: {
          shouldMatch: actualShouldMatch,
          highestScore: response.highestScore,
          riskLevel: response.riskLevel,
          classification: response.classification,
          decision: response.decision,
          decisionConfidence: response.decisionConfidence,
          reasonSummary: response.reasonSummary,
          recommendedAction: response.recommendedAction,
          supportingFactors: response.supportingFactors.map((factor) => String(factor.factor)),
          weakeningFactors: response.weakeningFactors.map((factor) => String(factor.factor)),
          topSource: topMatch?.source ?? null,
          topMatchedName: topMatch?.matchedName ?? null,
          searchedSources: response.searchedSources,
          reasons: response.matches.map((match) => match.reason),
        },
        pass: failureReasons.length === 0,
        failureReasons,
      });
    }

    const totalCases = validationResults.length;
    const passedCases = validationResults.filter((result) => result.pass).length;
    const failedCases = totalCases - passedCases;
    const truePositives = validationResults.filter((result) => result.expected.shouldMatch && result.actual.shouldMatch).length;
    const trueNegatives = validationResults.filter((result) => !result.expected.shouldMatch && !result.actual.shouldMatch).length;
    const falsePositives = validationResults.filter((result) => !result.expected.shouldMatch && result.actual.shouldMatch).length;
    const falseNegatives = validationResults.filter((result) => result.expected.shouldMatch && !result.actual.shouldMatch).length;
    const averageScoreByCategory = Object.fromEntries(
      [...new Set(validationResults.map((result) => result.category))].map((category) => {
        const scores = validationResults.filter((result) => result.category === category).map((result) => result.actual.highestScore);
        return [category, round(scores.reduce((sum, score) => sum + score, 0) / scores.length)];
      }),
    );
    const failuresByCategory = Object.fromEntries(
      [...new Set(validationResults.map((result) => result.category))]
        .map((category) => [category, validationResults.filter((result) => result.category === category && !result.pass).length])
        .filter(([, count]) => count > 0),
    );

    const exactMatchFalseNegatives = validationResults.filter(
      (result) => result.category === 'exact_name_match' && result.expected.shouldMatch && !result.actual.shouldMatch,
    ).length;
    const documentNumberFalseNegatives = validationResults.filter(
      (result) => result.category === 'document_number_match' && result.expected.shouldMatch && !result.actual.shouldMatch,
    ).length;
    const decisionExpectations = validationResults.filter((result) => !!result.expected.expectedDecision);
    const decisionCorrect = decisionExpectations.filter(
      (result) => result.expected.expectedDecision === result.actual.decision,
    ).length;
    const trueMatchFalseNegatives = decisionExpectations.filter(
      (result) => result.expected.expectedDecision === MatchDecision.TRUE_MATCH && result.actual.decision !== MatchDecision.TRUE_MATCH,
    ).length;
    const falseMatchExpectations = decisionExpectations.filter(
      (result) => result.expected.expectedDecision === MatchDecision.FALSE_MATCH,
    );
    const falseMatchMisses = falseMatchExpectations.filter(
      (result) => result.actual.decision !== MatchDecision.FALSE_MATCH,
    ).length;
    const decisionReasonCoverage = validationResults.every((result) => result.actual.reasonSummary.trim().length > 0);
    const decisionSupportingCoverage = validationResults.every(
      (result) => result.actual.decision === MatchDecision.NO_MATCH || result.actual.supportingFactors.length > 0,
    );

    const summary: ReportSummary = {
      totalCases,
      passedCases,
      failedCases,
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives,
      precisionProxy: round(ratio(truePositives, truePositives + falsePositives)),
      recallProxy: round(ratio(truePositives, truePositives + falseNegatives)),
      falsePositiveRate: round(ratio(falsePositives, trueNegatives + falsePositives)),
      passRate: round(ratio(passedCases, totalCases)),
      decisionAccuracy: round(ratio(decisionCorrect, decisionExpectations.length)),
      decisionCoverage: {
        reasonSummaryOk: decisionReasonCoverage,
        supportingFactorsOk: decisionSupportingCoverage,
      },
      decisionGate: {
        classificationAccuracyOk: ratio(decisionCorrect, decisionExpectations.length) >= 0.9,
        trueMatchFalseNegativesOk: trueMatchFalseNegatives === 0,
        falseMatchFalsePositivesOk: ratio(falseMatchMisses, falseMatchExpectations.length || 1) <= 0.1,
        reasonSummaryCoverageOk: decisionReasonCoverage,
        supportingFactorsCoverageOk: decisionSupportingCoverage,
        passed: false,
      },
      averageScoreByCategory,
      failuresByCategory,
      thresholdGate: {
        overallPassRateOk: ratio(passedCases, totalCases) >= 0.85,
        exactMatchFalseNegativesOk: exactMatchFalseNegatives === 0,
        documentNumberFalseNegativesOk: documentNumberFalseNegatives === 0,
        falsePositiveRateOk: ratio(falsePositives, trueNegatives + falsePositives) <= 0.1,
        passed: false,
      },
      scoreReview: {
        scoredTooLow: validationResults
          .filter((result) => result.expected.shouldMatch && !result.actual.shouldMatch)
          .map((result) => ({ caseId: result.caseId, category: result.category, highestScore: result.actual.highestScore })),
        scoredTooHigh: validationResults
          .filter((result) => !result.expected.shouldMatch && result.actual.shouldMatch)
          .map((result) => ({ caseId: result.caseId, category: result.category, highestScore: result.actual.highestScore })),
        categoryRecommendations: deriveCategoryRecommendations(failuresByCategory),
      },
      reportPath,
    };

    summary.thresholdGate.passed =
      summary.thresholdGate.overallPassRateOk &&
      summary.thresholdGate.exactMatchFalseNegativesOk &&
      summary.thresholdGate.documentNumberFalseNegativesOk &&
      summary.thresholdGate.falsePositiveRateOk;

    summary.decisionGate.passed =
      summary.decisionGate.classificationAccuracyOk &&
      summary.decisionGate.trueMatchFalseNegativesOk &&
      summary.decisionGate.falseMatchFalsePositivesOk &&
      summary.decisionGate.reasonSummaryCoverageOk &&
      summary.decisionGate.supportingFactorsCoverageOk;

    writeFileSync(
      validationResultsPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          summary,
          results: validationResults,
        },
        null,
        2,
      ),
    );

    writeFileSync(reportPath, buildMarkdownReport(validationResults, summary));
    writeFileSync(decisionReportPath, buildDecisionEngineReport(validationResults, summary));

    const output = {
      status: summary.thresholdGate.passed && summary.decisionGate.passed ? 'ok' : 'failed',
      totalCases: summary.totalCases,
      passedCases: summary.passedCases,
      failedCases: summary.failedCases,
      falsePositives: summary.falsePositives,
      falseNegatives: summary.falseNegatives,
      precisionProxy: summary.precisionProxy,
      recallProxy: summary.recallProxy,
      decisionAccuracy: summary.decisionAccuracy,
      thresholdPassed: summary.thresholdGate.passed && summary.decisionGate.passed,
      reportPath,
      decisionReportPath,
      validationResultsPath,
    };

    console.log(JSON.stringify(output, null, 2));
    process.exit(summary.thresholdGate.passed && summary.decisionGate.passed ? 0 : 1);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
}

void main();