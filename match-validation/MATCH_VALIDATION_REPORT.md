# KYDEX — Match Validation Report

Generated At: 2026-04-27T05:25:41.227Z
Report Path: C:\kydex\match-validation\MATCH_VALIDATION_REPORT.md

## Summary
- Total cases: 50
- Passed cases: 50
- Failed cases: 0
- True positives: 39
- True negatives: 11
- False positives: 0
- False negatives: 0
- Precision proxy: 1
- Recall proxy: 1
- False positive rate: 0
- Overall pass rate: 1
- Decision accuracy: 1

## Threshold Gate
- Overall pass rate >= 85%: PASS
- Exact-match false negatives = 0: PASS
- Document-number false negatives = 0: PASS
- False positive rate <= 10%: PASS
- Match-quality gate: PASS

## Decision Gate
- Decision classification accuracy >= 90%: PASS
- TRUE_MATCH false negatives = 0: PASS
- FALSE_MATCH false positives <= 10%: PASS
- All decisions include reasonSummary: PASS
- All non-NO_MATCH decisions include supportingFactors: PASS
- Decision gate: PASS

## Average Score By Category
- alias_match: 0.625
- arabic_to_english_transliteration: 0.74
- dob_match_boost: 0.87
- dob_mismatch_penalty: 0.77
- document_number_match: 0.92
- english_to_arabic_transliteration: 0.67
- exact_name_match: 0.67
- false_match_identifier_conflict: 0.67
- false_positive_common_name: 0.468
- insufficient_data_common_name: 0.49
- nationality_match_boost: 0.77
- no_match_clean_person: 0.348
- partial_name_match: 0.536
- scoring_threshold_calibration: 0.725
- spelling_variation: 0.609

## Failures By Category
- none

## Scoring Review
### Cases scored too low
- none

### Cases scored too high
- none

### Recommendations
- Current thresholds are meeting the seeded validation categories.

## Case Results
| Case ID | Category | Expected | Actual | Risk | Decision | Score | Source | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MV-001 | exact_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.67 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-002 | exact_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.67 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-003 | exact_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.67 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-004 | exact_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.67 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-005 | exact_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.67 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-006 | exact_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.67 | OFAC_SDN | PASS | PASS |
| MV-007 | alias_match | match | match | HIGH | POSSIBLE_MATCH | 0.67 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-008 | alias_match | match | match | HIGH | POSSIBLE_MATCH | 0.67 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-009 | alias_match | match | match | HIGH | POSSIBLE_MATCH | 0.536 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-010 | spelling_variation | match | match | HIGH | POSSIBLE_MATCH | 0.631 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-011 | spelling_variation | match | match | HIGH | POSSIBLE_MATCH | 0.603 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-012 | spelling_variation | match | match | HIGH | POSSIBLE_MATCH | 0.592 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-013 | arabic_to_english_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.72 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-014 | arabic_to_english_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.72 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-015 | english_to_arabic_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.67 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-016 | english_to_arabic_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.67 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-017 | partial_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.536 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-018 | partial_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.536 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-019 | partial_name_match | match | match | HIGH | POSSIBLE_MATCH | 0.536 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-020 | dob_match_boost | match | match | CRITICAL | TRUE_MATCH | 0.87 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-021 | dob_match_boost | match | match | CRITICAL | TRUE_MATCH | 0.87 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-022 | dob_mismatch_penalty | match | match | HIGH | POSSIBLE_MATCH | 0.77 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-023 | nationality_match_boost | match | match | CRITICAL | TRUE_MATCH | 0.77 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-024 | nationality_match_boost | match | match | CRITICAL | TRUE_MATCH | 0.77 | OFAC_SDN | PASS | PASS |
| MV-025 | document_number_match | match | match | CRITICAL | TRUE_MATCH | 0.92 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-026 | document_number_match | match | match | CRITICAL | TRUE_MATCH | 0.92 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-027 | false_positive_common_name | no-match | no-match | LOW | NO_MATCH | 0.49 | - | PASS | PASS |
| MV-028 | false_positive_common_name | no-match | no-match | MEDIUM | INSUFFICIENT_DATA | 0.447 | - | PASS | PASS |
| MV-029 | no_match_clean_person | no-match | no-match | LOW | NO_MATCH | 0.287 | - | PASS | PASS |
| MV-030 | no_match_clean_person | no-match | no-match | LOW | NO_MATCH | 0.335 | - | PASS | PASS |
| MV-031 | scoring_threshold_calibration | match | match | HIGH | POSSIBLE_MATCH | 0.679 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-032 | scoring_threshold_calibration | match | match | CRITICAL | TRUE_MATCH | 0.77 | OFAC_SDN | PASS | PASS |
| MV-033 | insufficient_data_common_name | no-match | no-match | MEDIUM | INSUFFICIENT_DATA | 0.49 | - | PASS | PASS |
| MV-034 | false_match_identifier_conflict | match | match | LOW | FALSE_MATCH | 0.67 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-035 | arabic_to_english_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.72 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-036 | arabic_to_english_transliteration | match | match | CRITICAL | TRUE_MATCH | 0.82 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-037 | english_to_arabic_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.67 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-038 | english_to_arabic_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.67 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-039 | arabic_to_english_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.72 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-040 | arabic_to_english_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.72 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-041 | arabic_to_english_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.75 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-042 | arabic_to_english_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.75 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-043 | english_to_arabic_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.67 | UNSEC_CONSOLIDATED | PASS | PASS |
| MV-044 | english_to_arabic_transliteration | match | match | HIGH | POSSIBLE_MATCH | 0.67 | OFAC_CONSOLIDATED | PASS | PASS |
| MV-045 | no_match_clean_person | no-match | no-match | LOW | NO_MATCH | 0.268 | - | PASS | PASS |
| MV-046 | no_match_clean_person | no-match | no-match | LOW | NO_MATCH | 0.35 | - | PASS | PASS |
| MV-047 | no_match_clean_person | no-match | no-match | LOW | NO_MATCH | 0.329 | - | PASS | PASS |
| MV-048 | no_match_clean_person | no-match | no-match | LOW | NO_MATCH | 0.436 | - | PASS | PASS |
| MV-049 | no_match_clean_person | no-match | no-match | LOW | NO_MATCH | 0.335 | - | PASS | PASS |
| MV-050 | no_match_clean_person | no-match | no-match | LOW | NO_MATCH | 0.447 | - | PASS | PASS |