# Build React frontend into frontend/dist (required for new UI features)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$frontend = Join-Path $root "frontend"

function Find-Npm {
    $names = @("npm.cmd", "npm.exe", "npm")
    foreach ($dir in @(
        "C:\Program Files\nodejs",
        "$env:APPDATA\npm",
        "$env:ProgramFiles\nodejs"
    )) {
        foreach ($n in $names) {
            $p = Join-Path $dir $n
            if (Test-Path $p) { return $p }
        }
    }
    $cmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

$npm = Find-Npm
if (-not $npm) {
    Write-Host ""
    Write-Host "Node.js / npm not found. Install from https://nodejs.org/ then run this script again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Set-Location $frontend
Write-Host "Using npm: $npm" -ForegroundColor Green
& $npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$marker = Join-Path $frontend "dist\.build-marker"
Set-Content -Path $marker -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Encoding UTF8
Write-Host ""
Write-Host "Frontend build OK." -ForegroundColor Green
Write-Host "Next: cd D:\my_code\xiwopai\first" -ForegroundColor Green
Write-Host "      .\run-conda.ps1" -ForegroundColor Green
Write-Host "Then open http://127.0.0.1:50003 and press Ctrl+F5 in the browser." -ForegroundColor Green
