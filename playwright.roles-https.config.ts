import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

const baseURL = "https://127.0.0.1:3443";
const original = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;
const phase = process.env.ROLE_TEST_PHASE === "registration" ? "registration" : "full";
if (process.env.DATABASE_URL || process.env.VERCEL) throw new Error("Role compatibility must use disposable local data only.");

export default defineConfig({
  ...base,
  testMatch: /role-picker\.spec\.ts/,
  retries: 0,
  workers: 1,
  reporter: [["github"], ["html", { open: "never" }]],
  use: {
    ...base.use,
    baseURL,
    ignoreHTTPSErrors: true,
    trace: "off",
    storageState: { cookies: [], origins: [{ origin: baseURL, localStorage: [{ name: "sw_role", value: "browse" }] }] },
  },
  projects: [
    { name: "webkit-phone", use: { ...devices["iPhone 13"] } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"] } },
    { name: "chromium-phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    ...original,
    command: "npm run db:reset && node scripts/test-role-https.mjs",
    url: `${baseURL}/en/join`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 240_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 3000 },
    env: { ...original?.env, LAUNCH_PHASE: phase, SW_ROLE_TEST_TLS: "1", NEXT_PUBLIC_SITE_URL: baseURL,
      PGLITE_DIR: ".data/e2e-role-tls/pglite", UPLOADS_DIR: ".data/e2e-role-tls/uploads" },
  },
});
