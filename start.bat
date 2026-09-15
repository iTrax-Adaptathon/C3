@echo off
echo.
echo ============================================================
echo   🛫 Launching C3 Airport Operations Console...
echo ============================================================
echo.

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\node.exe" set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
if exist "%LOCALAPPDATA%\pnpm" set "PATH=%LOCALAPPDATA%\pnpm;%PATH%"
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not detected on PATH.
    echo Please run setup.bat first to install prerequisites, or restart your terminal.
    pause
    exit /b 1
)

node scripts\start.mjs
