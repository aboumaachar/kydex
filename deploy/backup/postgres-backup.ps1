param(
  [string]$BackupRoot = "C:\kydex\backups\postgres"
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetDir = Join-Path $BackupRoot $stamp
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

$dumpFile = Join-Path $targetDir "kydex.sql"
$archiveFile = Join-Path $targetDir "kydex.sql.gz"

$postgresUser = $env:POSTGRES_USER
$postgresDb = $env:POSTGRES_DB
if (-not $postgresUser -or -not $postgresDb) {
  throw "POSTGRES_USER and POSTGRES_DB must be set"
}

docker exec kydex-postgres-prod pg_dump -U $postgresUser -d $postgresDb -F p -f /tmp/kydex.sql

docker cp "kydex-postgres-prod:/tmp/kydex.sql" $dumpFile

gzip -f $dumpFile
if (Test-Path "$dumpFile.gz") {
  Rename-Item -Path "$dumpFile.gz" -NewName (Split-Path $archiveFile -Leaf)
}

Write-Output "PostgreSQL backup created: $archiveFile"
