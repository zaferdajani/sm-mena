// Automatic site check (docs/52), run by .github/workflows/site-check.yml every
// 30 minutes against the live site and database:
//   1. check  — open the key public pages and the health check; each page must
//      answer 200 at its expected final address with its expected content
//      (release stamp, sign-in form, sitemap root …) within the time limits;
//      a failure is recorded in Admin → Bugs (source "monitor"), reopening a
//      closed entry and clearing its old resolution;
//   2. close  — only the monitor's own errors whose page answered correctly in
//      this run and had not failed for 3 days are closed, with a note; nothing
//      else is ever closed by this job (lib/data/site-check.ts);
//   3. log    — every run is kept in site_checks (90 days) with the release the
//      site reported (/api/version) and shown in Admin → Bugs; closures go to
//      the audit log. A failing run exits 1, so GitHub emails the owner.
// This is an availability monitor from a GitHub runner: it is not a browser,
// not an authenticated journey and not release acceptance.
// No personal data: only paths, status codes, final addresses and timings.
import { closeDb } from "@/lib/db";
import { recordSiteCheckRun, type CheckResult, type ReleaseSeen } from "@/lib/data/site-check";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
const SITE = (process.env.SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
const TIMEOUT_MS = 20_000;
const SLOW_MS = 10_000;

type Expectation = { finalPath?: RegExp; contains?: string[]; json?: (body: unknown) => string | null };
const STAMP = 'data-release-sha="';
/** What each page must answer with. Redirects are followed and the final address is checked, so a page that "answers 200" by bouncing to the front page still fails. */
const PAGES: Record<string, Expectation> = {
  "/api/health": { finalPath: /^\/api\/health$/, json: (b) => ((b as { ok?: boolean }).ok ? null : `health not ok (database: ${(b as { database?: string }).database ?? "?"})`) },
  "/ar": { finalPath: /^\/ar(\/soon)?$/, contains: [STAMP, 'lang="ar"'] },
  "/en": { finalPath: /^\/en(\/soon)?$/, contains: [STAMP, 'lang="en"'] },
  "/ar/explore": { finalPath: /^\/ar\/(explore|soon|login)/, contains: [STAMP] },
  "/ar/start": { finalPath: /^\/ar\/start$/, contains: [STAMP] },
  "/ar/login": { finalPath: /^\/ar\/login$/, contains: [STAMP, 'id="email"'] },
  "/ar/soon": { finalPath: /^\/ar\/soon$/, contains: [STAMP] },
  "/sitemap.xml": { finalPath: /^\/sitemap\.xml$/, contains: ["<urlset"] },
};

async function check(path: string, expect: Expectation): Promise<CheckResult> {
  const started = Date.now();
  try {
    const res = await fetch(`${SITE}${path}`, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "SawwiqSiteCheck/1.0", "cache-control": "no-cache" } });
    const body = await res.text();
    const ms = Date.now() - started;
    const finalPath = new URL(res.url || `${SITE}${path}`).pathname;
    const base = { path, status: res.status, ms, finalPath };
    if (res.status !== 200) return { ...base, ok: false, problem: `HTTP ${res.status}` };
    if (expect.finalPath && !expect.finalPath.test(finalPath)) return { ...base, ok: false, problem: `landed on ${finalPath}` };
    if (expect.json) {
      let parsed: unknown;
      try { parsed = JSON.parse(body); } catch { return { ...base, ok: false, problem: "not JSON" }; }
      const problem = expect.json(parsed);
      if (problem) return { ...base, ok: false, problem };
    }
    const missing = (expect.contains ?? []).find((s) => !body.includes(s));
    if (missing) return { ...base, ok: false, problem: `expected content missing (${missing.replace(/"/g, "").slice(0, 30)})` };
    if (ms > SLOW_MS) return { ...base, ok: false, problem: `slow: ${Math.round(ms / 1000)} s` };
    return { ...base, ok: true };
  } catch (error) {
    const ms = Date.now() - started;
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { path, status: 0, ms, ok: false, problem: timedOut ? `no answer within ${TIMEOUT_MS / 1000} s` : `request failed: ${error instanceof Error ? error.message.slice(0, 120) : "unknown"}` };
  }
}

/** Which release the site says it is running; recorded with the run, never asserted from the repository. */
async function release(): Promise<ReleaseSeen> {
  try {
    const res = await fetch(`${SITE}/api/version`, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "cache-control": "no-cache" } });
    if (!res.ok) return null;
    const v = (await res.json()) as { revision?: string; commit?: string | null; environment?: string };
    return v.revision ? { revision: v.revision, commit: v.commit ?? null, environment: v.environment ?? "unknown" } : null;
  } catch {
    return null;
  }
}

async function main() {
  const results: CheckResult[] = [];
  // One at a time: a check must not add load of its own.
  for (const [path, expect] of Object.entries(PAGES)) results.push(await check(path, expect));
  const seen = await release();
  try {
    const { failed, closed } = await recordSiteCheckRun(results, seen);
    for (const r of results) console.log(`${r.ok ? "OK  " : "FAIL"} ${r.path} ${r.status} ${r.ms} ms${r.finalPath && r.finalPath !== r.path ? ` -> ${r.finalPath}` : ""}${r.problem ? ` — ${r.problem}` : ""}`);
    console.log(seen ? `Release seen: ${seen.revision} ${seen.commit ?? "?"} (${seen.environment})` : "Release: /api/version not readable");
    console.log(`Closed automatically: ${closed.length} monitor error(s) whose page answered correctly and had not failed for 3 days.`);
    if (failed) {
      console.log(`::error::${failed} of ${results.length} checks failed; recorded in Admin → Bugs.`);
      process.exitCode = 1;
    }
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
