# KYDEX Restore Runbook

## Preconditions

- Staging or recovery environment is provisioned
- Matching app version and migration baseline available
- Backup artifact checksums verified

## Restore Steps

1. Provision clean PostgreSQL database.
2. Restore DB dump:
   - pg_restore --clean --if-exists --no-owner -d <database> backups/.../kydex_db.dump
3. Apply Prisma migrations in deploy mode.
4. Load env template and required secrets.
5. Start API and web services.

## Minimum Restore Validation

1. Call /api/v1/sources/OFAC/status.
2. Run local fallback screening.
3. Run WordPress-style test query through notary endpoint.
4. Open screening logs and verify records are readable.
5. Confirm incoming inquiries are queryable.

## Post-restore Checks

- Verify admin login and role access.
- Verify notary key status endpoints.
- Verify membership enforcement behavior.
