# C3 Airport Operations Platform — Launch Services & Open Browser
# Usage: .\start.ps1 (or powershell -ExecutionPolicy Bypass -File .\start.ps1)

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not detected on PATH. Running setup.ps1..." -ForegroundColor Yellow
    & .\setup.ps1
    exit $LASTEXITCODE
}

node scripts/start.mjs
