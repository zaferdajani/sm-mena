import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordError, resolveStaleErrors, setErrorStatus } from "@/lib/data/bugs";
import { AUTO_CLOSE_HOURS, closeRecoveredMonitorErrors, monitorMessage, recordMonitorFailure, recordSiteCheckRun } from "@/lib/data/site-check";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { auditLogs, errorEvents, siteChecks } from "@/lib/db/schema";

// The automatic site check (docs/52) may close only its own errors, only for a
// page that answered correctly in the same run, and only after the failure has
// been absent for the window. "Not seen" never becomes "fixed" for anything else.

const H = 3600 * 1000;
const T0 = new Date("2026-10-01T00:00:00Z");
const at = (hours: number) => new Date(T0.getTime() + hours * H);
const fail = (path: string, problem = "HTTP 502") => ({ path, status: 502, ms: 100, ok: false, problem });
const pass = (path: string) => ({ path, status: 200, ms: 100, ok: true, finalPath: path });
const row = async (message: string) => (await (await getDb()).select().from(errorEvents).where(eq(errorEvents.message, message)))[0];

let adminId: string;
beforeAll(async () => {
  adminId = (await createUser("monitor-admin@t.jo", "password-1234", "admin")).id;
}, 60_000);
afterAll(() => closeDb());

describe("what the site check closes", () => {
  it("records a failure, counts a repeat, and closes it only after the page passes and the window has elapsed", async () => {
    await recordMonitorFailure(fail("/ar/explore"), at(0));
    await recordMonitorFailure(fail("/ar/explore"), at(1));
    let e = await row(monitorMessage("/ar/explore", "HTTP 502"));
    expect(e.status).toBe("open");
    expect(e.occurrences).toBe(2);
    // Passing again right away: too soon, stays open.
    expect(await closeRecoveredMonitorErrors(["/ar/explore"], at(2))).toEqual([]);
    // The window has elapsed but the page was NOT in this run's passed list: stays open.
    expect(await closeRecoveredMonitorErrors(["/ar", "/en"], at(1 + AUTO_CLOSE_HOURS + 1))).toEqual([]);
    // The page failed again in this run: nothing closes for it.
    await recordMonitorFailure(fail("/ar/explore"), at(1 + AUTO_CLOSE_HOURS + 2));
    expect(await closeRecoveredMonitorErrors([], at(1 + AUTO_CLOSE_HOURS + 2))).toEqual([]);
    // Confirmed recovery: passed in this run and absent for the window.
    const ids = await closeRecoveredMonitorErrors(["/ar/explore"], at(1 + AUTO_CLOSE_HOURS + 2 + AUTO_CLOSE_HOURS + 1));
    expect(ids).toHaveLength(1);
    e = await row(monitorMessage("/ar/explore", "HTTP 502"));
    expect(e.status).toBe("fixed");
    expect(e.resolvedBy).toBeNull();
    expect(e.resolutionNotes).toContain("answered correctly");
    const db = await getDb();
    const audits = await db.select().from(auditLogs).where(eq(auditLogs.action, "bug.auto_resolve"));
    expect(audits).toHaveLength(1);
    expect((audits[0].meta as { ids: number[] }).ids).toEqual(ids);
  });

  it("never closes browser, server or user-reported errors, however old and whatever the run", async () => {
    await recordError({ source: "client", kind: "render_error", message: "Old browser crash", path: "/ar/explore" });
    await recordError({ source: "server", kind: "server_render", message: "Old server crash", path: "/ar" });
    const db = await getDb();
    await db.update(errorEvents).set({ lastSeenAt: new Date(Date.now() - 30 * 24 * H), status: "investigating" }).where(eq(errorEvents.message, "Old browser crash"));
    await db.update(errorEvents).set({ lastSeenAt: new Date(Date.now() - 30 * 24 * H) }).where(eq(errorEvents.message, "Old server crash"));
    expect(await closeRecoveredMonitorErrors(["/ar/explore", "/ar", "/en"], new Date())).toEqual([]);
    const run = await recordSiteCheckRun(["/api/health", "/ar", "/en", "/ar/explore"].map(pass), { revision: "r", commit: null, environment: "test" });
    expect(run).toEqual({ failed: 0, closed: [] });
    expect((await row("Old browser crash")).status).toBe("investigating");
    expect((await row("Old server crash")).status).toBe("open");
  });

  it("a stale monitor error on an unrelated page is left alone; only the recovered page closes", async () => {
    await recordMonitorFailure(fail("/sitemap.xml", "not JSON"), at(100));
    await recordMonitorFailure(fail("/ar/login", "landed on /ar"), at(100));
    const now = at(100 + AUTO_CLOSE_HOURS + 1);
    const ids = await closeRecoveredMonitorErrors(["/ar/login"], now);
    expect(ids).toHaveLength(1);
    expect((await row(monitorMessage("/ar/login", "landed on /ar"))).status).toBe("fixed");
    expect((await row(monitorMessage("/sitemap.xml", "not JSON"))).status).toBe("open");
  });

  it("a run with a failed or skipped check closes nothing for that page, and a whole run records its release", async () => {
    await recordMonitorFailure(fail("/ar/start"), at(200));
    const now = at(200 + AUTO_CLOSE_HOURS + 1);
    // Skipped: /ar/start not checked in this (partial) run.
    let run = await recordSiteCheckRun([pass("/ar")], { revision: "collaboration-v2-r3.2", commit: "abc", environment: "production" }, now);
    expect(run.closed).toEqual([]);
    // Failed in this run: reopened count goes up, nothing closes.
    run = await recordSiteCheckRun([pass("/ar"), fail("/ar/start")], null, at(200 + AUTO_CLOSE_HOURS + 2));
    expect(run).toMatchObject({ failed: 1, closed: [] });
    expect((await row(monitorMessage("/ar/start", "HTTP 502"))).occurrences).toBe(2);
    const db = await getDb();
    const runs = await db.select().from(siteChecks);
    expect(runs.some((r) => r.results[0]?.release?.revision === "collaboration-v2-r3.2")).toBe(true);
    expect(runs.some((r) => r.failures === 1 && r.ok === false)).toBe(true);
  });

  it("a closed error that returns reopens with its resolution cleared and the history kept", async () => {
    await recordMonitorFailure(fail("/en"), at(300));
    await closeRecoveredMonitorErrors(["/en"], at(300 + AUTO_CLOSE_HOURS + 1));
    expect((await row(monitorMessage("/en", "HTTP 502"))).status).toBe("fixed");
    await recordMonitorFailure(fail("/en"), at(300 + AUTO_CLOSE_HOURS + 5));
    const e = await row(monitorMessage("/en", "HTTP 502"));
    expect(e.status).toBe("open");
    expect(e.resolvedAt).toBeNull();
    expect(e.resolutionNotes).toContain("answered correctly"); // the old closure stays in the notes
    expect(e.resolutionNotes).toContain("Reopened");
    // The same for a browser error a person had closed with a commit.
    await recordError({ source: "client", kind: "render_error", message: "Comes back", path: "/ar" });
    const id = (await row("Comes back")).id;
    await setErrorStatus(id, adminId, { status: "fixed", notes: "Fixed it", commit: "deadbee" });
    await recordError({ source: "client", kind: "render_error", message: "Comes back", path: "/ar" });
    const back = await row("Comes back");
    expect(back.status).toBe("open");
    expect(back.resolvedAt).toBeNull();
    expect(back.resolvedBy).toBeNull();
    expect(back.resolutionCommit).toBeNull();
    expect(back.resolutionNotes).toContain("Fixed it");
    expect(back.resolutionNotes).toContain("Reopened");
  });

  it("the manual bulk action records what the person chose: not reproduced by default, fixed only when said so", async () => {
    await recordError({ source: "server", kind: "server_render", message: "Quiet one", path: "/en" });
    const db = await getDb();
    await db.update(errorEvents).set({ lastSeenAt: new Date(Date.now() - 5 * 24 * H) }).where(eq(errorEvents.message, "Quiet one"));
    expect(await resolveStaleErrors(adminId, { hours: 24 * 4, notes: "Not seen." })).toBeGreaterThanOrEqual(1);
    expect((await row("Quiet one")).status).toBe("cannot_reproduce");
  });
});
