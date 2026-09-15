@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   🛫 C3 Airport Operations — Developer Full-Auto Setup
echo ============================================================
echo.

:: 1. Check Node.js
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\node.exe" set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
if exist "%LOCALAPPDATA%\pnpm" set "PATH=%LOCALAPPDATA%\pnpm;%PATH%"
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Node.js not detected on PATH.
    echo [INFO] Attempting automatic silent installation of Node.js LTS via PowerShell...
    powershell -ExecutionPolicy Bypass -Command "& { if (Get-Command winget -ErrorAction SilentlyContinue) { Write-Host 'Installing Node.js LTS via winget...'; winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements } else { Write-Host 'Downloading Node.js installer...'; $msi = \"$env:TEMP\node.msi\"; Invoke-WebRequest 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi' -OutFile $msi -UseBasicParsing; Start-Process msiexec.exe -ArgumentList \"/i `\"$msi`\" /qn /norestart\" -Wait; Remove-Item $msi -Force } }"
    
    :: Refresh Path
    if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
    if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\node.exe" set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
    set "PATH=%APPDATA%\npm;%LOCALAPPDATA%\pnpm;%PATH%"
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\node.exe" (
        set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
    ) else (
        echo [ERROR] Node.js could not be detected. Please restart your CMD / PowerShell window.
        pause
        exit /b 1
    )
)

echo [OK] Node.js is ready.

:: 2. Check pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] pnpm not found. Enabling via Corepack or npm...
    call corepack enable 2>nul
    call corepack prepare pnpm@latest --activate 2>nul
    where pnpm >nul 2>nul
    if !errorlevel! neq 0 (
        call npm install -g pnpm 2>nul
    )
    set "PATH=%LOCALAPPDATA%\pnpm;%APPDATA%\npm;%PATH%"
)

:: 3. Run cross-platform runner
node scripts\setup.mjs
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Setup script exited with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   [OK] Setup complete! Opening C3 Server Control Panel...
echo ============================================================
echo.
endlocal
server.bat

