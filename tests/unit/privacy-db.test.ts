import "./setup-db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createUser, CONSENT_VERSION } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { consentLog } from "@/lib/db/schema";

afterAll(() => closeDb());

describe("row level security", () => {
  it("is enabled on every table in the public schema (a new table needs its own ENABLE ROW LEVEL SECURITY)", async () => {
    const db = await getDb();
    const rows = await db.execute(sql`select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    const list = (Array.isArray(rows) ? rows : (rows as { rows: unknown[] }).rows) as { name: string }[];
    expect(list.map((r) => r.name)).toEqual([]);
  });
});

describe("consent log", () => {
  it("records the privacy and age consent at sign-up, and marketing only when ticked", async () => {
    const db = await getDb();
    const plain = await createUser("consent-plain@t.jo", "password-1234", "agency", { ageConfirmed: true });
    const kinds = (await db.select().from(consentLog).where(eq(consentLog.userId, plain.id))).map((r) => r.kind).sort();
    expect(kinds).toEqual(["age", "privacy"]);
    const opted = await createUser("consent-mkt@t.jo", "password-1234", "agency", { ageConfirmed: true, marketing: true });
    const rows = await db.select().from(consentLog).where(eq(consentLog.userId, opted.id));
    expect(rows.map((r) => r.kind).sort()).toEqual(["age", "marketing", "privacy"]);
    expect(rows.every((r) => r.policyVersion === CONSENT_VERSION && r.granted)).toBe(true);
  });
});

describe("data export", () => {
  it("includes the person's own data and never secrets", async () => {
    const { buildDataExport } = await import("@/lib/data/data-export");
    const u = await createUser("export-me@t.jo", "password-1234", "client", { ageConfirmed: true });
    const data = await buildDataExport(u.id);
    expect(data?.account.email).toBe("export-me@t.jo");
    expect(data?.consents.map((c) => c.kind).sort()).toEqual(["age", "privacy"]);
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/passwordHash|password_hash|totpSecret|backupCode/);
    expect(await buildDataExport("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});
