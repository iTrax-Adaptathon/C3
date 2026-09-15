#!/usr/bin/env node

/**
 * C3 Autonomous Airport Operations Platform — Local System Runner
 * Spawns both backend API and frontend console, waits for http://localhost:3000,
 * and automatically opens the user's default browser.
 */

import { spawn, execSync } from "node:child_process";
import process from "node:process";

export function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      execSync(`start "" "${url}"`, { shell: true });
    } else if (platform === "darwin") {
      execSync(`open "${url}"`, { shell: true });
    } else {
      execSync(`xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" || x-www-browser "${url}"`, { shell: true });
    }
  } catch (err) {
    console.log(`Could not automatically open browser: ${err.message}`);
  }
}

const PORT_WEB = 3000;
const PORT_API = 3001;

export async function isPortActive(port) {
  try {
    const res = await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(1500) });
    return res.status > 0;
  } catch {
    return false;
  }
}

export function killProcessesOnPorts(ports = [PORT_WEB, PORT_API]) {
  let killedAny = false;
  for (const port of ports) {
    try {
      if (process.platform === "win32") {
        const output = execSync(`netstat -ano -p tcp | findstr :${port} | findstr LISTENING`, {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"]
        });
        const lines = output.trim().split(/\r?\n/);
        const pids = new Set();
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== "0" && pid !== String(process.pid)) {
            pids.add(pid);
          }
        }
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid} /T`, { stdio: "ignore" });
            console.log(`✓ Stopped process ${pid} on port ${port}`);
            killedAny = true;
          } catch {}
        }
      } else {
        execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
        killedAny = true;
      }
    } catch {}
  }
  return killedAny;
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 302) {
        return true;
      }
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function main() {
  const action = process.argv[2] || "start";

  if (action === "stop") {
    console.log("\n🛑 Stopping C3 Airport Operations Services...");
    const killed = killProcessesOnPorts([PORT_WEB, PORT_API]);
    if (killed) {
      console.log("✅ All C3 services on ports 3000 & 3001 have been stopped.\n");
    } else {
      console.log("ℹ️ No active services found on ports 3000 or 3001.\n");
    }
    return;
  }

  if (action === "status") {
    const isWebUp = await isPortActive(PORT_WEB);
    const isApiUp = await isPortActive(PORT_API);
    console.log("\n📊 C3 Local Platform Status:");
    console.log(`  • Web Console (port 3000):   ${isWebUp ? "ONLINE 🟢 (http://localhost:3000)" : "OFFLINE ⚪"}`);
    console.log(`  • Operations API (port 3001): ${isApiUp ? "ONLINE 🟢 (http://localhost:3001)" : "OFFLINE ⚪"}\n`);
    return;
  }

  if (action === "restart") {
    console.log("\n🔄 Restarting C3 Airport Operations Services...");
    killProcessesOnPorts([PORT_WEB, PORT_API]);
    await new Promise((r) => setTimeout(r, 1200));
  }

  if (action === "open") {
    console.log("🌐 Opening default browser to http://localhost:3000...");
    openBrowser("http://localhost:3000");
    return;
  }

  console.log("\n============================================================");
  console.log("  🛫 C3 Airport Operations — Launching Local Services");
  console.log("============================================================\n");

  // Check if console is already running
  try {
    const checkRes = await fetch("http://localhost:3000");
    if (checkRes.ok || checkRes.status === 200) {
      console.log("✓ Web Console is already running on http://localhost:3000");
      console.log("🌐 Opening default browser...");
      openBrowser("http://localhost:3000");
      return;
    }
  } catch {
    // Not running yet, proceed with startup
  }

  console.log("Starting Operations API (port 3001) & Web Console (port 3000)...");

  const apiProc = spawn("node", ["apps/api/dist/main.js"], {
    stdio: "inherit",
    shell: true
  });

  const webProc = spawn("pnpm", ["--filter", "@c3/web", "start"], {
    stdio: "inherit",
    shell: true
  });

  const shutdown = () => {
    console.log("\nShutting down operations services...");
    try { apiProc.kill(); } catch {}
    try { webProc.kill(); } catch {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("Waiting for http://localhost:3000 to be ready...");
  const ready = await waitForServer("http://localhost:3000");

  if (ready) {
    console.log("\n============================================================");
    console.log("  🌐 Opening default browser to: http://localhost:3000");
    console.log("============================================================\n");
    openBrowser("http://localhost:3000");
  } else {
    console.log("\n⚠️ Services started. Please open http://localhost:3000 in your browser.");
  }

  console.log("  ✅ C3 Operations Console is active!");
  console.log("  Press Ctrl+C to terminate services.\n");

  // Keep alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("Error starting services:", err);
  process.exit(1);
});
