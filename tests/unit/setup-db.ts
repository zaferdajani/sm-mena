import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Each test file gets an in-memory database and a throwaway upload folder.
process.env.PGLITE_DIR = "memory://";
process.env.UPLOADS_DIR = mkdtempSync(path.join(tmpdir(), "sawwiq-uploads-"));
delete process.env.DATABASE_URL;
