@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"

echo 正在重新构建前端到 frontend\dist ...
echo.

set "NODE=e:\cursor\resources\app\resources\helpers\node.exe"
if not exist "%NODE%" set "NODE=node"

if not exist "node_modules\vite\bin\vite.js" (
  echo 缺少依赖，请先执行: npm install
  pause
  exit /b 1
)

"%NODE%" node_modules\vite\bin\vite.js build
if errorlevel 1 (
  echo 构建失败
  pause
  exit /b 1
)

echo.
echo 构建完成。请重新运行 start.bat，浏览器访问 http://127.0.0.1:5001/math
echo 并按 Ctrl+F5 强制刷新。
pause
