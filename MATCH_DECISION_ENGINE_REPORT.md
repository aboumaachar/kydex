# KYDEX — Match Decision Engine Report

Generated At: 2026-04-27T05:25:41.230Z

## Decision Rules
- TRUE_MATCH: exact document evidence or very high similarity with corroborating identifiers.
- POSSIBLE_MATCH: strong name or alias overlap with missing or inconclusive identifiers.
- FALSE_MATCH: strong name overlap but conflicting identifiers.
- NO_MATCH: no meaningful candidate found with sufficient submitted identifiers.
- INSUFFICIENT_DATA: submitted identifiers are too weak to classify confidently.

## Factor Weights
- NAME_SIMILARITY: 0.34
- ALIAS_SIMILARITY: 0.20
- TRANSLITERATION_MATCH: 0.14
- DOB_MATCH: 0.18 / DOB_MISMATCH: -0.20
- NATIONALITY_MATCH: 0.12 / NATIONALITY_MISMATCH: -0.12
- DOCUMENT_NUMBER_MATCH: 0.32 / DOCUMENT_NUMBER_MISMATCH: -0.24
- SOURCE_SEVERITY: 0.11-0.14
- LIST_TYPE / PROGRAM_CATEGORY: 0.05-0.06
- DATA_COMPLETENESS: 0.08 or -0.16

## Test Results
- Decision accuracy: 1
- Decision gate passed: YES
- Reason summary coverage: PASS
- Supporting factor coverage: PASS

## Known Limitations
- Decisioning currently evaluates the top-ranked candidate, not a committee across multiple candidates.
- Program/category evidence is derived from raw source payload text and depends on source completeness.
- Reviewer override persists at case level and does not yet replace committee decision workflows.

## Sample TRUE_MATCH
- Case: MV-020
- Description: Exact name plus DOB and nationality should lift BADER to HIGH.
- Decision: TRUE_MATCH
- Recommended Action: BLOCK_OR_ESCALATE
- Reason Summary: Very high name similarity supported by corroborating identifiers strengthens this result to a true match.
- Supporting Factors: NAME_SIMILARITY, TRANSLITERATION_MATCH, DOB_MATCH, NATIONALITY_MATCH, SOURCE_SEVERITY, PROGRAM_CATEGORY, LIST_TYPE, DATA_COMPLETENESS
- Weakening Factors: none

## Sample POSSIBLE_MATCH
- Case: MV-001
- Description: Exact public watchlist name from OFAC consolidated.
- Decision: POSSIBLE_MATCH
- Recommended Action: ESCALATE_FOR_REVIEW
- Reason Summary: High name similarity exists, but missing date of birth and document number keep the result in possible-match review.
- Supporting Factors: NAME_SIMILARITY, TRANSLITERATION_MATCH, SOURCE_SEVERITY, PROGRAM_CATEGORY, LIST_TYPE
- Weakening Factors: MISSING_DOB, DATA_COMPLETENESS

## Sample FALSE_MATCH
- Case: MV-034
- Description: Exact listed name with conflicting DOB, nationality, and document number should be marked false match.
- Decision: FALSE_MATCH
- Recommended Action: ALLOW_WITH_NOTE
- Reason Summary: Name similarity exists, but strong identifiers conflict and materially weaken the match hypothesis.
- Supporting Factors: NAME_SIMILARITY, TRANSLITERATION_MATCH, SOURCE_SEVERITY, PROGRAM_CATEGORY, LIST_TYPE, DATA_COMPLETENESS
- Weakening Factors: DOB_MISMATCH, NATIONALITY_MISMATCH, DOCUMENT_NUMBER_MISMATCH

## Sample NO_MATCH
- Case: MV-027
- Description: Common-name style query without supporting identifiers should not create a match.
- Decision: NO_MATCH
- Recommended Action: ALLOW
- Reason Summary: No meaningful sanctioned-list candidate was found for the submitted identifiers.
- Supporting Factors: DATA_COMPLETENESS
- Weakening Factors: none

## Sample Reviewer Override
- Reviewer override is exercised through the governed case review flow and audit event MATCH_DECISION_OVERRIDDEN.