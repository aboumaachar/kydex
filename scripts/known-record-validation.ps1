$ErrorActionPreference = 'Stop'

$base = 'https://kydex.me'
$adminEmail = 'admin@kydex.local'
$adminPass = 'KydexPass123!'
$officeUser = 'office'
$officePass = 'SandraOffice!2026#Temp'
$notaryKey = 'kydex_notary_82add4fcc85faa30811cc397564812b6f6ccf0867f5aa10b'

$adminBody = @{ email = $adminEmail; password = $adminPass } | ConvertTo-Json
$adminResp = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $adminBody
$token = $adminResp.accessToken
if (-not $token) { throw 'Admin login failed: no token' }
$authHeaders = @{ Authorization = "Bearer $token" }

$lists = Invoke-RestMethod -Uri "$base/api/v1/sources/LEBANON_NATIONAL_LIST/lists" -Headers $authHeaders -Method Get
$merged = $lists | Where-Object { $_.listName -like '*Bilingual Merged*' } | Select-Object -First 1
if (-not $merged) { $merged = $lists | Select-Object -First 1 }
if (-not $merged) { throw 'No list found for LEBANON_NATIONAL_LIST' }
$listNameEncoded = [Uri]::EscapeDataString([string]$merged.listName)

$preview = Invoke-RestMethod -Uri "$base/api/v1/sources/LEBANON_NATIONAL_LIST/lists/$listNameEncoded/preview?take=200&skip=0" -Headers $authHeaders -Method Get
if (-not $preview.entities) { throw 'No entities in preview' }

$records = @()
foreach ($e in $preview.entities) {
  $raw = $e.rawRecord
  $ar = ''
  $en = ''

  if ($raw) {
    if ($raw.PSObject.Properties.Name -contains 'primaryNameAr') { $ar = [string]$raw.primaryNameAr }
    if ($raw.PSObject.Properties.Name -contains 'primaryNameEn') { $en = [string]$raw.primaryNameEn }
  }

  if ([string]::IsNullOrWhiteSpace($ar)) { $ar = [string]$e.normalizedArabic }
  if ([string]::IsNullOrWhiteSpace($en)) { $en = [string]$e.primaryName }

  $first = ''
  $family = ''
  if ($en) {
    $parts = $en -split '\s+'
    if ($parts.Count -ge 1) { $first = $parts[0] }
    if ($parts.Count -ge 2) { $family = $parts[$parts.Count - 1] }
  }

  if (-not [string]::IsNullOrWhiteSpace($ar) -or -not [string]::IsNullOrWhiteSpace($en)) {
    $records += [pscustomobject]@{
      entityId = [string]$e.externalEntityId
      fullAr = $ar
      fullEn = $en
      first = $first
      family = $family
    }
  }

  if ($records.Count -ge 10) { break }
}

if ($records.Count -lt 10) { throw "Only found $($records.Count) usable known records" }

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$officeBody = @{ username = $officeUser; password = $officePass } | ConvertTo-Json
Invoke-WebRequest -Uri "$base/sandra/api/auth.php" -Method Post -ContentType 'application/json' -Body $officeBody -WebSession $session | Out-Null

function Test-Direct([string]$query) {
  if ([string]::IsNullOrWhiteSpace($query)) { return $null }

  $body = @{ 
    query = $query
    screeningType = 'ofac'
    sources = @('LEBANON_NATIONAL_LIST')
    liveVerify = $true
    clientReference = 'known-record-validation'
  } | ConvertTo-Json -Depth 6

  try {
    $resp = Invoke-RestMethod -Uri "$base/api/v1/notaries/sandranassif/screening/search" -Method Post -ContentType 'application/json' -Headers @{
      'x-kydex-notary-key' = $notaryKey
      'x-kydex-client' = 'external-api-client'
      'x-kydex-client-name' = 'sandra-office-portal'
    } -Body $body

    $top = $null
    if ($resp.matches -and $resp.matches.Count -gt 0) { $top = $resp.matches[0] }

    return [pscustomobject]@{
      ok = $true
      query = $query
      count = [int]($resp.matches.Count)
      topSource = if ($top) { [string]$top.source } else { '' }
      topSourceAr = if ($top) { [string]$top.sourceDisplayNameAr } else { '' }
      matchedName = if ($top) { [string]$top.matchedName } else { '' }
      matchEvidence = if ($top -and $top.PSObject.Properties.Name -contains 'matchEvidence') { [string]$top.matchEvidence } else { '' }
      matchedToken = if ($top -and $top.PSObject.Properties.Name -contains 'matchedToken') { [string]$top.matchedToken } else { '' }
      auditId = [string]$resp.auditId
    }
  }
  catch {
    return [pscustomobject]@{ ok = $false; query = $query; error = $_.Exception.Message }
  }
}

function Test-SandraLocal([string]$query) {
  if ([string]::IsNullOrWhiteSpace($query)) { return $null }

  $body = @{ query = $query; searchType = 'mixed'; sourceScope = 'local' } | ConvertTo-Json
  try {
    $resp = Invoke-RestMethod -Uri "$base/sandra/api/kydex-search.php" -Method Post -ContentType 'application/json' -Body $body -WebSession $session
    $top = $null
    if ($resp.matches -and $resp.matches.Count -gt 0) { $top = $resp.matches[0] }

    return [pscustomobject]@{
      ok = $true
      query = $query
      count = [int]($resp.resultCount)
      usedSources = ($resp.usedSources -join ',')
      topSource = if ($top) { [string]$top.source } else { '' }
      topSourceAr = if ($top) { [string]$top.sourceDisplayNameAr } else { '' }
      matchedName = if ($top) { [string]$top.matchedName } else { '' }
      matchEvidence = if ($top -and $top.PSObject.Properties.Name -contains 'matchEvidence') { [string]$top.matchEvidence } else { '' }
      matchedToken = if ($top -and $top.PSObject.Properties.Name -contains 'matchedToken') { [string]$top.matchedToken } else { '' }
      auditId = [string]$resp.auditId
    }
  }
  catch {
    return [pscustomobject]@{ ok = $false; query = $query; error = $_.Exception.Message }
  }
}

$matrix = @()
foreach ($r in $records) {
  $variants = @(
    [pscustomobject]@{ type = 'exact_full_ar'; query = $r.fullAr },
    [pscustomobject]@{ type = 'exact_full_en'; query = $r.fullEn },
    [pscustomobject]@{ type = 'first_name'; query = $r.first },
    [pscustomobject]@{ type = 'family_name'; query = $r.family }
  )

  foreach ($v in $variants) {
    if ([string]::IsNullOrWhiteSpace([string]$v.query)) { continue }

    $d = Test-Direct -query ([string]$v.query)
    $s = Test-SandraLocal -query ([string]$v.query)

    $matrix += [pscustomobject]@{
      entityId = $r.entityId
      variantType = $v.type
      query = [string]$v.query
      directOk = if ($d) { $d.ok } else { $false }
      directCount = if ($d -and $d.ok) { $d.count } else { -1 }
      directTopSource = if ($d -and $d.ok) { $d.topSource } else { '' }
      directTopSourceAr = if ($d -and $d.ok) { $d.topSourceAr } else { '' }
      directAuditId = if ($d -and $d.ok) { $d.auditId } else { '' }
      sandraOk = if ($s) { $s.ok } else { $false }
      sandraCount = if ($s -and $s.ok) { $s.count } else { -1 }
      sandraUsedSources = if ($s -and $s.ok) { $s.usedSources } else { '' }
      sandraTopSource = if ($s -and $s.ok) { $s.topSource } else { '' }
      sandraTopSourceAr = if ($s -and $s.ok) { $s.topSourceAr } else { '' }
      sandraAuditId = if ($s -and $s.ok) { $s.auditId } else { '' }
    }
  }
}

$noise = 'this is unrelated random enterprise text qzxqzx 883214'
$noiseDirect = Test-Direct -query $noise
$noiseSandra = Test-SandraLocal -query $noise

$exactLebDirect = ($matrix | Where-Object { $_.variantType -in @('exact_full_ar', 'exact_full_en') -and $_.directTopSource -eq 'LEBANON_NATIONAL_LIST' }).Count
$exactLebSandra = ($matrix | Where-Object { $_.variantType -in @('exact_full_ar', 'exact_full_en') -and $_.sandraTopSource -eq 'LEBANON_NATIONAL_LIST' }).Count

$result = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('s')
  mergedList = $merged.listName
  knownRecordCount = $records.Count
  testedQueries = $matrix.Count
  exactLebanonMatchesDirect = $exactLebDirect
  exactLebanonMatchesSandra = $exactLebSandra
  noiseDirect = $noiseDirect
  noiseSandra = $noiseSandra
  sampleRecords = $records
  matrix = $matrix
}

$resultPath = 'C:\kydex\known_record_validation_results.json'
$result | ConvertTo-Json -Depth 8 | Set-Content -Path $resultPath -Encoding UTF8

Write-Output "WROTE=$resultPath"
Write-Output "KNOWN_RECORDS=$($records.Count)"
Write-Output "TESTED_QUERIES=$($matrix.Count)"
Write-Output "EXACT_DIRECT=$exactLebDirect"
Write-Output "EXACT_SANDRA=$exactLebSandra"
Write-Output "NOISE_DIRECT_COUNT=$($noiseDirect.count)"
Write-Output "NOISE_SANDRA_COUNT=$($noiseSandra.count)"