Set-Location "C:\kydex"

Write-Host "Checking OFAC health..."
curl.exe http://localhost:4000/api/v1/ofac/health

Write-Host "`nChecking OFAC lists..."
curl.exe http://localhost:4000/api/v1/ofac/lists

Write-Host "`nChecking OFAC programs..."
curl.exe http://localhost:4000/api/v1/ofac/programs

Write-Host "`nRunning manual sync..."
curl.exe -X POST http://localhost:4000/api/v1/ofac/sync `
  -H "x-kydex-sync-token: change-this-admin-sync-token" `
  -H "Content-Type: application/json" `
  -d "{`"mode`":`"manual`",`"files`":[`"SDN_ADVANCED.XML`"]}"

Write-Host "`nScreening query..."
curl.exe -X POST http://localhost:4000/api/v1/screening/search `
  -H "Content-Type: application/json" `
  -d "{`"query`":`"KAVE COFFEE S.A.`",`"source`":`"dashboard`"}"

Write-Host "`nNotary screening query..."
curl.exe -X POST http://localhost:4000/api/v1/notaries/sandranassif/screening/search `
  -H "Content-Type: application/json" `
  -H "x-kydex-notary-key: dev_sandranassif_key" `
  -d "{`"query`":`"KAVE COFFEE S.A.`",`"source`":`"notary_webpage`"}"
