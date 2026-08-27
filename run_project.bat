@echo off
title Smart Warehouse CRM and Prediction Platform Launcher
cls

echo ===================================================================
echo     Smart Warehouse CRM and Prediction Platform - Local Launcher
echo ===================================================================
echo.

echo Checking and freeing ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo Starting FastAPI Backend Server on port 8000...
start "Smart Warehouse Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite React Frontend Server on port 5173...
start "Smart Warehouse Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ===================================================================
echo   System launched successfully!
echo   -----------------------------------------------------------------
echo   Frontend URL : http://localhost:5173
echo   Backend URL  : http://127.0.0.1:8000
echo   API Docs     : http://127.0.0.1:8000/docs
echo.
echo   Demo Login Credentials:
echo   - HQ Admin       : admin@tnwarehouses.gov.in / admin123
echo   - Warehouse Head : head1@tnwarehouses.gov.in / head123
echo ===================================================================
echo.
pause
