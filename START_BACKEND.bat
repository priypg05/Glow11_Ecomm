@echo off
echo ============================================
echo   GlowIQ Backend Startup
echo ============================================
echo.

cd /d "%~dp0backend"

set "PYTHON_EXE="
set "PIP_EXE="

if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE="%~dp0.venv\Scripts\python.exe""
    set "PIP_EXE="%~dp0.venv\Scripts\pip.exe""
) else (
    py -3 --version >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=py -3"
        set "PIP_EXE=py -3 -m pip"
    ) else (
        python --version >nul 2>&1
        if not errorlevel 1 (
            set "PYTHON_EXE=python"
            set "PIP_EXE=pip"
        )
    )
)

if "%PYTHON_EXE%"=="" (
    echo ERROR: Python not found. Install Python 3.8+ from python.org
    pause
    exit /b 1
)

:: Install dependencies
echo Installing / checking Python dependencies...
%PIP_EXE% install -r requirements.txt --quiet

echo.
echo Starting GlowIQ API on http://localhost:8000
echo Keep this window open while using the app.
echo Press Ctrl+C to stop.
echo.

%PYTHON_EXE% server.py
pause
