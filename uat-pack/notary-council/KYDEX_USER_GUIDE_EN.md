# KYDEX User Guide — English

Prepared for: Notary Council UAT
Certified baseline reference: Arabic production-valid baseline
Latest certified deployment certificate: kydex-prod-2026-04-27T03-32-22-703Z
Certification state: productionValid true
Prepared date: 2026-04-27

## Purpose

This guide helps council users complete the main KYDEX workflows during formal user acceptance testing.

KYDEX in this baseline provides:

- Arabic and English interface support
- RTL-ready Arabic presentation
- Local screening against imported official lists
- Case review and escalation workflow
- Evidence package generation
- Compliance timeline export
- Certified deployment gate with production-valid status

## Before You Start

- Open the KYDEX web portal provided for UAT.
- Use the test account assigned to your role.
- Confirm your browser can display Arabic text correctly.
- Keep one Arabic sample name and one English sample name available.

## 1. Login

1. Open the login page.
2. Enter your email address.
3. Enter your password.
4. Select Sign in.
5. Confirm that the dashboard or the appropriate landing page opens.

Expected result:

- Login succeeds.
- Your name and role are visible.
- You do not see pages outside your permissions.

## 2. Switch Language Between Arabic and English

1. Locate the language switcher in the header.
2. Select Arabic.
3. Confirm the interface changes to Arabic and the layout becomes right-to-left.
4. Select English.
5. Confirm the interface returns to left-to-right English.

Expected result:

- Labels, navigation, and page headings change language.
- Arabic layout is readable and correctly aligned.
- No page data is lost when switching language.

## 3. Dashboard Overview

The dashboard provides a quick operational summary.

Review these areas:

- new screening entry point
- recent activity or recent screenings
- cases requiring action
- high-risk or escalated workload indicators
- data-source freshness or operational status

Expected result:

- The dashboard opens without errors.
- Key actions are clearly visible.
- Arabic and English labels match the selected language.

## 4. Screen a Name

1. Open the new screening page.
2. Enter the person or entity name.
3. If available, add date of birth, nationality, and document number.
4. Select the source set to use.
5. Start the screening.

Recommended UAT examples:

- Arabic name
- English name
- mixed transliteration spelling
- known no-match example

Expected result:

- KYDEX returns a machine decision such as True Match, Possible Match, False Match, No Match, or Insufficient Data.
- The risk level is visible.
- The result explains why a record matched or did not match.

## 5. Use Document Extraction

1. Open the document extraction page.
2. Upload the supported identity or document sample.
3. Review the extracted fields.
4. Correct any fields if needed.
5. Confirm the extraction.
6. Continue to screening.

Expected result:

- Extracted fields are displayed for human confirmation.
- Screening does not continue until confirmation is completed.
- The resulting screening is linked to the extracted document flow.

## 6. View Screening Results

After screening, review:

- risk level
- decision
- confidence
- source name
- source version
- score or candidate similarity indicators
- whether escalation is required

Expected result:

- Results are understandable without technical knowledge.
- The screen distinguishes no-match, possible match, high-risk, and critical outcomes.

## 7. Read the Match Decision Explanation

The match decision explanation is the regulator-facing reasoning layer.

Review these items:

- matched name or alias
- Arabic normalization or transliteration support where relevant
- supporting identifiers such as nationality or document number
- reason for the machine decision and confidence level
- reviewer decision area, if a case exists

Expected result:

- Users can understand why KYDEX produced the result.
- Explanations remain readable in Arabic and English.

## 8. Create and Review Cases

When a HIGH or CRITICAL result appears, KYDEX should create or route a case.

Typical review flow:

1. Open the cases list.
2. Select the case.
3. Review the screening result and supporting evidence.
4. Add notes or assign the reviewer, if your role allows it.
5. Record the committee or reviewer decision.

Possible case decisions:

- Clear
- Request more information
- Escalate internally
- Prepare SIC package
- Reject or block

Expected result:

- High-risk cases are visible in the review flow.
- Case history is preserved.
- Override or reviewer decision requires justification.

## 9. Use the Data Sources Dashboard

Open the data sources dashboard to review imported screening lists.

Confirm:

- OFAC SDN is visible
- OFAC Consolidated is visible
- UNSEC is visible
- source status and version history are available

Expected result:

- Source cards and source detail pages open normally.
- Arabic and English labels remain consistent.

## 10. Sync OFAC and UNSEC

This step is for authorized admin or compliance roles only.

1. Open the data sources dashboard.
2. Start the official sync for OFAC or UNSEC.
3. Wait for the sync to complete.
4. Review the new version and ingestion report.

Expected result:

- Sync finishes successfully.
- A new version record appears.
- Ingestion status and report data are visible.

## 11. View Imported List Records

This step is for authorized admin or compliance roles only.

1. Open a source.
2. Open the records browser.
3. Search by name, alias, nationality, program, or document number.
4. Open one record detail page.

Expected result:

- Records are searchable.
- Arabic-normalized and transliterated search inputs return the expected records.
- Raw source payload is visible where provided.

## 12. Activate or Archive List Versions

This step is for SUPER_ADMIN and COUNCIL_ADMIN only.

1. Open the source version history.
2. Select a version.
3. Activate or archive the version.
4. Confirm the status change.

Expected result:

- The version state changes correctly.
- Users without the required role are blocked.

## 13. Export an Evidence Package

This step is for SUPER_ADMIN, COUNCIL_ADMIN, and COMPLIANCE_OFFICER only.

1. Open a reviewable case.
2. Generate the evidence package.
3. Open the latest evidence package.
4. Confirm the package includes screening context and review evidence.

Expected result:

- Evidence package generation succeeds.
- Unauthorized roles are blocked.

## 14. Export the Compliance Timeline

Timeline viewing is available to case-review roles. Download export is limited to admin roles.

1. Open a case.
2. Open the compliance timeline.
3. If you are SUPER_ADMIN or COUNCIL_ADMIN, download the timeline export.
4. Confirm the exported file opens successfully.

Expected result:

- Timeline details are visible to allowed review roles.
- Download export is blocked for non-admin roles.

## 15. Logout

1. Open the user menu.
2. Select Logout.
3. Confirm you return to the login page.

Expected result:

- The active session ends.
- Protected pages are no longer available without signing in again.

## Role Reminder

- NOTARY: screening and limited case visibility
- COMPLIANCE_OFFICER: review, case decisions, evidence generation
- COUNCIL_ADMIN: council administration and source governance
- SUPER_ADMIN: full council operational control within KYDEX

## Certified Baseline Note

This UAT guide is written for the certified Arabic production-valid baseline with latest certificate `kydex-prod-2026-04-27T03-32-22-703Z` and `productionValid true`.