@echo off
setlocal
cd /d "%~dp0"

echo Quantum Life University · Self Knowledge Reading
echo.

if not exist ".env" (
  if exist ".env.example" (
    echo Creating .env from .env.example ...
    copy /Y ".env.example" ".env" >nul
  ) else (
    echo Missing .env and .env.example. Add env values, then run again.
    pause
    exit /b 1
  )
)

if not exist "node_modules\" (
  echo Installing npm dependencies ...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting local Supabase (docker compose) ...
docker compose up -d
if errorlevel 1 (
  echo Docker Compose failed. Is Docker Desktop running?
  pause
  exit /b 1
)

echo Waiting for the API gateway (Kong on :54331) ...
powershell -NoProfile -Command ^
  "$deadline = (Get-Date).AddMinutes(2); do { try { $r = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:54331/auth/v1/health -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } } catch {} ; $st = docker inspect -f '{{.State.Status}}' qlu-kong 2>$null; if ($st -eq 'restarting') { docker compose up -d --force-recreate kong | Out-Null }; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo Kong did not become healthy. Pages will feel very slow until the API is up.
  echo Try: docker compose up -d --force-recreate kong
)

echo Starting the reader on http://localhost:3000 ...
start "Self Knowledge Reading" cmd /k "npm run dev -- --port 3000"

echo Waiting for the app...
powershell -NoProfile -Command ^
  "$deadline = (Get-Date).AddMinutes(2); do { try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:3000/ -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } } catch {} ; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo The app did not answer in time. The reader window may still be starting.
  start http://localhost:3000/
) else (
  echo Opening the library...
  start http://localhost:3000/
)

endlocal
