# KYDEX National List Known Record Validation Report

Date: 2026-05-06
Workspace: c:\\kydex
Target env: https://kydex.me

## Scope
Known-record validation was executed with real imported Lebanon records against:
1. `/api/v1/screen`
2. `/api/v1/notaries/sandranassif/screening/search`
3. `/sandra/api/kydex-search.php` with `sourceScope=local`

## Final Runtime Evidence
Primary artifact:
1. `c:\kydex\post_fix_notary_sandra_validation.json`

Summary from final run after live patch deploy:
1. `KNOWN_COUNT=6`
2. `SCREEN_TOP_LEB=6`
3. `DIRECT_TOP_LEB=6`
4. `SANDRA_TOP_LEB=6`
5. `NOISE_DIRECT=0`
6. `NOISE_SANDRA=0`

## Acceptance Result
1. At least 5 exact known names from Sandra local returning `LEBANON_NATIONAL_LIST`: PASS (6/6 in final sample run).
2. Random unrelated text returns zero Lebanon false positives: PASS.
3. Result card source label for Lebanon: PASS (`اللائحة الوطنية`).
4. Raw JSON hidden in Sandra UI flow: PASS.
5. Rate limit was temporarily raised for validation and restored afterward: PASS.

## Notes
1. Earlier failed/partial runs in this report history were pre-fix or pre-deploy snapshots.
2. Current final status is based on the post-deploy rerun that produced the evidence above.
