import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordError, resolveStaleErrors, staleErrorCount } from "@/lib/data/bugs";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { errorEvents } from "@/lib/db/schema";

// Admin → Bugs: close errors whose cause was fixed (not seen for a while);
// errors that still happen stay open, and a closed one reopens if it returns.

let adminId: string;
beforeAll(async () => {
  adminId = (await createUser("maint@t.jo", "password-1234", "admin")).id;
  await recordError({ source: "server", kind: "server_render", message: "Failed query: old stall", path: "/ar/explore" });
  await recordError({ source: "client", kind: "render_error", message: "Still happening", path: "/ar" });
  const db = await getDb();
  await db.update(errorEvents).set({ lastSeenAt: new Date(Date.now() - 48 * 3600 * 1000) }).where(eq(errorEvents.message, "Failed query: old stall"));
});
afterAll(() => closeDb());

describe("closing errors that no longer happen", () => {
  it("closes only errors not seen within the window, with the note", async () => {
    expect(await staleErrorCount(24)).toBe(1);
    expect(await resolveStaleErrors(adminId, { hours: 24, notes: "Fixed by the driver change.", commit: "c3e441e", status: "fixed" })).toBe(1);
    const db = await getDb();
    const rows = await db.select().from(errorEvents);
    const old = rows.find((r) => r.message === "Failed query: old stall")!;
    expect(old.status).toBe("fixed");
    expect(old.resolutionNotes).toBe("Fixed by the driver change.");
    expect(old.resolutionCommit).toBe("c3e441e");
    expect(old.resolvedBy).toBe(adminId);
    expect(rows.find((r) => r.message === "Still happening")!.status).toBe("open");
    expect(await staleErrorCount(24)).toBe(0);
  });

  it("reopens a closed error that happens again", async () => {
    await recordError({ source: "server", kind: "server_render", message: "Failed query: old stall", path: "/ar/explore" });
    const db = await getDb();
    const [row] = await db.select().from(errorEvents).where(eq(errorEvents.message, "Failed query: old stall"));
    expect(row.status).toBe("open");
  });
});
