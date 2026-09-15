#!/usr/bin/env bash
set -e

echo -e "\n\033[1;36m============================================================\033[0m"
echo -e "\033[1;36m  🛫 C3 Airport Operations — Developer Full-Auto Setup (Unix)\033[0m"
echo -e "\033[1;36m============================================================\033[0m\n"

# 1. Check and Auto-Install Node.js if missing
if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[1;33m⏳ Node.js not found. Attempting automatic installation...\033[0m"
    if command -v brew >/dev/null 2>&1; then
        echo "Installing Node.js via Homebrew..."
        brew install node
    elif command -v apt-get >/dev/null 2>&1; then
        echo -e "\033[1;33mInstalling Node.js via NodeSource on Debian/Ubuntu...\033[0m"
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo -e "\033[1;33mInstalling Node.js via NVM...\033[0m"
        export NVM_DIR="$HOME/.nvm"
        if [ ! -d "$NVM_DIR" ]; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        fi
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install --lts
        nvm use --lts
    fi
fi

if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[1;31m[ERROR] Node.js could not be installed automatically. Please install from https://nodejs.org/\033[0m" >&2
    exit 1
fi

echo -e "\033[1;32m✓ Node.js is ready: $(node -v)\033[0m"

# 2. Check and Auto-Install pnpm if missing
if ! command -v pnpm >/dev/null 2>&1; then
    echo -e "\033[1;33m⏳ pnpm not found. Installing via Corepack / npm / script...\033[0m"
    corepack enable 2>/dev/null || npm install -g pnpm 2>/dev/null || curl -fsSL https://get.pnpm.io/install.sh | sh -
    export PATH="$HOME/.local/share/pnpm:$PATH"
fi

# 3. Run cross-platform Node setup runner
node scripts/setup.mjs
