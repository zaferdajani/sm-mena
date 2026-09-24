import "server-only";
import { createHash } from "node:crypto";
import { and, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { errorEvents, supportRequests } from "@/lib/db/schema";

// Automatic error journal (browser and server errors) and user-submitted
// problem reports, triaged in Admin → Bugs. Modelled on OneClickConvert's bug
// board: one row per distinct error, counted and re-opened if it comes back.

export type ErrorInput = { source: "client" | "server"; kind: string; message: string; stack?: string | null; path?: string | null; userAgent?: string | null };
export const ERROR_STATUSES = ["open", "investigating", "fixed", "wont_fix", "cannot_reproduce"] as const;
export type ErrorStatus = (typeof ERROR_STATUSES)[number];
export const SUPPORT_STATUSES = ["new", "planned", "done", "declined"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

const clip = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);
/** Paths without query strings, ids or handles collapsed so similar pages group together. */
export const normalizePath = (path: string | null | undefined) =>
  path ? path.split(/[?#]/)[0].replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id").replace(/\/(a|p|r|review)\/[^/]+/g, "/$1/:x").slice(0, 200) : null;

export function errorFingerprint(e: Pick<ErrorInput, "source" | "kind" | "message" | "path">) {
  const message = e.message.replace(/\d+/g, "N").slice(0, 300);
  return createHash("md5").update(`${e.source}|${e.kind}|${normalizePath(e.path) ?? ""}|${message}`).digest("hex");
}

export async function recordError(e: ErrorInput) {
  const db = await getDb();
  const path = normalizePath(e.path);
  await db
    .insert(errorEvents)
    .values({
      fingerprint: errorFingerprint(e),
      source: e.source,
      kind: clip(e.kind, 40)!,
      message: clip(e.message, 1000) || "(no message)",
      stack: clip(e.stack, 4000),
      path,
      userAgent: clip(e.userAgent, 300),
    })
    .onConflictDoUpdate({
      target: errorEvents.fingerprint,
      set: {
        occurrences: sql`${errorEvents.occurrences} + 1`,
        lastSeenAt: sql`now()`,
        stack: sql`coalesce(excluded.stack, ${errorEvents.stack})`,
        userAgent: sql`excluded.user_agent`,
        // A "fixed" error that happens again is not fixed.
        status: sql`case when ${errorEvents.status} in ('fixed', 'cannot_reproduce') then 'open'::error_status else ${errorEvents.status} end`,
      },
    });
}

export async function listErrors(filter: "unresolved" | "resolved" | "all" = "unresolved") {
  const db = await getDb();
  const where =
    filter === "unresolved" ? inArray(errorEvents.status, ["open", "investigating"]) : filter === "resolved" ? inArray(errorEvents.status, ["fixed", "wont_fix", "cannot_reproduce"]) : undefined;
  return db.select().from(errorEvents).where(where).orderBy(desc(errorEvents.lastSeenAt)).limit(300);
}

export async function bugCounts() {
  const db = await getDb();
  const rows = await db.select({ status: errorEvents.status, n: count(), occurrences: sum(errorEvents.occurrences) }).from(errorEvents).groupBy(errorEvents.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<ErrorStatus, number>>;
  const [{ reports }] = await db.select({ reports: count() }).from(supportRequests).where(eq(supportRequests.status, "new"));
  return {
    open: by.open ?? 0,
    investigating: by.investigating ?? 0,
    fixed: by.fixed ?? 0,
    occurrences: rows.reduce((s, r) => s + Number(r.occurrences ?? 0), 0),
    newReports: reports,
  };
}

/** Badge number in the admin navigation: errors needing attention plus new user reports. */
export async function bugBadge() {
  const c = await bugCounts();
  return c.open + c.investigating + c.newReports;
}

export async function setErrorStatus(id: number, adminId: string, patch: { status: ErrorStatus; notes?: string; commit?: string }) {
  const db = await getDb();
  const resolved = patch.status === "fixed" || patch.status === "wont_fix" || patch.status === "cannot_reproduce";
  await db
    .update(errorEvents)
    .set({
      status: patch.status,
      resolutionNotes: clip(patch.notes, 2000),
      resolutionCommit: clip(patch.commit, 80),
      resolvedAt: resolved ? new Date() : null,
      resolvedBy: resolved ? adminId : null,
    })
    .where(eq(errorEvents.id, id));
}

export type SupportInput = { kind: "bug" | "question" | "suggestion"; message: string; email?: string | null; path?: string | null; locale?: string | null; userAgent?: string | null; userId?: string | null; visitorId?: string | null };

export async function submitSupportRequest(input: SupportInput) {
  const db = await getDb();
  const [row] = await db
    .insert(supportRequests)
    .values({
      kind: input.kind,
      message: clip(input.message, 4000)!,
      email: clip(input.email, 200),
      path: clip(input.path?.split(/[?#]/)[0], 200),
      locale: clip(input.locale, 5),
      userAgent: clip(input.userAgent, 300),
      userId: input.userId ?? null,
      visitorId: input.visitorId ?? null,
    })
    .returning({ id: supportRequests.id });
  return row.id;
}

export async function listSupportRequests(status: SupportStatus | "all" = "new") {
  const db = await getDb();
  return db
    .select()
    .from(supportRequests)
    .where(status === "all" ? undefined : eq(supportRequests.status, status))
    .orderBy(desc(supportRequests.createdAt))
    .limit(300);
}

export async function setSupportStatus(id: string, adminId: string, status: SupportStatus, note?: string) {
  const db = await getDb();
  await db
    .update(supportRequests)
    .set({ status, adminNote: clip(note, 2000), handledBy: adminId, handledAt: new Date() })
    .where(and(eq(supportRequests.id, id)));
}
