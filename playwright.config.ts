import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: ".env.test", quiet: true });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run start",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
