# KYDEX Live UAT Demo Script

Prepared for: Notary Council live UAT session
Latest certified deployment certificate: kydex-prod-2026-04-27T03-32-22-703Z
Certification state: productionValid true
Prepared date: 2026-04-27

## Demo Rules

- Read the script exactly as written.
- Do not improvise terminology.
- Keep the interface in Arabic first, then switch to English only when the script says so.
- Record the generated evidence package ID and any exported file names during the session.

## Demo Setup

- Presenter role: COUNCIL_ADMIN or SUPER_ADMIN
- Support role available in room: COMPLIANCE_OFFICER
- Proof case to use for live screening: `Case_B_REQUEST_MORE_INFO`
- Proof escalation case to show: `Case_C_ESCALATE_SIC_READY`
- Data source to show: OFAC

## Step 1: Login

Presenter says:

"We are now opening KYDEX on the certified Arabic production-valid baseline and signing in with an authorized council account."

Operator action:

1. Open the login page.
2. Enter the approved UAT credentials.
3. Sign in.

Expected audience takeaway:

- council user access is controlled
- login succeeds on the certified baseline

## Step 2: Switch to Arabic

Presenter says:

"We will begin in Arabic because Arabic support is a core operational requirement, not a translation layer added later."

Operator action:

1. Use the language switcher.
2. Select Arabic.
3. Pause on the dashboard.

Expected audience takeaway:

- Arabic labels are complete
- right-to-left layout is operational

## Step 3: Run Screening (Arabic Name)

Presenter says:

"We will run a live Arabic screening using a transliteration-sensitive example from the UAT proof set."

Operator action:

1. Open the new screening page.
2. Enter `حسين كمال ناصر`.
3. Enter nationality `LB`.
4. Enter document number `LB-DEMO-2002`.
5. Run screening.

Expected audience takeaway:

- Arabic name handling works
- transliteration-sensitive matching works

## Step 4: Show Match Explanation

Presenter says:

"KYDEX is not only returning a result. It is also explaining why the result requires attention."

Operator action:

1. Open the result details.
2. Highlight the matched record `Husayn K. Nasir`.
3. Read the explanation that the match is based on phonetic similarity with insufficient identifiers.

Expected audience takeaway:

- decisions are explainable
- possible matches are not hidden or overclaimed

## Step 5: Open Case

Presenter says:

"A reviewable result becomes a case so that the institution can control the next action through governance, not through guesswork."

Operator action:

1. Open the created or linked case.
2. Show case status and review fields.
3. Note that the expected committee outcome for this proof case is `REQUEST_MORE_INFORMATION`.

Expected audience takeaway:

- review workflow is case-based
- governance state is visible

## Step 6: Show Audit Trail

Presenter says:

"Every material action is recorded. The system preserves a traceable chain from screening to decision."

Operator action:

1. Open the case timeline or compliance timeline.
2. Point out the screening event, case creation, reviewer assignment, and request-for-information events.

Expected audience takeaway:

- case activity is traceable
- review chronology is preserved

## Step 7: Generate Evidence Package

Presenter says:

"We will now generate the evidence package that supports controlled internal review."

Operator action:

1. Generate the evidence package from the case.
2. Read the returned evidence package ID aloud.
3. Record that ID in the UAT checklist and signoff form.

Expected audience takeaway:

- evidence export is operational
- the generated package is individually traceable

## Step 8: Verify Signature

Presenter says:

"Exports are not only downloadable. They are cryptographically verifiable."

Operator action:

1. Open the relevant signed timeline export from the proof artifacts.
2. Show the verification result for `Case_B_REQUEST_MORE_INFO/timeline-export.json` with `STATUS: VERIFIED`.
3. If the live session includes a fresh export verification step, run it and show the result.

Expected audience takeaway:

- export integrity is verifiable
- evidence handling is defensible

## Step 9: Show Data Source (OFAC)

Presenter says:

"The system screens against locally controlled source data. We will now show the official source management surface."

Operator action:

1. Open the data sources dashboard.
2. Open OFAC.
3. Show the available versions and reports.
4. Show that the source is versioned and browsable.

Expected audience takeaway:

- source ingestion is visible
- source governance is local and auditable

## Step 10: Show Records Browser

Presenter says:

"We can inspect imported records directly and tie them back to source versions used by screening decisions."

Operator action:

1. Open the OFAC records browser.
2. Search for the proof record used in the sanctioned-match example, `Karim Y. Al Khatib`.
3. Open the record detail and point out the source version.

Expected audience takeaway:

- imported list records are searchable
- the screening system is anchored to inspectable local records

## Closing Statement

Presenter says:

"KYDEX has now shown Arabic screening, explainable reasoning, case governance, audit traceability, evidence export, export verification, and source control on the current certified baseline. We can now move to council signoff using the prepared form."

## Required Session Records

- generated evidence package ID
- screenshot of Arabic dashboard
- screenshot of match explanation
- screenshot of case timeline
- screenshot of OFAC version page
- screenshot of OFAC records browser
- completed UAT checklist
- completed council signoff form