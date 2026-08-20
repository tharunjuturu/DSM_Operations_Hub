@echo off
set "PATH=%~dp0node\node-v22.14.0-win-x64;%PATH%"

:: Check if the directory is write-accessible (detects if user ran directly from inside ZIP)
echo test > "%~dp0.write_test" 2>nul
if not exist "%~dp0.write_test" (
  echo.
  echo ======================================================================
  echo [ERROR] This directory is READ-ONLY or running directly inside a ZIP!
  echo ======================================================================
  echo.
  echo Please make sure you:
  echo   1. Close this window.
  echo   2. Right-click the ZIP folder.
  echo   3. Select "Extract All...".
  echo   4. Choose an extraction destination - like Desktop or Documents.
  echo   5. Open the extracted folder and run start.bat again.
  echo ======================================================================
  echo.
  pause
  exit /b
)
del "%~dp0.write_test" 2>nul

call npm -v >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo ======================================================================
  echo [ERROR] Node.js/npm was not found on this computer!
  echo ======================================================================
  echo.
  echo To run this application, please choose one of the following:
  echo.
  echo Option 1 - Recommended: Download and install Node.js globally
  echo   from: https://nodejs.org/
  echo.
  echo Option 2 - Portable: Place a portable Node.js directory at:
  echo   %~dp0node\node-v22.14.0-win-x64\
  echo.
  echo After installing or setting up Node.js, run this batch file again.
  echo ======================================================================
  echo.
  pause
  exit /b
)

if not exist node_modules (
  echo node_modules not found. Installing production dependencies...
  call npm install --omit=dev
)

echo Starting DSM Operations Hub Server...
start "" "http://localhost:3001"
node server.js
pause