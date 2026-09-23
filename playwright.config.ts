import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

// Use a preinstalled Chromium when the bundled one is not available
// (for example in Claude Code cloud sessions).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

// The e2e server gets its own seeded database and upload folder.
const e2eEnv = {
  PGLITE_DIR: ".data/e2e/pglite",
  UPLOADS_DIR: ".data/e2e/uploads",
  NEXT_PUBLIC_SITE_URL: baseURL,
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  // PGlite is a single embedded process; parallel runs make it slower than Postgres.
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: `npm run db:reset && npm run start -- --port ${port}`,
    url: `${baseURL}/ar`,
    env: e2eEnv,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
