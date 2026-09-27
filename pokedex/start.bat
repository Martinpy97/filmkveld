@echo off
cd /d "%~dp0"
docker info >nul 2>&1
if errorlevel 1 (
  echo Start Docker Desktop og prov igjen.
  pause
  exit /b 1
)
docker compose up -d --build --wait --wait-timeout 120
if errorlevel 1 (
  echo Oppstart feilet. Les meldingen ovenfor.
  pause
  exit /b 1
)
start "" "http://localhost:8784"
