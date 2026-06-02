# Start Flask (conda py310 preferred, else .venv)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$CondaPython = "E:\APP_Data\anaconda3\envs\py310\python.exe"
$venvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

function Stop-StaleFlaskListeners {
    param([int]$Port = 50003)
    $listeners = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    $pids = @($listeners | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique)
    foreach ($procId in $pids) {
        Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
    }
    if ($pids.Count -gt 0) { Start-Sleep -Seconds 1 }
}

$FlaskPort = if ($env:FLASK_PORT) { [int]$env:FLASK_PORT } else { 50003 }
Stop-StaleFlaskListeners -Port $FlaskPort

if (Test-Path $CondaPython) {
    & $CondaPython app.py
    exit $LASTEXITCODE
}
if (Test-Path $venvPy) {
    & $venvPy app.py
    exit $LASTEXITCODE
}

Write-Host "Python not found. Run setup-conda.ps1 or setup-venv.ps1 first." -ForegroundColor Yellow
exit 1
