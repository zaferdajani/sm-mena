import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLogs, errorEvents, siteChecks } from "@/lib/db/schema";
import { errorFingerprint } from "./error-fingerprint";

// The automatic site check's records (docs/52). No "server-only" import: the
// GitHub Actions script (lib/db/site-check.ts) runs this with tsx.
//
// Closing rule. "Not seen for a while" is not "fixed". The only errors this job
// may close by itself are its own: source "monitor", kind "site_check", whose
// path answered correctly in THIS run and which has not failed for AUTO_CLOSE_HOURS.
// A run that could not check a path (failed, timed out, or the path was not in
// the run) closes nothing for that path. Errors from browsers, servers, users,
// authenticated flows or anything else are never touched here; a person closes
// those in Admin → Bugs with a note.

export const AUTO_CLOSE_HOURS = 72;
export const KEEP_DAYS = 90;
export const MONITOR_SOURCE = "monitor";
export const MONITOR_KIND = "site_check";

export type CheckResult = { path: string; status: number; ms: number; ok: boolean; problem?: string; finalPath?: string };
export type ReleaseSeen = { revision: string; commit: string | null; environment: string } | null;

export const monitorMessage = (path: string, problem: string) => `Site check: ${path} — ${problem}`;

/** Records one failed check as an error (counting up a repeat), reopening a closed entry and clearing its old resolution. */
export async function recordMonitorFailure(f: CheckResult, now = new Date()) {
  const db = await getDb();
  const message = monitorMessage(f.path, f.problem ?? `HTTP ${f.status}`);
  const fingerprint = errorFingerprint({ source: MONITOR_SOURCE, kind: MONITOR_KIND, message, path: f.path });
  const reopenNote = `Reopened ${now.toISOString().slice(0, 16)}Z: the check failed again after being closed.`;
  await db
    .insert(errorEvents)
    .values({ fingerprint, source: MONITOR_SOURCE, kind: MONITOR_KIND, message, path: f.path, userAgent: "SawwiqSiteCheck/1.0", firstSeenAt: now, lastSeenAt: now })
    .onConflictDoUpdate({
      target: errorEvents.fingerprint,
      set: {
        occurrences: sql`${errorEvents.occurrences} + 1`,
        lastSeenAt: now,
        status: sql`case when ${errorEvents.status} in ('fixed', 'cannot_reproduce') then 'open'::error_status else ${errorEvents.status} end`,
        // A closed error that is back keeps its history in the notes but loses its "resolved" state.
        resolutionNotes: sql`case when ${errorEvents.status} in ('fixed', 'cannot_reproduce') then coalesce(${errorEvents.resolutionNotes} || E'\n', '') || ${reopenNote} else ${errorEvents.resolutionNotes} end`,
        resolvedAt: sql`case when ${errorEvents.status} in ('fixed', 'cannot_reproduce') then null else ${errorEvents.resolvedAt} end`,
        resolvedBy: sql`case when ${errorEvents.status} in ('fixed', 'cannot_reproduce') then null else ${errorEvents.resolvedBy} end`,
        resolutionCommit: sql`case when ${errorEvents.status} in ('fixed', 'cannot_reproduce') then null else ${errorEvents.resolutionCommit} end`,
      },
    });
}

/**
 * Closes the monitor's own errors whose path passed in this run and which have
 * not failed for `hours`. Nothing else is eligible. Returns the closed ids.
 */
export async function closeRecoveredMonitorErrors(passedPaths: string[], now = new Date(), hours = AUTO_CLOSE_HOURS) {
  if (!passedPaths.length) return [] as number[];
  const db = await getDb();
  const note = `Closed automatically ${now.toISOString().slice(0, 16)}Z: the page answered correctly in the site check and had not failed for ${hours / 24} days.`;
  const rows = await db
    .update(errorEvents)
    .set({ status: "fixed", resolvedAt: now, resolvedBy: null, resolutionNotes: sql`coalesce(${errorEvents.resolutionNotes} || E'\n', '') || ${note}` })
    .where(
      and(
        eq(errorEvents.source, MONITOR_SOURCE),
        eq(errorEvents.kind, MONITOR_KIND),
        inArray(errorEvents.status, ["open", "investigating"]),
        inArray(errorEvents.path, passedPaths),
        lt(errorEvents.lastSeenAt, new Date(now.getTime() - hours * 3600 * 1000)),
      ),
    )
    .returning({ id: errorEvents.id });
  const ids = rows.map((r) => r.id);
  if (ids.length) await db.insert(auditLogs).values({ actorUserId: null, action: "bug.auto_resolve", entity: "error_event", entityId: null, meta: { closed: ids.length, hours, ids, paths: passedPaths } });
  return ids;
}

/**
 * One complete run: failures recorded, recovered monitor errors closed, the run
 * logged and old runs purged. Call it only after every check has finished; a
 * run that crashed before this point records nothing and closes nothing.
 */
export async function recordSiteCheckRun(results: CheckResult[], release: ReleaseSeen, now = new Date()) {
  const failed = results.filter((r) => !r.ok);
  for (const f of failed) await recordMonitorFailure(f, now);
  const closed = await closeRecoveredMonitorErrors(results.filter((r) => r.ok).map((r) => r.path), now);
  const db = await getDb();
  await db.insert(siteChecks).values({ ranAt: now, ok: failed.length === 0, failures: failed.length, closed: closed.length, results: results.map((r) => ({ ...r, ...(release ? { release } : {}) })) });
  await db.delete(siteChecks).where(lt(siteChecks.ranAt, new Date(now.getTime() - KEEP_DAYS * 86_400_000)));
  return { failed: failed.length, closed };
}
