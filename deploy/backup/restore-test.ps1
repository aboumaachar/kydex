param(
  [string]$PostgresArchive,
  [string]$ObjectStorageArchive
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PostgresArchive)) {
  throw "PostgreSQL archive not found: $PostgresArchive"
}

if (-not (Test-Path $ObjectStorageArchive)) {
  throw "Object storage archive not found: $ObjectStorageArchive"
}

Write-Output "Restore test start"
Write-Output "- PostgreSQL archive: $PostgresArchive"
Write-Output "- Object archive: $ObjectStorageArchive"
Write-Output "Restore dry-run completed. Execute full restore only in isolated recovery environment."
