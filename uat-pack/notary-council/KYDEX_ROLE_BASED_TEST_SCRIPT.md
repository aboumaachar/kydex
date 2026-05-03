# KYDEX Role-Based Test Script

Prepared for: Notary Council UAT
Latest certified deployment certificate: kydex-prod-2026-04-27T03-32-22-703Z
Certification state: productionValid true
Prepared date: 2026-04-27

## Purpose

Use this script to confirm that each KYDEX role sees the correct pages, can perform the correct actions, and is blocked from restricted actions.

## Shared Test Rules

- Test in both English and Arabic where practical.
- Confirm that blocked actions are denied cleanly.
- Record the visible route, message, or behavior for every block.
- Keep screenshots for any failed permission check.

## SUPER_ADMIN

### What the user should see

- dashboard
- screening pages
- cases pages
- review queue
- admin data-sources area
- audit logs
- system health and preflight access

### What the user can do

- run single screening
- use document extraction
- review and decide cases
- assign reviewers
- generate evidence packages
- download compliance timeline exports
- sync official sources
- browse records and reports
- activate and archive data-source versions

### What the user must be blocked from doing

- deleting immutable audit history
- deleting historical evidence trails through the application
- bypassing reviewer justification requirements when an override is required

### Expected result

- All council operational features required for UAT succeed.
- Governance protections remain enforced even for the highest role.

## COUNCIL_ADMIN

### What the user should see

- dashboard
- screening pages
- cases pages
- review queue
- admin data-sources area
- audit logs
- system health and preflight access

### What the user can do

- run screening and review results
- use document extraction
- review queue and case decisions
- assign reviewers
- generate evidence packages
- download compliance timeline exports
- sync official sources
- browse data-source records and reports
- activate and archive source versions

### What the user must be blocked from doing

- deleting immutable audit history
- deleting historical evidence trails through the application
- bypassing justification requirements for reviewer overrides

### Expected result

- Council administration tasks succeed across Arabic and English workflows.
- Governance controls remain enforced.

## COMPLIANCE_OFFICER

### What the user should see

- dashboard
- screening pages
- cases pages
- review queue
- source versions, reports, and records browser

### What the user can do

- run single screening
- use document extraction
- open review queue
- assign reviewer to an eligible case
- record committee decisions
- review match decisions with justification
- escalate internally
- prepare SIC package
- generate and view evidence packages
- sync official sources
- upload source files where permitted
- browse imported list records

### What the user must be blocked from doing

- downloading compliance timeline exports reserved for admin roles
- activating source versions
- archiving source versions
- accessing admin-only audit log and preflight functions

### Expected result

- The compliance officer can conduct review and evidence work.
- Admin-only controls remain blocked.

## NOTARY

### What the user should see

- dashboard
- new screening page
- document extraction page
- own or permitted case views
- screening outcome details needed for operational use

### What the user can do

- log in and switch language
- run Arabic and English screening
- confirm extracted document data and continue screening
- view the machine decision, confidence, and explanation
- view limited case information relevant to the notary workflow
- add operational case actions where permitted by the workflow

### What the user must be blocked from doing

- opening the review queue
- generating evidence packages
- viewing evidence package download endpoints
- browsing imported list records
- activating or archiving data-source versions
- downloading compliance timeline exports
- viewing internal governance-only case fields

### Expected result

- The notary can complete front-line screening work.
- Review, evidence, and source-governance controls remain blocked.

## Execution Record

| Role | Tester | Date | Result | Notes |
|---|---|---|---|---|
| SUPER_ADMIN |  |  |  |  |
| COUNCIL_ADMIN |  |  |  |  |
| COMPLIANCE_OFFICER |  |  |  |  |
| NOTARY |  |  |  |  |

## Certified Baseline Note

This role script is written for the certified Arabic production-valid baseline with latest certificate `kydex-prod-2026-04-27T03-32-22-703Z` and `productionValid true`.