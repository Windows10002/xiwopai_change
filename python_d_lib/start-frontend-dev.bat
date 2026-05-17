@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"

echo ========================================
echo  前端开发模式（请先运行 start.bat）
echo ========================================
echo.
echo 浏览器打开: http://127.0.0.1:5173/math
echo API 代理到后端 http://127.0.0.1:5001
echo.

set "NODE=e:\cursor\resources\app\resources\helpers\node.exe"
if not exist "%NODE%" (
  where node >nul 2>&1
  if errorlevel 1 (
    echo 未找到 Node.js，请安装 https://nodejs.org/ 或将 node 加入 PATH
    pause
    exit /b 1
  )
  set "NODE=node"
)

if not exist "node_modules\vite\bin\vite.js" (
  echo 正在安装依赖...
  "%NODE%" -e "require('child_process').execSync('npm install',{stdio:'inherit',shell:true})"
)

"%NODE%" node_modules\vite\bin\vite.js
