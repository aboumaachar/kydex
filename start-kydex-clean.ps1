<# 
startals-kydex-clean.ps1
Clean local KYDEX startup script for Windows PowerShell.

What it does:
1. Stops local KYDEX-related Node processes and anything listening on the API/Web ports.
2. Clears stale Next.js runtime cache.
3. Starts KYDEX API and KYDEX Web in separate PowerShell windows.
4. Waits for health checks and prints the final URLs.

Default ports:
- API: http://localhost:4000/api/v1/health
- Web: http://localhost:3000
#>

param(
    [string]$Root = "C:\kydex",
    [int]$ApiPort = 4000,
    [int]$WebPort = 3000,
    [switch]$ClearTurbo,
    [switch]$SkipCacheClear
)

$ErrorActionPreference = "Continue"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    if (-not $connections) {
        Write-Host "Port $Port is free." -ForegroundColor DarkGray
        return
    }

    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($pidValue in $pids) {
        try {
            $proc = Get-Process -Id $pidValue -ErrorAction Stop
            Write-Host "Stopping process on port ${Port}: PID ${pidValue} ($($proc.ProcessName))" -ForegroundColor Yellow
            Stop-Process -Id $pidValue -Force
        } catch {
            Write-Host "Could not stop PID ${pidValue} on port ${Port}: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Stop-KydexNodeProcesses {
    param([string]$RootPath)

    $nodeProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and $_.CommandLine -like "*$RootPath*"
        }

    foreach ($node in $nodeProcesses) {
        try {
            Write-Host "Stopping KYDEX Node process: PID $($node.ProcessId)" -ForegroundColor Yellow
            Stop-Process -Id $node.ProcessId -Force
        } catch {
            Write-Host "Could not stop KYDEX Node PID $($node.ProcessId): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Wait-Http {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 60,
        [string]$Label = "service"
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Write-Host "$Label is responding: HTTP $($response.StatusCode)" -ForegroundColor Green
                return $true
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    Write-Host "$Label did not respond within $TimeoutSeconds seconds: $Url" -ForegroundColor Red
    return $false
}

Write-Host "KYDEX Clean Startup" -ForegroundColor Green
Write-Host "Root: $Root"
Write-Host "API Port: $ApiPort"
Write-Host "Web Port: $WebPort"

if (-not (Test-Path $Root)) {
    Write-Host "KYDEX root not found: $Root" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    Write-Host "package.json not found under $Root. Are you pointing to the KYDEX root?" -ForegroundColor Red
    exit 1
}

Write-Step "Stopping existing KYDEX processes"
Stop-PortProcess -Port $WebPort
Stop-PortProcess -Port $ApiPort
Stop-KydexNodeProcesses -RootPath $Root

Start-Sleep -Seconds 2

if (-not $SkipCacheClear) {
    Write-Step "Clearing stale web runtime cache"

    $webNext = Join-Path $Root "apps\web\.next"
    if (Test-Path $webNext) {
        Remove-Item $webNext -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed: $webNext" -ForegroundColor DarkGray
    } else {
        Write-Host "No .next cache found at: $webNext" -ForegroundColor DarkGray
    }

    if ($ClearTurbo) {
        $turbo = Join-Path $Root ".turbo"
        if (Test-Path $turbo) {
            Remove-Item $turbo -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Removed: $turbo" -ForegroundColor DarkGray
        }
    }
}

Write-Step "Starting KYDEX API"
$apiCommand = "Set-Location '$Root'; npm run dev:api"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $apiCommand

$apiHealthUrl = "http://localhost:$ApiPort/api/v1/health"
$apiReady = Wait-Http -Url $apiHealthUrl -TimeoutSeconds 75 -Label "KYDEX API"

Write-Step "Starting KYDEX Web"
$webCommand = "Set-Location '$Root'; npm run dev:web"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $webCommand

$webUrl = "http://localhost:$WebPort"
$webReady = Wait-Http -Url $webUrl -TimeoutSeconds 90 -Label "KYDEX Web"

Write-Step "Final status"

if ($apiReady) {
    Write-Host "API: $apiHealthUrl" -ForegroundColor Green
} else {
    Write-Host "API: not confirmed. Check the API terminal window." -ForegroundColor Red
}

if ($webReady) {
    Write-Host "Web: $webUrl" -ForegroundColor Green
} else {
    Write-Host "Web: not confirmed. Check the Web terminal window." -ForegroundColor Red
}

Write-Host ""
Write-Host "Open these pages:" -ForegroundColor Cyan
Write-Host "Home:              http://localhost:$WebPort/"
Write-Host "Login:             http://localhost:$WebPort/login"
Write-Host "Screening:         http://localhost:$WebPort/screening/new"
Write-Host "OFAC local lists:  http://localhost:$WebPort/dashboard/sources/ofac/local-lists"

Write-Host ""
Write-Host "Useful checks:" -ForegroundColor Cyan
Write-Host "curl.exe http://localhost:$ApiPort/api/v1/health"
Write-Host "curl.exe -I http://localhost:$WebPort/"

Write-Host ""
Write-Host "KYDEX clean startup finished." -ForegroundColor Green
