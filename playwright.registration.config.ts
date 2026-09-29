import { defineConfig, devices } from "@playwright/test";

const port = 3101;
const baseURL = `http://localhost:${port}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
export default defineConfig({
  testDir: "./tests/registration",
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "registration-report", open: "never" }]],
  outputDir: "registration-results",
  use: { baseURL, trace: "on-first-retry", launchOptions: { executablePath } },
  projects: [
    { name: "registration-mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "registration-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: `npm run db:reset && npm run start -- --port ${port}`,
    url: `${baseURL}/ar`,
    env: {
      LAUNCH_PHASE: "registration", LAUNCH_PILOT_HANDLES: "", PGLITE_DIR: ".data/registration/pglite", UPLOADS_DIR: ".data/registration/uploads",
      NEXT_PUBLIC_SITE_URL: baseURL, ADMIN_REQUIRE_2FA: "false", RATE_LIMIT_MULTIPLIER: "50", MFA_ENCRYPTION_KEY: "registration-test-only-not-a-secret",
      FEATURE_DEFAULTS: "protected_payments=on,paid_plans=on,contracts=on,ndas=on,ai_matchmaker=on,prelaunch_home=off", AUTH_SHOW_CODES: "true", BEHANCE_FIXTURES: "tests/fixtures/behance",
    },
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
