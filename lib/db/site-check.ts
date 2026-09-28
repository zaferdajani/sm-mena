// Automatic site check (docs/52), run by .github/workflows/site-check.yml every
// 30 minutes against the live site and database:
//   1. check  — open the key public pages and the health check; a page that
//      fails, times out or is very slow is recorded in Admin → Bugs (source
//      "monitor"), reopening the entry if it had been closed;
//   2. fix    — unresolved errors not seen for 3 days are closed with a note
//      (they reopen by themselves if they happen again);
//   3. log    — every run is kept in site_checks (90 days) and shown in
//      Admin → Bugs; closures go to the audit log. A failing run exits 1, so
//      GitHub emails the repository owner.
// No personal data: only paths, status codes and timings.
import { createHash } from "node:crypto";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const SITE = (process.env.SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
const TIMEOUT_MS = 20_000;
const SLOW_MS = 10_000;
const AUTO_CLOSE_HOURS = 72;
const KEEP_DAYS = 90;
const PAGES = ["/api/health", "/ar", "/en", "/ar/explore", "/ar/start", "/ar/login", "/ar/soon", "/sitemap.xml"];

type Result = { path: string; status: number; ms: number; ok: boolean; problem?: string };

async function check(path: string): Promise<Result> {
  const started = Date.now();
  try {
    const res = await fetch(`${SITE}${path}`, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "SawwiqSiteCheck/1.0" } });
    const body = await res.text();
    const ms = Date.now() - started;
    if (res.status !== 200) return { path, status: res.status, ms, ok: false, problem: `HTTP ${res.status}` };
    if (path === "/api/health") {
      const health = JSON.parse(body) as { ok?: boolean; database?: string };
      if (!health.ok) return { path, status: res.status, ms, ok: false, problem: `health not ok (database: ${health.database ?? "?"})` };
    }
    if (ms > SLOW_MS) return { path, status: res.status, ms, ok: false, problem: `slow: ${Math.round(ms / 1000)} s` };
    return { path, status: res.status, ms, ok: true };
  } catch (error) {
    const ms = Date.now() - started;
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { path, status: 0, ms, ok: false, problem: timedOut ? `no answer within ${TIMEOUT_MS / 1000} s` : `request failed: ${error instanceof Error ? error.message.slice(0, 120) : "unknown"}` };
  }
}

/** Same fingerprint rule as lib/data/bugs.ts, so a repeated failure counts up one entry. */
const fingerprint = (source: string, kind: string, path: string, message: string) =>
  createHash("md5").update(`${source}|${kind}|${path}|${message.replace(/\d+/g, "N").slice(0, 300)}`).digest("hex");

async function main() {
  const results: Result[] = [];
  // One at a time: a check must not add load of its own.
  for (const path of PAGES) results.push(await check(path));
  const failed = results.filter((r) => !r.ok);

  const sql = postgres(url!, { max: 1, prepare: false });
  try {
    for (const f of failed) {
      const message = `Site check: ${f.path} — ${f.problem}`;
      await sql`
        insert into error_events (fingerprint, source, kind, message, path, user_agent)
        values (${fingerprint("monitor", "site_check", f.path, message)}, 'monitor', 'site_check', ${message}, ${f.path}, 'SawwiqSiteCheck/1.0')
        on conflict (fingerprint) do update set
          occurrences = error_events.occurrences + 1,
          last_seen_at = now(),
          status = case when error_events.status in ('fixed', 'cannot_reproduce') then 'open'::error_status else error_events.status end`;
    }
    const closedRows = await sql<{ id: number }[]>`
      update error_events
      set status = 'fixed', resolved_at = now(), resolved_by = null,
          resolution_notes = coalesce(resolution_notes || E'\n', '') || ${`Closed automatically: not seen for ${AUTO_CLOSE_HOURS / 24} days (site check).`}
      where status in ('open', 'investigating') and last_seen_at < now() - make_interval(hours => ${AUTO_CLOSE_HOURS})
      returning id`;
    if (closedRows.length) {
      await sql`
        insert into audit_logs (actor_user_id, action, entity, entity_id, meta)
        values (null, 'bug.auto_resolve', 'error_event', null, ${sql.json({ closed: closedRows.length, hours: AUTO_CLOSE_HOURS, ids: closedRows.map((r) => r.id) })})`;
    }
    await sql`
      insert into site_checks (ok, failures, closed, results)
      values (${failed.length === 0}, ${failed.length}, ${closedRows.length}, ${sql.json(results)})`;
    await sql`delete from site_checks where ran_at < now() - make_interval(days => ${KEEP_DAYS})`;

    for (const r of results) console.log(`${r.ok ? "OK  " : "FAIL"} ${r.path} ${r.status} ${r.ms} ms${r.problem ? ` — ${r.problem}` : ""}`);
    console.log(`Closed automatically: ${closedRows.length} error(s) not seen for ${AUTO_CLOSE_HOURS} h.`);
  } finally {
    await sql.end();
  }
  if (failed.length) {
    console.log(`::error::${failed.length} of ${results.length} checks failed; recorded in Admin → Bugs.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
