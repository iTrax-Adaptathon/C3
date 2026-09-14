#!/usr/bin/env bash
set -e

# C3 Airport Operations Platform — Linux / macOS Quick Setup Script
# Usage: ./setup.sh

echo -e "\n\033[1;36m>>> Running C3 Platform Developer Setup (Bash)...\033[0m\n"

# Ensure Node.js exists
if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[1;31mNode.js is not found on PATH. Please install Node.js v24+ from https://nodejs.org/\033[0m" >&2
    exit 1
fi

# Run the cross-platform setup runner
node scripts/setup.mjs
