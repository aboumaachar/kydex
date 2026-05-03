# KYDEX Backup Runbook

## Targets

- PostgreSQL database
- Source-library local OFAC copy tables
- Screening transactions
- Incoming inquiries
- Notary key metadata (no raw key material)
- Plugin configuration export
- Environment template files

## Daily Backup Procedure

1. Create timestamped backup directory under backups/production.
2. Dump PostgreSQL:
   - pg_dump -Fc -f backups/production/<timestamp>/kydex_db.dump <database>
3. Export source-library tables to SQL or CSV snapshots.
4. Export screening and inquiry tables.
5. Export notary profile and key metadata tables.
6. Copy deployment templates and runtime env templates.
7. Compute SHA-256 checksums for each artifact.
8. Replicate to off-host storage.

## Verification

- Confirm backup file sizes are non-zero.
- Validate checksum manifest.
- Restore latest backup to staging weekly.

## Retention

- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months

## Security

- Encrypt at rest and in transit.
- Restrict backup access to admin operators only.
- Never store plaintext KYDEX API keys.
