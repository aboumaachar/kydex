param(
  [string]$KydexBase = "https://kydex.me"
)

$ErrorActionPreference = "Stop"

$adminBody = @{ email = "admin@kydex.local"; password = "KydexPass123!" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$KydexBase/api/v1/auth/login" -ContentType "application/json" -Body $adminBody
if (-not $login.accessToken) {
  throw "Admin token missing"
}

$headers = @{ Authorization = "Bearer $($login.accessToken)" }
$newKeyBody = @{
  notarySlug = "sandranassif"
  displayName = "Sandra Nassif Kallab"
  label = "Sandra production server key"
} | ConvertTo-Json

$keyResp = Invoke-RestMethod -Method Post -Uri "$KydexBase/api/v1/admin/notary-keys" -Headers $headers -ContentType "application/json" -Body $newKeyBody
if (-not $keyResp.rawKey) {
  throw "Notary raw key missing"
}

$officePassword = "SandraOffice!2026#Temp"
$configPath = "C:\Users\User\Desktop\sandra\api\config.php"
$lines = @(
  "<?php",
  "declare(strict_types=1);",
  "define('OFFICE_LOGIN_USERNAME', 'office');",
  "define('OFFICE_LOGIN_PASSWORD', '$officePassword');",
  "define('OFFICE_LOGIN_PASSWORD_HASH', '');",
  "define('OFFICE_SESSION_NAME', 'SANDRA_OFFICE_SESSION');",
  "define('OFFICE_SESSION_TTL_SECONDS', 7200);",
  "define('KYDEX_API_BASE', 'https://kydex.me');",
  "define('KYDEX_NOTARY_SLUG', 'sandranassif');",
  "define('KYDEX_API_SEARCH_PATH', '/api/v1/notaries/{slug}/screening/search');",
  "define('KYDEX_NOTARY_API_KEY', '$($keyResp.rawKey)');",
  "define('KYDEX_CLIENT_ID', 'external-api-client');",
  "define('KYDEX_CLIENT_NAME', 'sandra-office-portal');",
  "define('KYDEX_WORDPRESS_SITE', '');",
  "define('KYDEX_REQUIRE_TOKEN', true);",
  "define('KYDEX_TIMEOUT_SECONDS', 20);"
)
Set-Content -Path $configPath -Value ($lines -join "`n") -Encoding UTF8

$archivePath = "C:\Users\User\AppData\Local\Temp\sandra-rollout.tgz"
if (Test-Path $archivePath) {
  Remove-Item $archivePath -Force
}

& tar -czf $archivePath -C "C:\Users\User\Desktop\sandra" --exclude ".snapshots" index.html kydex-search.html api
if (-not (Test-Path $archivePath)) {
  throw "Archive not created"
}

Write-Output ("KEY_ID=" + $keyResp.id)
Write-Output ("KEY_PREFIX=" + $keyResp.rawKey.Substring(0, 16))
Write-Output ("OFFICE_PASSWORD=" + $officePassword)
Write-Output ("ARCHIVE=" + $archivePath)
