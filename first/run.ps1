# Start Flask (conda py310 preferred, else .venv)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$CondaPython = "E:\APP_Data\anaconda3\envs\py310\python.exe"
$venvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

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
