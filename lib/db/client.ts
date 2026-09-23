import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

let instance: ReturnType<typeof createDb> | undefined;

function createDb() {
  const client = postgres(requireEnv("DATABASE_URL"), { prepare: false });
  return drizzle(client, { schema });
}

// Lazily connect so pages that never touch the database build without it.
export function db() {
  instance ??= createDb();
  return instance;
}
