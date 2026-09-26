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
  // The seeded admin has no authenticator; 2FA itself is covered by its own tests.
  ADMIN_REQUIRE_2FA: "false",
  // The suite creates many accounts and sign-ins from one address.
  RATE_LIMIT_MULTIPLIER: "20",
  MFA_ENCRYPTION_KEY: "e2e-only-mfa-key-not-a-secret",
  // Protected payments are "coming soon" in production until the partner is live;
  // the contract suites exercise them in test mode (tests/e2e/features.spec.ts covers the switches).
  // The landing page is under test; the pre-launch home has its own test (tests/e2e/teaser.spec.ts).
  FEATURE_DEFAULTS: "protected_payments=on,prelaunch_home=off",
  // Client sign-in codes are shown on screen (never in real production; docs/41).
  AUTH_SHOW_CODES: "true",
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
    // The front page asks first-time visitors "who are you?"; tests start as returning visitors
    // (tests/e2e/welcome.spec.ts clears this to test the question itself).
    // The seeded agencies are demo ones, so tests browse in the labelled demo view
    // (tests/e2e/demo-isolation.spec.ts clears it to check what real visitors see).
    storageState: {
      cookies: [{ name: "sw_demo", value: "1", domain: "localhost", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" }],
      origins: [{ origin: baseURL, localStorage: [{ name: "sw_role", value: "browse" }] }],
    },
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
