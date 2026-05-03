# BACKUP_RECOVERY_RUNBOOK

## Backup Scope
- PostgreSQL data
- Object storage (MinIO bucket data)
- Core evidence artifacts

## Backup Jobs
- Daily PostgreSQL backup: deploy/backup/postgres-backup.ps1
- Daily object storage backup: deploy/backup/object-storage-backup.ps1
- Backup validation: npm run backup:test

## Encryption
- Backup manifest encryption uses BACKUP_ENCRYPTION_KEY.
- Store key in secure secret manager.

## Restore Test
1. Generate backup and encrypted manifest via npm run backup:test.
2. Execute restore dry-run via deploy/backup/restore-test.ps1.
3. Verify integrity hashes after restore copy.

## Recovery Targets
- Recovery Time Objective (RTO): 30 minutes target for critical services.
- Recovery Point Objective (RPO): 24 hours under daily backup cadence.

## Required Proof
- Backup created: yes
- Restore tested: yes
- Recovery time documented: yes
