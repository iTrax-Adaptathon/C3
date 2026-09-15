# C3 Airport Operations Platform — Windows Full-Auto Setup Script
# Usage: .\setup.ps1 (or powershell -ExecutionPolicy Bypass -File .\setup.ps1)

$ErrorActionPreference = "Stop"
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  🛫 C3 Airport Operations — Developer Full-Auto Setup" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

function Update-SessionPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$userPath;$machinePath;$env:Path"
    if (Test-Path "C:\Program Files\nodejs") {
        $env:Path = "C:\Program Files\nodejs;$env:Path"
    }
    if (Test-Path "$env:LOCALAPPDATA\pnpm") {
        $env:Path = "$env:LOCALAPPDATA\pnpm;$env:Path"
    }
    if (Test-Path "$env:APPDATA\npm") {
        $env:Path = "$env:APPDATA\npm;$env:Path"
    }
}

Update-SessionPath

# 1. Check and Auto-Install Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "⏳ Git not found on PATH. Attempting automatic installation via winget..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        try {
            winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
            Update-SessionPath
            Write-Host "✓ Git installed successfully." -ForegroundColor Green
        } catch {
            Write-Warning "Could not auto-install Git via winget."
        }
    } else {
        Write-Warning "winget unavailable. Please install Git manually from https://git-scm.com/"
    }
} else {
    $gitVer = git --version
    Write-Host "✓ Git is present ($gitVer)" -ForegroundColor Green
}

# 2. Check and Auto-Install Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "⏳ Node.js not found on PATH. Installing Node.js LTS automatically..." -ForegroundColor Yellow
    $installed = $false

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        try {
            Write-Host "⏳ Installing Node.js LTS via winget..." -ForegroundColor Yellow
            winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
            Update-SessionPath
            if (Get-Command node -ErrorAction SilentlyContinue) {
                $installed = $true
            }
        } catch {
            Write-Warning "winget installation encountered an issue, trying direct MSI download..."
        }
    }

    if (-not $installed -and -not (Get-Command node -ErrorAction SilentlyContinue)) {
        try {
            $msiUrl = "https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi"
            $tempMsi = "$env:TEMP\nodejs-setup.msi"
            Write-Host "⏳ Downloading Node.js LTS installer ($msiUrl)..." -ForegroundColor Yellow
            Invoke-WebRequest -Uri $msiUrl -OutFile $tempMsi -UseBasicParsing
            Write-Host "⏳ Running silent Node.js installation..." -ForegroundColor Yellow
            Start-Process msiexec.exe -ArgumentList "/i `"$tempMsi`" /qn /norestart" -Wait
            Remove-Item $tempMsi -Force -ErrorAction SilentlyContinue
            Update-SessionPath
        } catch {
            Write-Error "Failed to install Node.js automatically: $_"
            exit 1
        }
    }

    Update-SessionPath
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        if (Test-Path "C:\Program Files\nodejs\node.exe") {
            $env:Path = "C:\Program Files\nodejs;$env:Path"
        } else {
            Write-Error "Node.js was installed but not found in current session. Please restart your PowerShell window and run .\setup.ps1 again."
            exit 1
        }
    }
}

$nodeVer = node -v
Write-Host "✓ Node.js is ready ($nodeVer)" -ForegroundColor Green

# 3. Check and Auto-Install pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "⏳ pnpm not found. Installing pnpm automatically..." -ForegroundColor Yellow
    try {
        corepack enable
        corepack prepare pnpm@latest --activate
        Update-SessionPath
    } catch {
        try {
            npm install -g pnpm
            Update-SessionPath
        } catch {
            try {
                Write-Host "⏳ Installing pnpm via standalone installer script..." -ForegroundColor Yellow
                Invoke-RestMethod https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
                Update-SessionPath
            } catch {
                Write-Warning "Automatic pnpm installation encountered a warning. Continuing with npx/npm fallback."
            }
        }
    }
}

Update-SessionPath
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $pnpmVer = pnpm -v
    Write-Host "✓ pnpm is ready (v$pnpmVer)" -ForegroundColor Green
}

# 4. Run the cross-platform setup runner
Write-Host "`n>>> Launching automated monorepo compiler and testing suite...`n" -ForegroundColor Cyan
node scripts/setup.mjs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Setup failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  ✓ Setup complete! Launching C3 Server Control Panel..." -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Green
cmd.exe /c "server.bat"
