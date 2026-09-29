/** Read-only Vercel recovery: GET only, fixed origins, allowlisted output. No deployment/config writes. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const PROJECT = 'prj_r6vpBm9DQ1RCmBYhDTURXga9bPC1';
const TEAM = 'team_QypoqWSPoz4ULgZ6buX6JwTH';
const ORIGIN = 'https://sawwiq.org';
const SHA = /^[a-f0-9]{40}$/;
const ID = /^dpl_[a-zA-Z0-9]+$/;
const routes = ['/ar?intro=0', '/en?intro=0', '/ar/explore?tab=agencies', '/en/explore?tab=agencies'];
const token = process.env.VERCEL_TOKEN;
let teamQuery = '';
const headers = () => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });

function endpoint(path) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
  const u = new URL(`https://api.vercel.com${path}`);
  if (u.origin !== 'https://api.vercel.com') throw new Error('Invalid API origin');
  if (teamQuery) u.searchParams.set('teamId', teamQuery);
  return u;
}

async function limitedText(response, limit) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Response limit');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString('utf8');
}

async function api(path, timeout = 20000) {
  try {
    const r = await fetch(endpoint(path), { method: 'GET', headers: headers(), redirect: 'error', signal: AbortSignal.timeout(timeout) });
    // Never return raw errors, tokens or provider payloads in report/logs.
    if (!r.ok) { await r.body?.cancel(); return { ok: false, status: r.status, body: null }; }
    const text = await limitedText(r, 8_000_000);
    return { ok: true, status: r.status, body: JSON.parse(text) };
  } catch { return { ok: false, status: 0, body: null }; }
}

async function site(path, cap = 6_000_000) {
  const u = new URL(path, ORIGIN);
  if (u.origin !== ORIGIN) throw new Error('Invalid site origin');
  const started = Date.now();
  try {
    const r = await fetch(u, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'SawwiqReadOnlyProof/1.0' } });
    const text = await limitedText(r, cap);
    return { status: r.status, ms: Date.now() - started, text, cache: r.headers.get('cache-control'), contentType: r.headers.get('content-type') };
  } catch { return { status: 0, ms: Date.now() - started, text: '', cache: null, contentType: null }; }
}

function release(text) {
  try {
    const r = JSON.parse(text);
    return { commit: SHA.test(r.commit ?? '') ? r.commit : null, revision: typeof r.revision === 'string' && /^[a-zA-Z0-9_.-]{1,100}$/.test(r.revision) ? r.revision : null, environment: ['production', 'preview', 'development', 'unknown'].includes(r.environment) ? r.environment : null };
  } catch { return { commit: null, revision: null, environment: null }; }
}

function stamps(html) {
  return [...html.matchAll(/<[a-zA-Z][^>]*\bdata-testid=["']release-stamp["'][^>]*>/g)].map(([tag]) => {
    const attr = name => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1] ?? null;
    return { commit: attr('data-release-sha'), revision: attr('data-ui-revision'), environment: attr('data-release-environment') };
  });
}
const validRelease = r => Boolean(r.commit && r.revision && r.environment === 'production');
const match = (a, b) => validRelease(a) && a.commit === b.commit && a.revision === b.revision && a.environment === b.environment;

function deployment(body) {
  if (!body || !ID.test(body.id ?? body.uid ?? '') || !SHA.test(body.meta?.githubCommitSha ?? '')) return null;
  return { id: body.id ?? body.uid, sha: body.meta.githubCommitSha, target: body.target ?? 'preview', state: body.readyState ?? body.state ?? null, canonicalAlias: Array.isArray(body.alias) && body.alias.includes('sawwiq.org') };
}

async function runtimeSample(dpl) {
  const out = { http_status: 0, sample_seconds: 12, events: 0, errors: 0, warnings: 0, status_counts: {}, error_classes: {}, limitation: 'A bounded live sample, not a 24-hour historical log audit. No raw log messages are retained.' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  let bytes = 0, buffer = '';
  const onLine = line => {
    try {
      const e = JSON.parse(line.replace(/^data:\s*/, ''));
      out.events++;
      if (['error', 'fatal'].includes(e.level)) {
        out.errors++;
        const s = String(e.message ?? '');
        const name = ['TypeError','ReferenceError','MISSING_MESSAGE','TimeoutError','ECONNRESET','ETIMEDOUT'].find(n => s.includes(n)) ?? 'other';
        out.error_classes[name] = (out.error_classes[name] ?? 0) + 1;
      }
      if (e.level === 'warning') out.warnings++;
      const status = Number(e.responseStatusCode ?? e.statusCode);
      if (Number.isInteger(status) && status >= 100 && status <= 599) out.status_counts[status] = (out.status_counts[status] ?? 0) + 1;
    } catch { /* Metadata or partial non-JSON lines are not retained. */ }
  };
  try {
    const r = await fetch(endpoint(`/v1/projects/${PROJECT}/deployments/${dpl}/runtime-logs`), { method: 'GET', headers: headers(), redirect: 'error', signal: ctl.signal });
    out.http_status = r.status;
    if (!r.ok || !r.body) { await r.body?.cancel(); return out; }
    // Harmless public GETs to exercise functions while listening. No auth/write/cron URLs.
    const probes = Promise.all(['/api/version','/api/health','/en'].map(p => site(p)));
    for await (const chunk of r.body) {
      bytes += chunk.length;
      if (bytes > 1_000_000) { ctl.abort(); break; }
      buffer += Buffer.from(chunk).toString('utf8');
      const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
      for (const line of lines) onLine(line);
    }
    await probes;
  } catch { /* End of bounded sample or access/network failure; status remains explicit. */ }
  finally { clearTimeout(timer); }
  return out;
}

async function main() {
  const report = { checked_at_utc: new Date().toISOString(), observation_only: true, observer_sha: SHA.test(process.env.GITHUB_SHA ?? '') ? process.env.GITHUB_SHA : null, project_id: PROJECT, api: {}, canonical: {}, health: {}, rendered_html: [], blockers: [], limitations: ['No provider login, collaborator message, financial action or public publication is performed.', 'HTML release-stamp checks do not establish visual layout or actual video playback.'] };
  const v1 = await site(`/api/version?verification=${Date.now()}`, 32768);
  const first = release(v1.text);
  report.canonical = { http_status: v1.status, no_store: Boolean(v1.cache?.includes('no-store')), ...first };
  const health = await site('/api/health', 32768);
  let ok = false;
  try { ok = JSON.parse(health.text).ok === true; } catch { /* explicit false */ }
  report.health = { http_status: health.status, ok, ms: health.ms };
  if (!token) report.blockers.push('Existing VERCEL_TOKEN unavailable to this job. No secret values were requested or printed.');
  else {
    let p = await api(`/v9/projects/${PROJECT}`);
    if (!p.ok) { teamQuery = TEAM; p = await api(`/v9/projects/${PROJECT}`); }
    report.api.project_status = p.status;
    if (p.ok && p.body.id === PROJECT && p.body.name === 'sm-mena' && p.body.accountId === TEAM) {
      report.api.access = 'authorized_project_confirmed';
      report.api.scope_mode = teamQuery ? 'explicit_team' : 'default';
      const team = await api(`/v2/teams/${TEAM}`);
      report.api.plan = ['hobby','pro','enterprise'].includes(team.body?.billing?.plan) ? team.body.billing.plan : 'not_verified';
      const ds = await api(`/v6/deployments?projectId=${PROJECT}&target=production&state=READY&limit=10`);
      const candidates = Array.isArray(ds.body?.deployments) ? ds.body.deployments : [];
      const observed = candidates.find(d => d.meta?.githubCommitSha === first.commit);
      if (observed && ID.test(observed.uid ?? observed.id ?? '')) {
        const detail = await api(`/v13/deployments/${observed.uid ?? observed.id}`);
        report.api.deployment = deployment(detail.body);
        const d = report.api.deployment;
        if (d) {
          const logs = await api(`/v3/deployments/${d.id}/events?builds=1&limit=200&direction=backward`);
          report.api.build_logs = { http_status: logs.status, event_count: Array.isArray(logs.body) ? logs.body.length : null, raw_content_retained: false };
          report.api.runtime_logs = await runtimeSample(d.id);
        }
      } else report.blockers.push('The canonical source SHA could not be matched to the bounded production deployment list.');
    } else report.blockers.push('Project API access or exact project/tenant verification failed.');
  }
  for (const path of routes) {
    const r = await site(path);
    const found = stamps(r.text);
    report.rendered_html.push({ path, http_status: r.status, ms: r.ms, stamp_count: found.length, matches_canonical: r.status === 200 && found.length > 0 && found.every(s => match(first,s)) });
  }
  const v2 = await site(`/api/version?verification=${Date.now()}`,32768);
  const last = release(v2.text);
  report.canonical.stable_during_check = v2.status === 200 && match(first,last);
  const d = report.api.deployment;
  report.source_verified = v1.status === 200 && report.canonical.no_store && validRelease(first) && report.canonical.stable_during_check && d?.sha === first.commit && d?.target === 'production' && d?.state === 'READY' && d?.canonicalAlias === true && report.rendered_html.every(p => p.matches_canonical);
  if (!report.source_verified) report.blockers.push('Canonical source proof incomplete; inspect recorded statuses, not a claim the site is down.');
  if (!report.health.ok || health.status !== 200) report.blockers.push('Health did not return HTTP 200 with ok=true.');
  await mkdir('ops-proof',{recursive:true});
  const output = JSON.stringify(report,null,2);
  // A final literal canary prevents the only credential this process receives from being emitted.
  if (token && output.includes(token)) throw new Error('Output safety check failed');
  await writeFile('ops-proof/vercel-readonly-proof.json',output+'\n');
  console.log(output);
  if (!report.source_verified || !report.health.ok || health.status !== 200) process.exitCode=1;
}

if (process.argv.includes('--self-test')) {
  const good = { commit: 'a'.repeat(40), revision: 'collaboration-v2-r3.1', environment: 'production' };
  assert.deepEqual(release(JSON.stringify(good)),good);
  assert.equal(release('{').commit,null);
  assert.equal(release(JSON.stringify({...good,commit:'bad'})).commit,null);
  assert.equal(validRelease({...good,environment:'preview'}),false);
  assert.equal(match(good,{...good,commit:'b'.repeat(40)}),false);
  const h = `<a data-release-environment="production" data-testid="release-stamp" data-release-sha="${good.commit}" data-ui-revision="${good.revision}">v</a>`;
  assert.equal(stamps(h).length,1);
  assert.equal(match(good,stamps(h)[0]),true);
  assert.equal(stamps('<div data-testid="other">').length,0);
  assert.equal(deployment({id:'bad'}),null);
  assert.equal(deployment({id:'dpl_Test',meta:{githubCommitSha:good.commit},target:'production',readyState:'READY',alias:['sawwiq.org']}).canonicalAlias,true);
  assert.equal(endpoint('/v9/projects/test').origin,'https://api.vercel.com');
  assert.throws(()=>endpoint('//evil.example'));
  const r=new Response('too long');
  await assert.rejects(()=>limitedText(r,2));
  console.log('PASS: 13 read-only probe parsing, origin, identity and response-limit assertions. This is not live production verification.');
} else {
  await main().catch(async()=>{
    await mkdir('ops-proof',{recursive:true});
    const text=JSON.stringify({observation_only:true,source_verified:false,blockers:['Diagnostic failed; no raw exception or credential emitted.']},null,2);
    await writeFile('ops-proof/vercel-readonly-proof.json',text+'\n');
    console.log(text); process.exitCode=1;
  });
}
