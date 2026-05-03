import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

type ValidationCase = {
  caseId: string;
  category: string;
  description: string;
  input: {
    fullName: string;
  };
};

type ExpectedResult = Record<string, unknown>;

const MINIMUM_ARABIC_CASES = 20;
const ARABIC_SCRIPT_PATTERN = /[\u0600-\u06FF]/;

function loadJson<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function isArabicCoverageCase(testCase: ValidationCase) {
  return (
    ARABIC_SCRIPT_PATTERN.test(testCase.input.fullName) ||
    testCase.category.includes('transliteration') ||
    testCase.category.includes('arabic')
  );
}

function runFocusedArabicTests() {
  const command = 'npm run test:e2e -w @kydex/api -- arabic-matching.e2e-spec.ts match-decision.engine.e2e-spec.ts architecture-local-screening.e2e-spec.ts';
  const result = spawnSync(command, {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const root = process.cwd();
  const testCasesPath = resolve(root, 'match-validation', 'test-cases.json');
  const expectedResultsPath = resolve(root, 'match-validation', 'expected-results.json');
  const testCases = loadJson<ValidationCase[]>(testCasesPath);
  const expectedResults = loadJson<Record<string, ExpectedResult>>(expectedResultsPath);
  const arabicCases = testCases.filter(isArabicCoverageCase);
  const missingExpected = arabicCases.filter((testCase) => !expectedResults[testCase.caseId]).map((testCase) => testCase.caseId);

  if (arabicCases.length < MINIMUM_ARABIC_CASES) {
    console.error(`[arabic:validate] Expected at least ${MINIMUM_ARABIC_CASES} Arabic or mixed-language cases, found ${arabicCases.length}.`);
    process.exit(1);
  }

  if (missingExpected.length > 0) {
    console.error('[arabic:validate] Missing expected results for Arabic coverage cases:');
    missingExpected.forEach((caseId) => console.error(`- ${caseId}`));
    process.exit(1);
  }

  console.log(`[arabic:validate] Arabic coverage cases: ${arabicCases.length}`);
  runFocusedArabicTests();
}

main();