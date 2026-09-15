@echo off
setlocal enabledelayedexpansion
title C3 Airport Operations - Server Control Panel

:: Refresh PATH from standard locations
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

:MENU
cls
echo ============================================================
echo   C3 Airport Operations - Server Control Panel
echo ===============================s=============================
echo.
call node scripts\start.mjs status
echo.
echo  [1] Start Server and Open Browser
echo  [2] Stop Server (Kill ports 3000 and 3001)
echo  [3] Restart Server
echo  [4] Check Server Status
echo  [5] Open Web Console in Default Browser
echo  [6] Exit Control Panel
echo.
set /p choice="Select an option [1-6]: "

if "%choice%"=="1" goto START_SERVER
if "%choice%"=="2" goto STOP_SERVER
if "%choice%"=="3" goto RESTART_SERVER
if "%choice%"=="4" goto STATUS_SERVER
if "%choice%"=="5" goto OPEN_BROWSER
if "%choice%"=="6" goto EXIT_PANEL

echo.
echo Invalid selection. Please enter a number between 1 and 6.
timeout /t 2 >nul
goto MENU

:START_SERVER
echo.
echo Launching C3 Operations Server...
node scripts\start.mjs start
pause
goto MENU

:STOP_SERVER
echo.
node scripts\start.mjs stop
echo.
pause
goto MENU

:RESTART_SERVER
echo.
echo Restarting C3 Operations Server...
node scripts\start.mjs restart
pause
goto MENU

:STATUS_SERVER
echo.
node scripts\start.mjs status
echo.
pause
goto MENU

:OPEN_BROWSER
echo.
node scripts\start.mjs open
echo.
pause
goto MENU

:EXIT_PANEL
echo.
echo Exiting C3 Control Panel. Goodbye!
echo.
endlocal
exit /b 0
