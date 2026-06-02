# Install Python deps into conda env py310
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$CondaPython = "E:\APP_Data\anaconda3\envs\py310\python.exe"
if (-not (Test-Path $CondaPython)) {
    Write-Host "Python not found: $CondaPython" -ForegroundColor Red
    exit 1
}

Write-Host "Using: $(& $CondaPython --version)" -ForegroundColor Green
Write-Host $CondaPython
& $CondaPython -m pip install --upgrade pip
& $CondaPython -m pip install -r requirements.txt
Write-Host ""
Write-Host "Done. Start server with: run-conda.ps1" -ForegroundColor Green
