param(
  [string]$BackupRoot = "C:\kydex\backups\object-storage"
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetDir = Join-Path $BackupRoot $stamp
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

$minioBackup = Join-Path $targetDir "minio-data.tar"
docker run --rm --volumes-from kydex-minio-prod -v "$targetDir:/backup" alpine sh -c "tar -cf /backup/minio-data.tar /data"

Write-Output "MinIO backup created: $minioBackup"
