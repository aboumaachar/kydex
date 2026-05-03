param(
  [string]$SshTarget = "root",
  [string]$RemotePath,
  [switch]$IncludeEnvProduction,
  [switch]$RunRemoteChecks,
  [switch]$DeleteRemoteContents,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RemotePath)) {
  throw "RemotePath is required. Example: -RemotePath /opt/kydex"
}

if ($RemotePath.Contains("'")) {
  throw "RemotePath cannot contain single quotes."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $repoRoot
$repoRootPath = $repoRoot.Path.TrimEnd('\\')

foreach ($commandName in @('ssh', 'scp', 'tar')) {
  if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $commandName"
  }
}

$files = New-Object System.Collections.Generic.List[string]
$allowedPrefixes = @('apps/', 'packages/', 'prisma/', 'deploy/', 'scripts/')
$allowedRootFiles = @(
  'package.json',
  'package-lock.json',
  'docker-compose.production.yml',
  '.env.production.example',
  'tsconfig.base.json',
  '.gitignore',
  'README.md'
)

foreach ($item in Get-ChildItem -Path $repoRoot -Recurse -File) {
  $relativePath = $item.FullName.Substring($repoRootPath.Length).TrimStart('\\')
  $normalized = $relativePath.Replace('\', '/')

  $isAllowedPath = $false
  foreach ($prefix in $allowedPrefixes) {
    if ($normalized.StartsWith($prefix)) {
      $isAllowedPath = $true
      break
    }
  }

  if (-not $isAllowedPath -and -not ($allowedRootFiles -contains $normalized)) {
    continue
  }

  if ($normalized.StartsWith('.git/')) { continue }
  if ($normalized.StartsWith('node_modules/')) { continue }
  if ($normalized.Contains('/node_modules/')) { continue }
  if ($normalized.StartsWith('apps/web/.next/')) { continue }
  if ($normalized.Contains('/.next/')) { continue }
  if ($normalized.StartsWith('backups/')) { continue }
  if ($normalized.StartsWith('.snapshots/')) { continue }
  if ($normalized.StartsWith('apps/api/node_modules/')) { continue }
  if ($normalized.StartsWith('apps/web/node_modules/')) { continue }
  if ($normalized.StartsWith('_phase5_audit/')) { continue }
  if ($normalized.StartsWith('_quarantine/')) { continue }
  if ($normalized.StartsWith('Case_A_Clear/')) { continue }
  if ($normalized.StartsWith('Case_A_FALSE_POSITIVE_CLEAR/')) { continue }
  if ($normalized.StartsWith('Case_B_Request_Info/')) { continue }
  if ($normalized.StartsWith('Case_B_REQUEST_MORE_INFO/')) { continue }
  if ($normalized.StartsWith('Case_C_Escalate_SIC/')) { continue }
  if ($normalized.StartsWith('Case_C_ESCALATE_SIC_READY/')) { continue }
  if ($normalized.StartsWith('Case_D_Reject_Block/')) { continue }
  if ($normalized.StartsWith('Case_E_SLA_Breach/')) { continue }
  if ($normalized.StartsWith('demo_script/')) { continue }
  if ($normalized.StartsWith('uat-pack/')) { continue }
  if ($normalized.StartsWith('kydex-ofac-integration-pack/')) { continue }
  if ($normalized.StartsWith('out')) { continue }
  if ($normalized.EndsWith('.zip')) { continue }
  if ($normalized.EndsWith('.tar')) { continue }
  if ($normalized.EndsWith('.tgz')) { continue }
  if ($normalized.EndsWith('.gz')) { continue }
  if ($normalized.EndsWith('.log')) { continue }
  if ($normalized -eq '.env.production') { continue }

  $files.Add($normalized)
}

if ($IncludeEnvProduction -and (Test-Path ".env.production")) {
  $files.Add(".env.production")
}

if ($files.Count -eq 0) {
  throw "No files selected for sync."
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("kydex-sync-" + [guid]::NewGuid().ToString("N"))
$null = New-Item -ItemType Directory -Path $tempRoot -Force

$fileListPath = Join-Path $tempRoot "files.txt"
$archivePath = Join-Path $tempRoot "kydex-sync.tgz"
[System.IO.File]::WriteAllLines($fileListPath, $files)

Write-Host "Creating archive from $($files.Count) files..."
& tar -czf $archivePath -T $fileListPath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $archivePath)) {
  throw "Failed to create sync archive."
}

Write-Host "Archive ready: $archivePath"
Write-Host "SSH target: $SshTarget"
Write-Host "Remote path: $RemotePath"

if ($DryRun) {
  Write-Host "Dry run only. Archive created locally; no remote changes made."
  exit 0
}

$remoteArchivePath = "/tmp/kydex-sync.tgz"
Write-Host "Uploading archive to $SshTarget..."
& scp $archivePath "${SshTarget}:$remoteArchivePath"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to upload archive to remote server."
}

$deleteCommand = ""
if ($DeleteRemoteContents) {
  $deleteCommand = "find '$RemotePath' -mindepth 1 -maxdepth 1 ! -name '.env.production' -exec rm -rf {} + && "
}

$remoteCommand = @(
  "set -e"
  "mkdir -p '$RemotePath'"
  ($deleteCommand + "tar -xzf '$remoteArchivePath' -C '$RemotePath'")
  "rm -f '$remoteArchivePath'"
  "cd '$RemotePath'"
  "test -f package.json"
) -join " && "

Write-Host "Extracting archive on remote server..."
& ssh $SshTarget $remoteCommand
if ($LASTEXITCODE -ne 0) {
  throw "Remote extraction failed."
}

if ($RunRemoteChecks) {
  $checkCommand = @(
    "set -e"
    "cd '$RemotePath'"
    "test -f docker-compose.production.yml"
    "test -f package.json"
    "if [ -f .env.production ]; then docker compose -f docker-compose.production.yml --env-file .env.production config >/dev/null; fi"
  ) -join " && "

  Write-Host "Running remote verification checks..."
  & ssh $SshTarget $checkCommand
  if ($LASTEXITCODE -ne 0) {
    throw "Remote verification checks failed."
  }
}

Write-Host "Sync completed successfully."