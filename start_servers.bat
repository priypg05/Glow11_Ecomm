@echo off
REM Start both backend and frontend servers

echo.
echo ════════════════════════════════════════════════════════
echo  Starting GlowIQ Application
echo ════════════════════════════════════════════════════════
echo.

set "PYTHON_CMD="
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_CMD="%~dp0.venv\Scripts\python.exe""
) else (
    py -3 --version >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_CMD=py -3"
    ) else (
        python --version >nul 2>&1
        if not errorlevel 1 (
            set "PYTHON_CMD=python"
        )
    )
)

if "%PYTHON_CMD%"=="" (
    echo ❌ Python not found. Please install Python first.
    pause
    exit /b 1
)
echo ✅ Python is installed

REM Check Node/npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ npm is installed

echo.
echo Starting backend server on port 8000...
start "GlowIQ Backend" cmd /k "cd /d "%~dp0backend" && %PYTHON_CMD% server.py"

echo Starting frontend...
timeout /t 3 /nobreak
start "GlowIQ Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ════════════════════════════════════════════════════════
echo  Servers are starting!
echo ════════════════════════════════════════════════════════
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
pause
