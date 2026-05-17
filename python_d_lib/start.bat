@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  智能作业批改 - 启动
echo ========================================
echo.

set "NODE=e:\cursor\resources\app\resources\helpers\node.exe"
if not exist "%NODE%" set "NODE=node"

if exist "frontend\node_modules\vite\bin\vite.js" (
  echo [1/2] 正在同步前端构建（约 10 秒）...
  pushd frontend
  "%NODE%" node_modules\vite\bin\vite.js build
  if errorlevel 1 (
    echo 前端构建失败，请检查 frontend 目录
    popd
    pause
    exit /b 1
  )
  popd
  echo 前端已更新到 frontend\dist
  echo.
) else (
  echo [跳过] 未找到 frontend\node_modules，请先在 frontend 执行 npm install
  echo.
)

echo [2/2] 启动后端 http://127.0.0.1:5001
echo 浏览器打开: http://127.0.0.1:5001/math
echo 批改出结果后按 Ctrl+F5 强制刷新
echo.

set PORT=5001
python app.py
pause
