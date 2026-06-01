@echo off
title SleepAI Server - Shutdown
chcp 65001 >nul
cls

echo ============================================================
echo   SleepAI Server Shutdown
echo ============================================================
echo.

echo [1/2] Stopping ngrok tunnel...
taskkill /F /IM ngrok.exe 2>nul
if errorlevel 1 (
    echo  No ngrok process was running.
) else (
    echo  ngrok stopped.
)

echo.
echo [2/2] Stopping Docker containers...
cd /d "C:\Users\77077\Desktop\SleepAI_System"
docker compose down
if errorlevel 1 (
    echo  Docker compose down failed.
) else (
    echo  Containers stopped.
)

echo.
echo ============================================================
echo   Cleanup complete.
echo ============================================================
echo.
pause
