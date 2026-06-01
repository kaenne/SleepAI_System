@echo off
title SleepAI Server - Startup
chcp 65001 >nul
cls

echo ============================================================
echo   SleepAI Server Startup
echo ============================================================
echo.

REM ------------------------------------------------------------
REM  Step 1: bring Docker stack up
REM ------------------------------------------------------------
echo [1/3] Starting Docker containers (postgres, backend, ai-service)...
cd /d "C:\Users\77077\Desktop\SleepAI_System"
docker compose up -d
if errorlevel 1 (
    echo.
    echo  Docker failed to start. Is Docker Desktop running?
    echo.
    pause
    exit /b 1
)

REM ------------------------------------------------------------
REM  Step 2: wait until backend /health returns 200
REM ------------------------------------------------------------
echo.
echo [2/3] Waiting for backend to come online (max 60s)...
set /a "tries=0"
:wait_health
set /a "tries+=1"
curl -s -o nul -f http://localhost:8080/health
if not errorlevel 1 (
    echo  Backend is UP after %tries% checks.
    goto :start_ngrok
)
if %tries% GEQ 30 (
    echo.
    echo  Backend did not respond within 60s.
    echo  Check logs:  docker compose logs sleep-backend
    echo.
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
goto :wait_health

REM ------------------------------------------------------------
REM  Step 3: open ngrok tunnel in a separate window
REM ------------------------------------------------------------
:start_ngrok
echo.
echo [3/3] Opening ngrok tunnel in a NEW window...
start "ngrok-tunnel - DO NOT CLOSE" cmd /k "ngrok http 8080 --domain=hasty-footpad-afloat.ngrok-free.dev"

echo.
echo ============================================================
echo   READY FOR DEFENCE
echo ============================================================
echo.
echo   Public URL:  https://hasty-footpad-afloat.ngrok-free.dev
echo   Health:      https://hasty-footpad-afloat.ngrok-free.dev/health
echo.
echo   ngrok runs in the OTHER window - do NOT close it.
echo   When demo session is over, run STOP-SERVER.bat to clean up.
echo.
pause
