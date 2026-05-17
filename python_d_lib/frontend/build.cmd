@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo [错误] 请先在本目录执行: npm install
  exit /b 1
)
node "node_modules\vite\bin\vite.js" build
if errorlevel 1 exit /b 1
echo.
echo [完成] 已输出到 dist\ ，请重启 Flask 后访问 http://127.0.0.1:5007 并 Ctrl+F5 强刷
