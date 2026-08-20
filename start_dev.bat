@echo off
set PATH=%~dp0node\node-v22.14.0-win-x64;%PATH%

where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo ======================================================================
  echo [ERROR] Node.js/npm was not found on this computer!
  echo ======================================================================
  echo.
  echo To run this application, please choose one of the following:
  echo.
  echo Option 1 (Recommended): Download and install Node.js globally
  echo   from: https://nodejs.org/ (LTS version)
  echo.
  echo Option 2 (Portable): Place a portable Node.js directory at:
  echo   %~dp0node\node-v22.14.0-win-x64\
  echo.
  echo After installing or setting up Node.js, run this batch file again.
  echo ======================================================================
  echo.
  pause
  exit /b
)

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
