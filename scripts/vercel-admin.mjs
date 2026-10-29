// Drives the Vercel project from GitHub Actions so nobody has to click through
// the dashboard (docs/27-vercel.md). Needs VERCEL_TOKEN; everything else comes
// from the repository secrets. Values are never printed.
//   node scripts/vercel-admin.mjs setup    env vars + domains + production deploy
//   node scripts/vercel-admin.mjs deploy   production deploy of main
//   node scripts/vercel-admin.mjs status   latest deployment + build log tail + domain DNS
//   node scripts/vercel-admin.mjs logs     recent runtime errors of the production deployment
//   node scripts/vercel-admin.mjs staging  DNS + branch-domain steps (no production secrets)
//   node scripts/vercel-admin.mjs ai       why the AI assistant is off, and fix it (AI_PROVIDER, a key
//                                          pasted with line breaks), check the key with Anthropic, redeploy
import { randomBytes } from "node:crypto";

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT = process.env.VERCEL_PROJECT || "sm-mena";
const DOMAIN = process.env.SITE_DOMAIN || "sawwiq.org";
const REPO_ID = process.env.GITHUB_REPOSITORY_ID;
const API = "https://api.vercel.com";
const STAGING_BRANCH = "cursor/staging-qa-fafd";
const STAGING_HOST = "staging.sawwiq.org";
const STAGING_DB_REF = "klbjfgeoztmvtiolvjbk";
const PRODUCTION_DB_REF = "dzedhnmxywtteeduwpby";

function printStagingSteps() {
  console.log(`Staging subdomain for git branch ${STAGING_BRANCH} on Vercel project ${PROJECT}.`);
  console.log("A path such as sawwiq.org/staging is not used: it would share the production deployment and database.");
  console.log("");
  console.log("DNS (Namecheap → sawwiq.org → Advanced DNS). Do not change the @ or www records.");
  console.log("Type: CNAME");
  console.log("Name: staging");
  console.log("Value: cname.vercel-dns.com");
  console.log("");
  console.log("Vercel:");
  console.log(`1. Project ${PROJECT} → Settings → Domains → add ${STAGING_HOST}.`);
  console.log(`2. Connect that domain to Git branch ${STAGING_BRANCH}. Do not redirect it to ${DOMAIN}.`);
  console.log("3. Environment Variables scoped to Preview and that Git branch only. Not Production. Not every preview.");
  console.log(`4. Copy non-secret app config. Do NOT copy production DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or MFA_ENCRYPTION_KEY.`);
  console.log(`5. DATABASE_URL = session pooler URL for Supabase project sawwiq-staging (ref ${STAGING_DB_REF}). Copy or reset the password in the Supabase dashboard. Never use project ${PRODUCTION_DB_REF}.`);
  console.log("6. Generate new MFA_ENCRYPTION_KEY, CRON_SECRET, and PAYMENTS_WEBHOOK_SECRET.");
  console.log(`7. NEXT_PUBLIC_SITE_URL=https://${STAGING_HOST}`);
  console.log("8. From .env.staging.example: STAGING_MODE=true, VIRTUAL_PAYMENTS=sandbox, LAUNCH_PHASE=full, MONETIZATION_ENABLED=true, PAYMENTS_PROVIDER=mock, PROTECTED_PAYMENTS_LIVE=false, SEO_INDEXABLE=false, ADMIN_REQUIRE_2FA=false, AUTH_SHOW_CODES=true, AI_PROVIDER=basic, FEATURE_DEFAULTS with prelaunch_home=off.");
  console.log("9. Storage on the staging Supabase project (bucket media), or STORAGE_PROVIDER=local (ephemeral on Vercel).");
  console.log("");
  console.log("Do not set STAGING_MODE until the branch DATABASE_URL override exists. Preview env currently inherits the production DATABASE_URL. The app refuses to boot, and the staging hostname returns 503, while that URL still points at production.");
}

const action = process.argv[2] ?? "status";
if (action === "staging") printStagingSteps();
if (!TOKEN) {
  if (action === "staging") {
    console.log("");
    console.log("No VERCEL_TOKEN in this environment, so the domain was not attached. Add the DNS record and the Vercel domain by hand.");
    process.exit(0);
  }
  console.log("::error::Add the VERCEL_TOKEN repository secret (vercel.com → Account Settings → Tokens).");
  process.exit(1);
}

let teamQuery = "";
async function api(path, init = {}) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${teamQuery ? sep + teamQuery : ""}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok && !init.allowFail) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${body?.error?.message ?? text.slice(0, 200)}`);
  return { status: res.status, body };
}

async function findProject() {
  // Personal account first, then each team the token can see.
  let r = await api(`/v9/projects/${PROJECT}`, { allowFail: true });
  if (r.status === 200) return r.body;
  const teams = (await api("/v2/teams")).body.teams ?? [];
  for (const t of teams) {
    teamQuery = `teamId=${t.id}`;
    r = await api(`/v9/projects/${PROJECT}`, { allowFail: true });
    if (r.status === 200) return r.body;
  }
  throw new Error(`Project "${PROJECT}" not found for this token. Import the repo in Vercel first (Add New → Project).`);
}

async function setEnv(project) {
  const existing = new Set(((await api(`/v10/projects/${project.id}/env`)).body.envs ?? []).map((e) => e.key));
  const generated = (k) => (existing.has(k) ? null : randomBytes(30).toString("base64url")); // generated once, then kept
  const vars = {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STORAGE_PROVIDER: "supabase",
    NEXT_PUBLIC_SITE_URL: `https://${DOMAIN}`,
    MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY || generated("MFA_ENCRYPTION_KEY"),
    CRON_SECRET: process.env.CRON_SECRET || generated("CRON_SECRET"),
    PAYMENTS_WEBHOOK_SECRET: generated("PAYMENTS_WEBHOOK_SECRET"),
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    // Emails to agencies (lib/notify.ts, docs/29-email.md).
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || `Sawwiq <noreply@${DOMAIN}>`,
  };
  for (const [key, value] of Object.entries(vars)) {
    if (!value) {
      console.log(`  ${key}: ${existing.has(key) ? "kept" : "not set (no value available)"}`);
      continue;
    }
    await api(`/v10/projects/${project.id}/env?upsert=true`, {
      method: "POST",
      body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview", "development"] }),
    });
    console.log(`  ${key}: set`);
  }
  for (const k of ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!vars[k] && !existing.has(k)) console.log(`::warning::${k} is missing: add it as a GitHub repository secret and run setup again.`);
  }
}

async function setDomains(project) {
  const have = new Set(((await api(`/v9/projects/${project.id}/domains`)).body.domains ?? []).map((d) => d.name));
  if (!have.has(DOMAIN)) await api(`/v10/projects/${project.id}/domains`, { method: "POST", body: JSON.stringify({ name: DOMAIN }) });
  if (!have.has(`www.${DOMAIN}`)) {
    await api(`/v10/projects/${project.id}/domains`, { method: "POST", body: JSON.stringify({ name: `www.${DOMAIN}`, redirect: DOMAIN, redirectStatusCode: 308 }) });
  }
  // The app's canonical address is the bare domain (NEXT_PUBLIC_SITE_URL), and
  // it redirects www itself, so Vercel must serve the bare domain directly and
  // send www there, never the other way round (that loops).
  await api(`/v9/projects/${project.id}/domains/${DOMAIN}`, { method: "PATCH", body: JSON.stringify({ redirect: null, gitBranch: null }) });
  await api(`/v9/projects/${project.id}/domains/www.${DOMAIN}`, { method: "PATCH", body: JSON.stringify({ redirect: DOMAIN, redirectStatusCode: 308 }) });
  console.log(`  ${DOMAIN} serves the site; www.${DOMAIN} redirects to it.`);
}

async function dnsReport() {
  console.log("::group::DNS for the registrar (Namecheap → Advanced DNS)");
  for (const name of [DOMAIN, `www.${DOMAIN}`]) {
    const { body } = await api(`/v6/domains/${name}/config`, { allowFail: true });
    const v4 = body.recommendedIPv4?.find((r) => r.rank === 1)?.value ?? body.recommendedIPv4?.[0]?.value;
    const cname = body.recommendedCNAME?.find((r) => r.rank === 1)?.value ?? body.recommendedCNAME?.[0]?.value;
    const ok = body.misconfigured === false;
    if (name === DOMAIN) console.log(`${ok ? "OK " : "TODO"} A     @    → ${Array.isArray(v4) ? v4.join(", ") : v4 ?? "76.76.21.21"}   (and delete any AAAA record on @)`);
    else console.log(`${ok ? "OK " : "TODO"} CNAME www  → ${cname ?? "cname.vercel-dns.com"}`);
  }
  console.log("::endgroup::");
}

async function deploy(project) {
  const { body } = await api(`/v13/deployments?forceNew=1`, {
    method: "POST",
    body: JSON.stringify({ name: project.name, project: project.id, target: "production", gitSource: { type: "github", repoId: Number(REPO_ID), ref: "main" } }),
  });
  console.log(`Deploying ${body.id} …`);
  return waitFor(body.id);
}

async function waitFor(id) {
  for (let i = 0; i < 120; i++) {
    const { body } = await api(`/v13/deployments/${id}`);
    if (["READY", "ERROR", "CANCELED"].includes(body.readyState)) {
      console.log(`Deployment ${body.readyState}: https://${body.url}`);
      if (body.readyState !== "READY") await buildLog(id);
      return body.readyState;
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  console.log("Still building after 20 minutes.");
  return "TIMEOUT";
}

async function buildLog(id) {
  const { body } = await api(`/v3/deployments/${id}/events?limit=-1&builds=1`, { allowFail: true });
  const lines = (Array.isArray(body) ? body : []).map((e) => e.payload?.text ?? e.text).filter(Boolean);
  console.log("::group::Build log (last 80 lines)");
  console.log(lines.slice(-80).join("\n"));
  console.log("::endgroup::");
}

async function status(project) {
  const { body } = await api(`/v6/deployments?projectId=${project.id}&limit=3`);
  for (const d of body.deployments ?? []) console.log(`${d.target ?? "preview"} ${d.readyState ?? d.state} https://${d.url} (${new Date(d.created).toISOString()})`);
  const last = body.deployments?.[0];
  if (last) await buildLog(last.uid);
  await dnsReport();
}

/** Streams the production deployment's runtime logs for a short while and prints the errors. */
async function runtimeLogs(project) {
  const { body } = await api(`/v6/deployments?projectId=${project.id}&target=production&state=READY&limit=1`);
  const d = body.deployments?.[0];
  if (!d) return console.log("No ready production deployment.");
  console.log(`Deployment https://${d.url}`);
  // Visit a few pages so fresh errors show up while the stream is open.
  const pages = (process.env.LOG_PATHS || "/ar,/ar/explore,/ar/requests").split(",");
  const sep = teamQuery ? `?${teamQuery}` : "";
  // LOG_MINUTES keeps the stream open longer, e.g. while someone reproduces a
  // problem; LOG_MATCH also prints every entry (not only errors) whose path matches.
  const minutes = Number(process.env.LOG_MINUTES) || 0;
  const match = process.env.LOG_MATCH ? new RegExp(process.env.LOG_MATCH) : null;
  if (minutes) console.log(`Listening for ${minutes} minutes${match ? ` (all entries for ${match})` : ""}.`);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), minutes ? minutes * 60_000 : 25_000);
  const res = await fetch(`${API}/v1/projects/${project.id}/deployments/${d.uid}/runtime-logs${sep}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    signal: ctl.signal,
  });
  setTimeout(() => pages.forEach((p) => fetch(`https://${DOMAIN}${p}`).then((r) => console.log(`GET ${p} → ${r.status}`)).catch(() => {})), 2000);
  let buf = "";
  try {
    for await (const chunk of res.body) {
      buf += Buffer.from(chunk).toString();
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        let e;
        try {
          e = JSON.parse(line);
        } catch {
          continue;
        }
        if (match && match.test(e.requestPath ?? "")) {
          const when = e.timestampInMs ? new Date(e.timestampInMs).toISOString() : "";
          console.log(`${when} [${e.level ?? ""}] ${e.requestMethod ?? ""} ${e.requestPath} ${e.responseStatusCode ?? e.statusCode ?? ""} ${String(e.message ?? "").slice(0, 3000)}`);
        } else if (e.level === "error" || e.level === "warning" || /error/i.test(e.message ?? "")) {
          console.log(`[${e.level}] ${e.requestPath ?? ""} ${String(e.message ?? "").slice(0, 3000)}`);
        }
      }
    }
  } catch (error) {
    if (error.name !== "AbortError") throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function attachStagingDomain(project) {
  // Domain only. Production env values are never copied onto the branch.
  const created = await api(`/v10/projects/${project.id}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: STAGING_HOST, gitBranch: STAGING_BRANCH }),
    allowFail: true,
  });
  const patched = await api(`/v9/projects/${project.id}/domains/${STAGING_HOST}`, {
    method: "PATCH",
    body: JSON.stringify({ gitBranch: STAGING_BRANCH, redirect: null }),
    allowFail: true,
  });
  console.log(`Domain attach ${created.status}, branch update ${patched.status}. Env vars were not copied.`);
  if (created.status >= 400 && patched.status >= 400) process.exit(1);
}

/**
 * The help chat and matchmaker use Claude only when ANTHROPIC_API_KEY is set and
 * AI_PROVIDER is not basic/off/mock (lib/ai/agent.ts). Reports what production
 * has (names and known words only, never a key), switches AI_PROVIDER to auto,
 * removes line breaks pasted into the key, asks Anthropic whether the key works
 * (status code only), and redeploys when something changed.
 */
async function aiDoctor(project) {
  const all = (await api(`/v10/projects/${project.id}/env`)).body.envs ?? [];
  // Every AI-related entry, names and scopes only: duplicates or a wrong target explain a key the site does not see.
  for (const e of all.filter((x) => /^(ANTHROPIC|AI_|HELP_|OPENAI)/.test(x.key)))
    console.log(`  entry ${e.key}: type ${e.type}, targets ${(e.target ?? []).join("+") || "-"}${e.gitBranch ? `, branch ${e.gitBranch}` : ""}${e.customEnvironmentIds?.length ? ", custom env" : ""}, updated ${new Date(e.updatedAt ?? e.createdAt ?? 0).toISOString().slice(0, 16)}`);
  const envs = all.filter((e) => (e.target ?? []).includes("production") && !e.gitBranch);
  const find = (k) => envs.find((e) => e.key === k);
  const valueOf = async (e) => (e ? ((await api(`/v1/projects/${project.id}/env/${e.id}`, { allowFail: true })).body.value ?? null) : null);
  const KNOWN = ["auto", "anthropic", "openai", "mock", "basic", "off"];
  let changed = false;

  const provider = find("AI_PROVIDER");
  const providerValue = (await valueOf(provider))?.trim().toLowerCase() ?? null;
  console.log(`AI_PROVIDER: ${provider ? (providerValue === null ? "set (value not readable)" : KNOWN.includes(providerValue) ? providerValue : "set to an unknown word") : "not set (auto)"}`);
  if (provider && (providerValue === null || ["basic", "off", "mock"].includes(providerValue))) {
    await api(`/v9/projects/${project.id}/env/${provider.id}`, { method: "PATCH", body: JSON.stringify({ value: "auto" }) });
    console.log("  → set to auto");
    changed = true;
  }
  const helpAi = find("HELP_AI");
  if (helpAi && (await valueOf(helpAi))?.trim() === "off") {
    await api(`/v9/projects/${project.id}/env/${helpAi.id}`, { method: "DELETE" });
    console.log("HELP_AI: was off → removed");
    changed = true;
  }

  const keyEnv = find("ANTHROPIC_API_KEY");
  let key = await valueOf(keyEnv);
  if (!keyEnv) console.log("::error::ANTHROPIC_API_KEY is not set for production.");
  else if (key === null) console.log("ANTHROPIC_API_KEY: set (sensitive, cannot be read back: checked through the site after the redeploy)");
  else {
    const clean = key.replace(/\s+/g, "");
    console.log(`ANTHROPIC_API_KEY: set, ${clean.length} characters, starts ${clean.slice(0, 10)}…${clean !== key ? ", had spaces or line breaks" : ""}`);
    if (clean !== key) {
      await api(`/v9/projects/${project.id}/env/${keyEnv.id}`, { method: "PATCH", body: JSON.stringify({ value: clean }) });
      console.log("  → line breaks removed");
      key = clean;
      changed = true;
    }
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } }).catch(() => null);
    console.log(`Anthropic accepts the key: ${res?.ok ? "yes" : `no (${res ? res.status : "no answer"})`}`);
    if (res && !res.ok) console.log("::warning::Anthropic refused the key: create a new one at platform.claude.com/settings/keys and paste it as one line.");
  }

  if (changed) {
    if ((await deploy(project)) !== "READY") process.exit(1);
  } else console.log("Nothing to change; no redeploy.");
  const health = await fetch(`https://${DOMAIN}/api/health`).then((r) => r.json()).catch(() => null);
  console.log(`Live site AI: ${health?.ai ?? "unknown"}`);
}

const action = process.argv[2] ?? "status";
const project = await findProject();
console.log(`Project: ${project.name}`);
if (action === "staging") {
  await attachStagingDomain(project);
} else if (action === "setup") {
  console.log("Environment variables:");
  await setEnv(project);
  await setDomains(project);
  const state = await deploy(project);
  await dnsReport();
  if (state !== "READY") process.exit(1);
} else if (action === "deploy") {
  if ((await deploy(project)) !== "READY") process.exit(1);
} else if (action === "logs") {
  await runtimeLogs(project);
} else if (action === "ai") {
  await aiDoctor(project);
} else {
  await status(project);
}
