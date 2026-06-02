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

$FlaskPort = if ($env:FLASK_PORT) { [int]$env:FLASK_PORT } else { 50003 }
$listeners = netstat -ano | Select-String ":$FlaskPort\s" | Select-String "LISTENING"
$pids = @($listeners | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique)
if ($pids.Count -gt 0) {
    Write-Host ""
    Write-Host "[WARN] Port $FlaskPort already in use by PID(s): $($pids -join ', ')" -ForegroundColor Yellow
    Write-Host "       Stopping stale Flask instance(s) to avoid mixed API versions..." -ForegroundColor Yellow
    foreach ($procId in $pids) {
        try {
            Stop-Process -Id ([int]$procId) -Force -ErrorAction Stop
            Write-Host "       Stopped PID $procId" -ForegroundColor DarkYellow
        } catch {
            Write-Host "       Could not stop PID $procId — close it manually, then retry." -ForegroundColor Red
            exit 1
        }
    }
    Start-Sleep -Seconds 1
    Write-Host ""
}

$distJs = Get-ChildItem (Join-Path $PSScriptRoot "frontend\dist\assets\index-*.js") -ErrorAction SilentlyContinue | Select-Object -First 1
if ($distJs) {
    $txt = Get-Content $distJs.FullName -Raw -ErrorAction SilentlyContinue
    if ($txt -notmatch "WorkspacePage|workspace/inbox-counts|fetchInboxCounts") {
        Write-Host ""
        Write-Host "[WARN] frontend/dist looks outdated (new features missing in bundle)." -ForegroundColor Yellow
        Write-Host "       Run: .\build-frontend.ps1  then start this script again. Ctrl+F5 in browser." -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "[WARN] frontend/dist not found. Run .\build-frontend.ps1 first." -ForegroundColor Yellow
}

& $CondaPython app.py
