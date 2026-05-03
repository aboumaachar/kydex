# DOCUMENT EXTRACTION WORKFLOW VALIDATION

Date: 2026-04-25
Feature: extract -> human confirm -> screen -> audit events

## Closure Evidence (Final)
- extractionStatus: CONFIRMED
- screeningClassification: NO_MATCH
- screeningNoMatchFlag: true
- screeningMatchCount: 0
- auditRecordAction: SCREEN_QUERY_FROM_DOCUMENT
- auditRecordPresent: true
- closureStatus: PASS

## Scope
- Validate document extraction endpoint.
- Validate mandatory human confirmation before screening.
- Validate audit event emission for extraction workflow.

## Test Input
Uploaded file: .snapshots/sample-id.txt

Sample content:
- FULL NAME: John Doe
- DOB: 1985-02-01
- NATIONALITY: US
- DOCUMENT NUMBER: A1234567
- ISSUING COUNTRY: US
- EXPIRY DATE: 2030-05-10

## API Flow Executed
1. POST /api/v1/document-extraction/extract?documentType=PASSPORT&redactAfterExtract=true
2. POST /api/v1/document-extraction/{id}/confirm
3. GET /api/v1/audit-logs?limit=400

## Extraction Result
- extractionId: cmodze5m501divz268djvyufm
- status: EXTRACTED
- documentType: PASSPORT
- extractionProvider: mock-ocr-v1
- extractionConfidence: 0.95
- confirmationRequired: true
- redactRequested: true
- extractedFields:
  - fullName: John Doe
  - dateOfBirth: 1985-02-01
  - nationality: US
  - documentNumber: A1234567
  - issuingCountry: US
  - expiryDate: 2030-05-10

## Confirm + Screen Result
- Confirm call succeeded.
- Screening result contained no matches for sample identity in current loaded dataset.
- Response included explicit no-match summary object:
  - screeningQuery.id: cmoe0l8k80elnxvb12njbu62l
  - screeningQuery.classification: NO_MATCH
  - screeningQuery.riskLevel: LOW
  - screeningQuery.highestScore: 0
  - screeningQuery.matchCount: 0
  - screeningQuery.noMatch: true
- Response included explicit audit metadata object:
  - auditRecord.id: cmoe0l8ko0elrxvb1no48fuqd
  - auditRecord.action: SCREEN_QUERY_FROM_DOCUMENT
  - auditRecord.entityType: DOCUMENT_EXTRACTION
  - auditRecord.entityId: cmoe0l8i80elhxvb13lw8r2eu

## Audit Validation
Matched audit events (3):
1. DOCUMENT_EXTRACTED
2. DOCUMENT_EXTRACTION_CONFIRMED
3. SCREEN_QUERY_FROM_DOCUMENT

Event evidence (entityId): cmodze5m501divz268djvyufm

## Governance Assertions
1. Manual confirmation step is enforced in workflow design and call sequence.
2. Screening is triggered only after confirmation endpoint execution.
3. Audit trail captures all required workflow transitions.

## Observations
1. No-match response contract now provides clear query summary and explicit audit record metadata.
2. This pass validates operational flow and auditable behavior end-to-end.
