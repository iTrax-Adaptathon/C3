# C3 Airport Operations Platform — Windows Quick Setup Script
# Usage: .\setup.ps1

Write-Host "`n>>> Running C3 Platform Developer Setup (PowerShell)...`n" -ForegroundColor Cyan

# Ensure Node.js exists
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not found on PATH. Please install Node.js v24+ from https://nodejs.org/"
    exit 1
}

# Run the cross-platform setup runner
node scripts/setup.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Setup failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}
