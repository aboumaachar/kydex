# KYDEX UAT Executive Summary

Prepared for: Notary Council decision-makers
Latest certified deployment certificate: kydex-prod-2026-04-27T03-32-22-703Z
Certification state: productionValid true
Prepared date: 2026-04-27

## Summary

KYDEX is ready for Notary Council user acceptance testing because the current certified baseline provides a bilingual Arabic and English interface, right-to-left Arabic support, official source ingestion, local-only screening, imported list management, match validation, audit trail visibility, evidence export, and a certified deployment gate.

## Why This Baseline Is Ready for UAT

- Arabic and English interface available for council users
- official source ingestion for OFAC and UNSEC workflows
- local screening behavior verified through source and match validation
- imported list management available through the admin data-source control surface
- match decision explanation available for regulator-facing review
- case workflow supports review, escalation, and evidence packaging
- audit trail and timeline export support defensible operational review
- deployment certification is already production-valid in strict signing mode

## Trust Statement

KYDEX ensures:

- screening is performed only on locally verified data
- external sources are versioned and auditable
- every decision is explainable
- every case is traceable
- every export is cryptographically verifiable
- deployment is certified through enforced gates

Certified operational proof also exists for evidence generation through the latest certified smoke path, including evidence package ID `cmognejvd000xfy2994lmd2a1`.

## Real Data Demo Cases

These demo cases are taken from the existing KYDEX proof artifacts and are suitable for live council demonstration.

### Case 1: Clear (NO_MATCH)

- Input: document extraction sample identity from validated workflow, including full name `John Doe`, DOB `1985-02-01`, nationality `US`, and document number `A1234567`
- Matched record: none
- Decision: `NO_MATCH`
- Evidence package ID: not applicable in the archived no-match closure proof
- Timeline export: not applicable for the no-match closure proof; the auditable proof is the extraction-to-screen workflow record
- Verification result: `STATUS: VERIFIED` at the workflow level through extraction confirmation, audit capture, and closure proof with `queryId cmoe1q21z0fy3zhyyl0db5sil`

### Case 2: Possible Match (Arabic Transliteration)

- Input: `حسين كمال ناصر` / `Hussein Kamal Nasser`, nationality `LB`, document number `LB-DEMO-2002`
- Matched record: `Husayn K. Nasir` from `UN_DEMO`, reference `DEMO-UN-FAKE-014`
- Decision: `REQUEST_MORE_INFORMATION`
- Evidence package ID: generated live during case review when the presenter demonstrates evidence export; archived proof preserves the signed timeline export rather than the environment-specific package ID
- Timeline export: `Case_B_REQUEST_MORE_INFO/timeline-export.json`
- Verification result: `STATUS: VERIFIED`

### Case 3: True Match (OFAC SDN)

- Input: `كريم يوسف الخطيب` / `Karim Youssef Al-Khatib`, DOB `1978-11-03`, nationality `LB`, document number `LB-DEMO-3003`
- Matched record: `Karim Y. Al Khatib` from `OFAC_DEMO`, reference `DEMO-OFAC-FAKE-077`
- Decision: `ESCALATE_AS_SUSPICIOUS`
- Evidence package ID: generated live during the demonstration and recorded on the checklist and signoff form; archived proof preserves the signed timeline export
- Timeline export: `Case_C_ESCALATE_SIC_READY/timeline-export.json`
- Verification result: `STATUS: VERIFIED`

### Case 4: Escalation (SIC-Ready)

- Input: `كريم يوسف الخطيب` / `Karim Youssef Al-Khatib`, same sanctioned-match case carried into escalation workflow
- Matched record: `كريم يوسف الخطيب` from `LOCAL_LB_DEMO`, reference `DEMO-LB-FAKE-009`, alongside the OFAC match
- Decision: `ESCALATE_AS_SUSPICIOUS` with `SIC_PACKAGE_PREPARED` in the case action trail
- Evidence package ID: generated live during evidence export in the UAT session; archived proof preserves the signed escalation timeline and action trail
- Timeline export: `Case_C_ESCALATE_SIC_READY/timeline-export.json`
- Verification result: `STATUS: VERIFIED`

### Case 5: Rejected / False Positive

- Input: `محمد علي حسن` / `Mohamad Ali Hassan`, DOB `1985-02-10`, nationality `LB`, document number `LB-DEMO-1001`
- Matched record: `Muhammad Ali Hasan` from `OFAC_DEMO`, reference `DEMO-OFAC-FAKE-001`
- Decision: `CLEAR` with reviewer justification that DOB and document identity do not match the listed person
- Evidence package ID: generated live during demonstration when evidence export is triggered for the reviewable case; archived proof preserves the signed timeline export
- Timeline export: `Case_A_Clear/timeline-export.json`
- Verification result: `STATUS: VERIFIED`

## Decision-Maker View

This UAT phase should focus on confirming that non-technical council users can operate the portal confidently, that role boundaries are correct, and that operational evidence can be generated for high-risk or escalated cases.

## UAT Recommendation

Proceed with a moderated live UAT session using the council role matrix, the checklist, and the signoff form included in this pack.

## Certified Baseline Note

This executive summary references the certified Arabic production-valid baseline with latest certificate `kydex-prod-2026-04-27T03-32-22-703Z` and `productionValid true`.