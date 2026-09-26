import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll } from "vitest";

// Each test file gets an in-memory database and a throwaway upload folder.
process.env.PGLITE_DIR = "memory://";
process.env.UPLOADS_DIR = mkdtempSync(path.join(tmpdir(), "sawwiq-uploads-"));
delete process.env.DATABASE_URL;

// Opening the database runs every migration (a few seconds on a busy CI
// runner). Do it before the file's tests, with room, so a test's own time
// limit only covers what it tests.
beforeAll(async () => {
  const { getDb } = await import("@/lib/db");
  await getDb();
}, 60_000);
