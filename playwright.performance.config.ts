import { defineConfig, devices } from "@playwright/test";

// A production build must exist first. Isolate all data from real services.
export default defineConfig({
  testDir: "./tests/performance",
  workers: 1,
  timeout: 120_000,
  use: {
    ...devices["Pixel 7"],
    baseURL: "http://localhost:3115",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: {
    command: "npm run start -- --port 3115",
    url: "http://localhost:3115/en/login",
    timeout: 120_000,
    env: {
      DATABASE_URL: "",
      PGLITE_DIR: "memory://",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3115",
      LAUNCH_PHASE: "registration",
    },
  },
});
