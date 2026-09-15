import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "pnpm --filter @c3/api start",
      url: "http://127.0.0.1:3001/board",
      timeout: 30000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: "pnpm --filter @c3/web start",
      url: "http://127.0.0.1:3000",
      timeout: 30000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
