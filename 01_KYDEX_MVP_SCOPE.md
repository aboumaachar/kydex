# KYDEX MVP Scope

## 1. MVP Objective

Build the first operational KYDEX system for the Lebanese Notary Council use case while preserving the core engine as a reusable SaaS/API product.

The MVP must prove:

1. A user can screen a person/entity against multiple lists.
2. Results are scored, explained, logged, and stored.
3. The system can create a defensible compliance record.
4. High-risk or uncertain matches trigger escalation.
5. Every result is linked to the exact list version used.

## 2. MVP Must Include

### A. Identity Screening

- Single party screening.
- Multi-source query.
- OFAC connector.
- UN connector.
- Manual/local list upload.
- Matching score.
- Risk classification.
- Explanation of match reason.

### B. Audit Logging

- User action logs.
- Screening logs.
- Match logs.
- List version tracking.
- IP address and timestamp logging.
- Immutable append-only logic.

### C. Council Web Platform

- Notary login.
- Screening form.
- Results page.
- Compliance PDF generation.
- Case history.
- Escalation workflow.

### D. Case Management

- Auto-create case for HIGH/CRITICAL matches.
- Manual case creation for MEDIUM uncertainty.
- Review dashboard.
- Reviewer decision.
- SIC-ready export package.

### E. Admin Panel

- User management.
- Role management.
- Data source management.
- Manual dataset upload.
- Ingestion status.
- Audit log viewer.

## 3. MVP Must Exclude

- iOS app.
- Android app.
- Full AI automation.
- Automatic legal decision-making.
- Automatic SIC submission without formal authorization.
- Complex billing system.
- Full bank-grade SaaS onboarding.
- Public API marketplace.

## 4. MVP User Roles

```txt
SUPER_ADMIN
COUNCIL_ADMIN
COMPLIANCE_OFFICER
REVIEW_COMMITTEE_MEMBER
NOTARY
AUDITOR
API_CLIENT
```

## 5. MVP Success Criteria

- Screening returns results in under 1 second for normal queries.
- Every screening is logged with list version.
- HIGH and CRITICAL matches cannot be finalized without review.
- A compliance PDF can be generated.
- A reviewer can clear, request info, or escalate a case.
- A data source update can be imported and versioned.
- The system can prove what data was used at the time of screening.

## 6. Non-Negotiable Product Rule

KYDEX must be treated as:

> Decision-support and compliance evidence infrastructure.

Not:

> Final legal authority.
