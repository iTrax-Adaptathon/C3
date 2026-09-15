#!/usr/bin/env node

/**
 * C3 Autonomous Airport Operations Platform — Local Developer Setup Script
 * Automates prerequisites verification, dependency installation, package builds,
 * Playwright browser provisioning, and initial test execution.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m"
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function header(title) {
  console.log("\n" + "=".repeat(60));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log("=".repeat(60));
}

function run(cmd, desc) {
  log(`\n⏳ ${desc}...`, colors.yellow);
  log(`   $ ${cmd}`, colors.gray);
  try {
    execSync(cmd, { stdio: "inherit", shell: true });
    log(`✓ ${desc} completed successfully.`, colors.green);
  } catch (err) {
    log(`✗ Error during: ${desc}`, colors.red);
    throw err;
  }
}

async function main() {
  header("🛫 C3 Airport Operations — Developer Environment Setup");

  // 1. Verify Node.js
  const nodeVersion = process.version;
  const majorNode = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
  log(`• Node.js Version: ${nodeVersion}`, colors.cyan);
  if (majorNode < 20) {
    log(`⚠️ Warning: Node.js 20+ is recommended (current: ${nodeVersion}). Please consider upgrading.`, colors.yellow);
  } else {
    log(`✓ Node.js version compatible.`, colors.green);
  }

  // 2. Verify or Install pnpm
  log(`\n• Checking package manager (pnpm)...`, colors.cyan);
  let hasPnpm = false;
  try {
    const pnpmVer = execSync("pnpm --version", { encoding: "utf8" }).trim();
    log(`✓ Found pnpm v${pnpmVer}`, colors.green);
    hasPnpm = true;
  } catch {
    log(`⚠️ pnpm not found on PATH. Attempting automated installation via Corepack...`, colors.yellow);
    try {
      execSync("corepack enable && corepack prepare pnpm@latest --activate", { stdio: "inherit", shell: true });
      hasPnpm = true;
      log(`✓ Enabled pnpm via Corepack.`, colors.green);
    } catch {
      log(`⚠️ Corepack unavailable. Installing pnpm globally via npm...`, colors.yellow);
      execSync("npm install -g pnpm", { stdio: "inherit", shell: true });
      hasPnpm = true;
      log(`✓ Installed pnpm globally via npm.`, colors.green);
    }
  }

  // 3. Install Monorepo Dependencies
  header("📦 Step 1: Installing Workspace Dependencies");
  run("pnpm install", "Installing pnpm dependencies across monorepo");

  // 4. Approve pnpm builds if needed
  try {
    run("pnpm approve-builds --all", "Approving built dependencies");
  } catch {
    // Non-fatal on some pnpm configurations
  }

  // 5. Build all packages and applications
  header("🔨 Step 2: Compiling Packages and Applications");
  run("pnpm turbo build", "Building packages (@c3/shared, @c3/core, @c3/db, @c3/api, @c3/web)");

  // 6. Provision Playwright Chromium for E2E testing
  header("🌐 Step 3: Provisioning Headless Chromium Browser");
  try {
    run("pnpm --filter @c3/web exec playwright install chromium", "Installing Playwright Chromium browser");
  } catch (err) {
    log(`⚠️ Playwright browser installation encountered a warning. You can retry later with 'pnpm --filter @c3/web exec playwright install chromium'.`, colors.yellow);
  }

  // 7. Execute Automated Health Checks
  header("🧪 Step 4: Running Automated Health & Invariant Tests");
  run("pnpm turbo test", "Executing Vitest suites across monorepo");

  // 8. Completed & Run Instructions
  header("🎉 Setup Complete & Ready for Local Testing!");
  log("\nYou can start the full interactive platform using:", colors.bright + colors.green);
  log("\n  Option A — Start both services together:", colors.bright + colors.cyan);
  log("    $ pnpm dev", colors.yellow);

  log("\n  Option B — Start services individually:", colors.bright + colors.cyan);
  log("    Terminal 1 (Backend API):", colors.gray);
  log("      $ pnpm --filter @c3/api start", colors.yellow);
  log("    Terminal 2 (Web Console UI):", colors.gray);
  log("      $ pnpm --filter @c3/web start", colors.yellow);

  log("\n  Option C — Run Browser End-to-End Tests:", colors.bright + colors.cyan);
  log("    $ pnpm --filter @c3/web test:e2e", colors.yellow);

  log("\n📌 Local Endpoints:", colors.bright + colors.cyan);
  log("  • Web Console:      http://localhost:3000", colors.green);
  log("  • Operations API:   http://localhost:3001", colors.green);
  log("  • WebSocket Stream: ws://localhost:3001/live\n", colors.green);

  log("🎉 Setup completed successfully! All packages built and tests verified.\n", colors.bright + colors.green);
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err.message || err);
  process.exit(1);
});

