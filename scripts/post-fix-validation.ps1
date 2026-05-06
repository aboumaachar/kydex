$ErrorActionPreference = 'Stop'

$base = 'https://kydex.me'
$adminBody = @{ email = 'admin@kydex.local'; password = 'KydexPass123!' } | ConvertTo-Json
$admin = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $adminBody
$headers = @{ Authorization = "Bearer $($admin.accessToken)" }

$status = Invoke-RestMethod -Uri "$base/api/v1/sources/LEBANON_NATIONAL_LIST/status" -Headers $headers -Method Get
$importStatus = Invoke-RestMethod -Uri "$base/api/v1/sources/LEBANON_NATIONAL_LIST/import-status" -Headers $headers -Method Get
$lists = Invoke-RestMethod -Uri "$base/api/v1/sources/LEBANON_NATIONAL_LIST/lists" -Headers $headers -Method Get

$listName = [string]$lists[0].listName
$enc = [Uri]::EscapeDataString($listName)
$preview = Invoke-RestMethod -Uri "$base/api/v1/sources/LEBANON_NATIONAL_LIST/lists/$enc/preview?take=30&skip=0" -Headers $headers -Method Get

$knownNames = @()
foreach ($entity in $preview.entities) {
  $name = [string]$entity.primaryName
  if ([string]::IsNullOrWhiteSpace($name)) { continue }
  $knownNames += $name
  if ($knownNames.Count -ge 6) { break }
}

$notaryKey = 'kydex_notary_82add4fcc85faa30811cc397564812b6f6ccf0867f5aa10b'

$screenRows = @()
foreach ($query in $knownNames) {
  $payload = @{ query = $query; fullName = $query; sources = @('LEBANON_NATIONAL_LIST'); screeningType = 'ofac' } | ConvertTo-Json -Depth 6
  $response = Invoke-RestMethod -Uri "$base/api/v1/screen" -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
  $top = $null
  if ($response.matches -and $response.matches.Count -gt 0) { $top = $response.matches[0] }
  $screenRows += [pscustomobject]@{
    query = $query
    count = ($response.matches | Measure-Object).Count
    topSource = if ($top) { [string]$top.source } else { '' }
    queryId = [string]$response.queryId
  }
}

$directRows = @()
foreach ($query in $knownNames) {
  $payload = @{ query = $query; screeningType = 'ofac'; sources = @('LEBANON_NATIONAL_LIST'); liveVerify = $true; clientReference = 'post-fix-direct-validation' } | ConvertTo-Json -Depth 6
  $response = Invoke-RestMethod -Uri "$base/api/v1/notaries/sandranassif/screening/search" -Method Post -ContentType 'application/json' -Headers @{
    'x-kydex-notary-key' = $notaryKey
    'x-kydex-client' = 'external-api-client'
    'x-kydex-client-name' = 'sandra-office-portal'
  } -Body $payload
  $top = $null
  if ($response.matches -and $response.matches.Count -gt 0) { $top = $response.matches[0] }
  $directRows += [pscustomobject]@{
    query = $query
    count = ($response.matches | Measure-Object).Count
    topSource = if ($top) { [string]$top.source } else { '' }
    topSourceAr = if ($top) { [string]$top.sourceDisplayNameAr } else { '' }
    auditId = [string]$response.auditId
  }
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$officeBody = @{ username = 'office'; password = 'SandraOffice!2026#Temp' } | ConvertTo-Json
Invoke-WebRequest -Uri "$base/sandra/api/auth.php" -Method Post -ContentType 'application/json' -Body $officeBody -WebSession $session | Out-Null

$sandraLocalRows = @()
foreach ($query in $knownNames) {
  $payload = @{ query = $query; sourceScope = 'local' } | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "$base/sandra/api/kydex-search.php" -Method Post -ContentType 'application/json' -Body $payload -WebSession $session
  $top = $null
  if ($response.matches -and $response.matches.Count -gt 0) { $top = $response.matches[0] }
  $sandraLocalRows += [pscustomobject]@{
    query = $query
    count = [int]$response.resultCount
    usedSources = ($response.usedSources -join ',')
    topSource = if ($top) { [string]$top.source } else { '' }
    topSourceAr = if ($top) { [string]$top.sourceDisplayNameAr } else { '' }
    auditId = [string]$response.auditId
  }
}

$scopeCheck = @()
foreach ($scope in @('all', 'local', 'ofac')) {
  $payload = @{ query = $knownNames[0]; sourceScope = $scope } | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "$base/sandra/api/kydex-search.php" -Method Post -ContentType 'application/json' -Body $payload -WebSession $session
  $scopeCheck += [pscustomobject]@{
    scope = $scope
    usedSources = ($response.usedSources -join ',')
    resultCount = [int]$response.resultCount
    auditId = [string]$response.auditId
  }
}

$noise = 'random unrelated qzxqzx enterprise string 883214'
$noiseDirectPayload = @{ query = $noise; screeningType = 'ofac'; sources = @('LEBANON_NATIONAL_LIST'); liveVerify = $true; clientReference = 'post-fix-noise' } | ConvertTo-Json -Depth 6
$noiseDirect = Invoke-RestMethod -Uri "$base/api/v1/notaries/sandranassif/screening/search" -Method Post -ContentType 'application/json' -Headers @{
  'x-kydex-notary-key' = $notaryKey
  'x-kydex-client' = 'external-api-client'
  'x-kydex-client-name' = 'sandra-office-portal'
} -Body $noiseDirectPayload
$noiseSandra = Invoke-RestMethod -Uri "$base/sandra/api/kydex-search.php" -Method Post -ContentType 'application/json' -Body (@{ query = $noise; sourceScope = 'local' } | ConvertTo-Json) -WebSession $session

$output = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('s')
  status = $status
  importStatus = $importStatus
  listName = $listName
  sampleKnownNames = $knownNames
  screenRows = $screenRows
  directRows = $directRows
  sandraLocalRows = $sandraLocalRows
  scopeCheck = $scopeCheck
  noiseDirectCount = ($noiseDirect.matches | Measure-Object).Count
  noiseSandraCount = [int]$noiseSandra.resultCount
}

$outputPath = 'C:\kydex\post_fix_notary_sandra_validation.json'
$output | ConvertTo-Json -Depth 10 | Set-Content -Path $outputPath -Encoding UTF8

Write-Output "WROTE=$outputPath"
Write-Output "KNOWN_COUNT=$($knownNames.Count)"
Write-Output "SCREEN_TOP_LEB=$(($screenRows | Where-Object { $_.topSource -eq 'LEBANON_NATIONAL_LIST' }).Count)"
Write-Output "DIRECT_TOP_LEB=$(($directRows | Where-Object { $_.topSource -eq 'LEBANON_NATIONAL_LIST' }).Count)"
Write-Output "SANDRA_TOP_LEB=$(($sandraLocalRows | Where-Object { $_.topSource -eq 'LEBANON_NATIONAL_LIST' }).Count)"
Write-Output "NOISE_DIRECT=$(($noiseDirect.matches | Measure-Object).Count)"
Write-Output "NOISE_SANDRA=$([int]$noiseSandra.resultCount)"
