# KYDEX — Match Validation Framework Execution Pass

## Objective

Prove KYDEX search accuracy, not just architecture.

Current proof:
KYDEX searches locally, defensibly, and with verified source versions.

Next proof:
KYDEX catches the right names reliably and explains why.

---

## 1. Scope

Build a validation framework for:

- exact matches
- aliases
- spelling variations
- Arabic / English transliteration
- partial names
- date of birth comparison
- nationality comparison
- document number comparison
- false positives
- false negatives
- scoring threshold calibration

---

## 2. Required Dataset

Create:

```
match-validation/
  test-cases.json
  expected-results.json
  validation-results.json
  MATCH_VALIDATION_REPORT.md
```

Each test case must include:

```json
{
  "caseId": "MV-001",
  "input": {
    "fullName": "Mohammad Ali",
    "dateOfBirth": "1985-01-01",
    "nationality": "LB",
    "documentNumber": "123456"
  },
  "sources": ["OFAC_SDN", "UNSEC_CONSOLIDATED"],
  "expected": {
    "shouldMatch": true,
    "expectedRiskLevel": "HIGH",
    "expectedSource": "OFAC_SDN",
    "expectedMinimumScore": 0.75
  },
  "category": "alias_match"
}
```

---

## 3. Test Categories

Add minimum cases:

```
1. exact_name_match
2. alias_match
3. spelling_variation
4. arabic_to_english_transliteration
5. english_to_arabic_transliteration
6. partial_name_match
7. dob_match_boost
8. dob_mismatch_penalty
9. nationality_match_boost
10. document_number_match
11. false_positive_common_name
12. no_match_clean_person
```

Minimum required:

```
30 total validation cases
```

---

## 4. Known-Safe Test Data Rule

Do not use real private customer data.

Use only:

* public watchlist names from imported OFAC/UNSEC data
* synthetic variations generated from public names
* synthetic clean names for no-match cases

---

## 5. Validation CLI

Create:

```
scripts/match-validate.ts
```

Add command:

```json
{
  "scripts": {
    "match:validate": "tsx scripts/match-validate.ts"
  }
}
```

The CLI must:

1. load validation test cases
2. run each case through `/screen` or internal screening service
3. compare actual result to expected result
4. calculate:

   * total cases
   * passed
   * failed
   * precision proxy
   * recall proxy
   * false positive count
   * false negative count
5. write:

   * validation-results.json
   * MATCH_VALIDATION_REPORT.md
6. exit non-zero if required thresholds fail

---

## 6. Required Metrics

Report:

```
Total cases
Passed cases
Failed cases
True positives
True negatives
False positives
False negatives
Precision proxy
Recall proxy
Average score by category
Failures by category
```

---

## 7. Minimum Thresholds

Set initial gate:

```
Overall pass rate >= 85%
False negatives = 0 for exact match cases
False negatives = 0 for document number match cases
False positive rate <= 10%
```

If thresholds fail, do not certify match accuracy.

---

## 8. Scoring Review

The report must identify:

```
- cases scored too low
- cases scored too high
- categories requiring algorithm improvement
- threshold adjustment recommendations
```

---

## 9. API / Response Requirements

Screening responses used by validation must include:

```json
{
  "riskLevel": "HIGH",
  "highestScore": 0.82,
  "matches": [
    {
      "source": "OFAC_SDN",
      "matchedName": "...",
      "score": 0.82,
      "reason": "..."
    }
  ],
  "searchedSources": [],
  "usedLocalVersions": {}
}
```

---

## 10. E2E Tests

Add:

```
apps/api/test/match-validation.e2e-spec.ts
```

Tests:

1. exact public watchlist name returns match
2. synthetic clean person returns no match
3. document number exact match raises high confidence
4. common-name false positive does not become HIGH without supporting identifiers
5. validation CLI exits successfully when thresholds pass

---

## 11. Production Gate Update

Add to production certification:

```
npm run match:validate
```

Update:

```
PRODUCTION_GATE.md
PRODUCTION_DEPLOYMENT_RUNBOOK.md
BASELINE_v0.8.0-production-certifiable.md
```

Add rule:

```
Production certification is not match-quality valid unless match:validate passes.
```

---

## 12. Validation Commands

Run:

```
npm run build -w @kydex/api
npm run build -w @kydex/web
npm run test:e2e -w @kydex/api
npm run architecture:verify
npm run source:verify
npm run match:validate
npm run preflight
npm run smoke
npm run production:certify
```

---

## 13. Required Return Output

Return:

```
1. Files changed
2. Validation dataset created
3. Test categories covered
4. Match validation metrics
5. False positives
6. False negatives
7. Threshold result
8. Report path
9. Production certification status
10. Remaining accuracy limitations
```

---

## 14. Final Acceptance Criteria

This pass is complete only if:

```
30+ validation cases exist
exact matches pass
document-number matches pass
clean no-match cases pass
false positives stay below threshold
match:validate passes
production:certify includes match:validate
all gates remain green
```

---

## Final Rule

KYDEX is not accuracy-ready until it proves:

```
It can find real matches,
avoid obvious false positives,
explain scores,
and reproduce results against fixed local source versions.
```
