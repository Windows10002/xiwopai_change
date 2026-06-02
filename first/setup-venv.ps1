# 在项目目录创建/重建 .venv 并安装依赖（需系统已安装 Python 3.10+）
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 优先使用项目配置的 Conda 解释器（与 .python-env 一致）
$ProjectConda = "E:\APP_Data\anaconda3\envs\py310\python.exe"

function Find-Python {
    if (Test-Path $ProjectConda) { return $ProjectConda }
    $candidates = @(
        (Get-Command py -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python312\python.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python311\python.exe"
    ) | Where-Object { $_ -and (Test-Path $_) }

    if (Get-Command py -ErrorAction SilentlyContinue) {
        $ver = & py -3 -c "import sys; print(sys.executable)" 2>$null
        if ($ver -and (Test-Path $ver)) { return $ver.Trim() }
    }
    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) {
            $out = & $c -c "import sys; print(sys.executable)" 2>$null
            if ($LASTEXITCODE -eq 0 -and $out) { return $out.Trim() }
        }
    }
    return $null
}

$py = Find-Python
if (-not $py) {
    Write-Host @"

未检测到可用的 Python。

请按以下步骤安装（任选其一）：
  1. 打开 https://www.python.org/downloads/ 下载 Python 3.12
  2. 安装时务必勾选 「Add python.exe to PATH」
  3. 关闭并重新打开 PowerShell，再执行本脚本

或关闭 Windows「应用执行别名」中的 python/python3 商店占位：
  设置 → 应用 → 高级应用设置 → 应用执行别名 → 关闭 python.exe / python3.exe

"@ -ForegroundColor Red
    exit 1
}

Write-Host "使用 Python: $py" -ForegroundColor Green

if (Test-Path ".venv") {
    Write-Host "删除旧的 .venv（原基础路径可能已失效）…"
    Remove-Item -Recurse -Force ".venv"
}

& $py -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\pip.exe" install -r requirements.txt

Write-Host "`n完成。启动服务请执行: .\run.ps1" -ForegroundColor Green
