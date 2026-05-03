# DATA_RETENTION_POLICY

## Data Retention Baseline
- Audit logs: retain 7 years.
- Evidence packages: retain 7 years or per council/legal mandate.
- Screening queries and case workflow metadata: retain 7 years.
- Raw uploaded documents: retain minimum required period, then redact/delete based on policy.

## PII Minimization Rules
- Only store fields required for compliance screening and legal evidence.
- Prefer normalized identifiers over full raw content where possible.
- Redact uploaded documents after extraction when configured.

## Deletion and Redaction Policy
- Document redaction flag supported in extraction flow.
- Periodic review to remove temporary artifacts outside retention policy.

## Backup Retention Policy
- Daily backups retained for 30 days.
- Weekly backups retained for 12 weeks.
- Monthly backups retained for 12 months.
- Encryption mandatory for backup artifacts.
