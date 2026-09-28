import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
// Runs against DATABASE_URL (a disposable Postgres), unlike tests/unit which force PGlite.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../../", import.meta.url)), "server-only": fileURLToPath(new URL("../unit/server-only-stub.ts", import.meta.url)) } },
  test: { include: ["tests/postgres/**/*.pgtest.ts"], environment: "node", testTimeout: 120_000, hookTimeout: 120_000 },
});
