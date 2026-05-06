param(
  [string]$KydexBaseUrl = "https://kydex.me",
  [string]$NotarySlug = "sandranassif",
  [string]$DisplayName = "Sandra Nassif Kallab",
  [string]$Label = "Sandra demo office portal"
)

$ErrorActionPreference = "Stop"

$AdminEmail = Read-Host "KYDEX admin email"
$AdminPassword = Read-Host "KYDEX admin password" -AsSecureString
$PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword)
)

$loginBody = @{
  email = $AdminEmail
  password = $PlainPassword
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$KydexBaseUrl/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody

if (-not $login.accessToken) {
  throw "No admin access token returned."
}

$headers = @{
  Authorization = "Bearer $($login.accessToken)"
}

$createBody = @{
  notarySlug = $NotarySlug
  displayName = $DisplayName
  label = $Label
} | ConvertTo-Json

$keyResp = Invoke-RestMethod `
  -Method Post `
  -Uri "$KydexBaseUrl/api/v1/admin/notary-keys" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $createBody

if (-not $keyResp.rawKey) {
  throw "No rawKey returned from KYDEX."
}

Write-Host ""
Write-Host "KYDEX notary key created."
Write-Host "Key ID: $($keyResp.id)"
Write-Host "Notary slug: $($keyResp.notarySlug)"
Write-Host ""
Write-Host "IMPORTANT: Store this raw key only in Sandra server-side config.php."
Write-Host ""
Write-Host $keyResp.rawKey
