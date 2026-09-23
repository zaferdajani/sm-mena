import { defineConfig } from "drizzle-kit";

// `npm run db:generate` only reads the schema; no database connection needed.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  strict: true,
});
