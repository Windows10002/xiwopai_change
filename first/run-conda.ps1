# Start Flask with Anaconda env py310
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$CondaPython = "E:\APP_Data\anaconda3\envs\py310\python.exe"
if (-not (Test-Path $CondaPython)) {
    Write-Host "Python not found: $CondaPython" -ForegroundColor Red
    Write-Host "Edit CondaPython in run-conda.ps1, or: conda activate py310 ; python app.py"
    exit 1
}

Write-Host "Python: $(& $CondaPython --version)" -ForegroundColor Green

$distJs = Get-ChildItem (Join-Path $PSScriptRoot "frontend\dist\assets\index-*.js") -ErrorAction SilentlyContinue | Select-Object -First 1
if ($distJs) {
    $txt = Get-Content $distJs.FullName -Raw -ErrorAction SilentlyContinue
    if ($txt -notmatch "class-analytics|feedback-dashboard|ParentView") {
        Write-Host ""
        Write-Host "[WARN] frontend/dist looks outdated (new features missing in bundle)." -ForegroundColor Yellow
        Write-Host "       Run: .\build-frontend.ps1  then start this script again. Ctrl+F5 in browser." -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "[WARN] frontend/dist not found. Run .\build-frontend.ps1 first." -ForegroundColor Yellow
}

& $CondaPython app.py
