# KYDEX Security and Compliance Summary

## Access Controls

- JWT + role guards on admin APIs
- Notary key guard on notary screening endpoints
- Membership state enforcement for commercial eligibility

## Key Handling

- Notary keys stored as SHA-256 hash only
- Key secret visible only at create/rotate response
- Revoke and suspend actions apply immediately

## Abuse and Observability

- Failed auth attempts logged with context metadata
- Abuse threshold can auto-suspend keys
- Screening transactions and inquiries remain auditable

## Safe Result Wording

Use:
- No material match found.
- Possible match - review required.
- Strong potential match - manual verification required.
- Screening completed using local KYDEX copy.
- Original source unavailable at search time.

Avoid:
- Definitive sanctions declarations about an individual.
- Automated blocking statements presented as final outcomes.
- Language implying confirmed list determination without human review.
