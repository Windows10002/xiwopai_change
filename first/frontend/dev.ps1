# Frontend dev helper: prepend Node to PATH for this session
$NodeDir = "E:\APP\nodejs"
if (-not (Test-Path "$NodeDir\npm.cmd")) {
    Write-Host "Node not found at $NodeDir - edit dev.ps1" -ForegroundColor Red
    exit 1
}
$env:Path = "$NodeDir;" + $env:Path
Set-Location $PSScriptRoot

param(
    [Parameter(Position = 0)]
    [ValidateSet("install", "build", "dev")]
    [string]$Cmd = "dev"
)

switch ($Cmd) {
    "install" { npm install }
    "build" { npm run build }
    "dev" { npm run dev }
}
