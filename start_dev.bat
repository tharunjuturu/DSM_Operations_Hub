@echo off
echo Automatically using portable Node.js...
set PATH=%~dp0node\node-v22.14.0-win-x64;%PATH%

if not exist node_modules (
  echo node_modules not found. Installing all dependencies...
  call npm install
)

echo.
echo ======================================================
echo   Launching DSM Operations Hub in DEVELOPMENT MODE
echo ======================================================
echo.

echo 1. Starting Backend Server...
start "DSM Ops Hub Backend" node server.js

echo 2. Waiting for backend to initialize...
timeout /t 2 /nobreak >nul

echo 3. Starting Frontend Dev Server (Vite)...
start "" "http://localhost:5173"
call npm run dev

pause
