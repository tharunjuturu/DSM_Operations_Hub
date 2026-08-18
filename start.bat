@echo off
echo Automatically using portable Node.js...
set PATH=%~dp0node\node-v22.14.0-win-x64;%PATH%

if not exist node_modules (
  echo node_modules not found. Installing production dependencies...
  call npm install --omit=dev
)

echo Starting DSM Operations Hub Server...
start "" "http://localhost:3001"
node server.js
pause