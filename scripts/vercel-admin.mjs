// Drives the Vercel project from GitHub Actions so nobody has to click through
// the dashboard (docs/27-vercel.md). Needs VERCEL_TOKEN; everything else comes
// from the repository secrets. Values are never printed.
//   node scripts/vercel-admin.mjs setup    env vars + domains + production deploy
//   node scripts/vercel-admin.mjs deploy   production deploy of main
//   node scripts/vercel-admin.mjs status   latest deployment + build log tail + domain DNS
import { randomBytes } from "node:crypto";

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT = process.env.VERCEL_PROJECT || "sm-mena";
const DOMAIN = process.env.SITE_DOMAIN || "sawwiq.org";
const REPO_ID = process.env.GITHUB_REPOSITORY_ID;
const API = "https://api.vercel.com";
if (!TOKEN) {
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

const action = process.argv[2] ?? "status";
const project = await findProject();
console.log(`Project: ${project.name}`);
if (action === "setup") {
  console.log("Environment variables:");
  await setEnv(project);
  await setDomains(project);
  const state = await deploy(project);
  await dnsReport();
  if (state !== "READY") process.exit(1);
} else if (action === "deploy") {
  if ((await deploy(project)) !== "READY") process.exit(1);
} else {
  await status(project);
}
