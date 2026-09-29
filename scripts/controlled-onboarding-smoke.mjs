/** Owner-authorized, bounded synthetic production acceptance.
 * No existing account is impersonated or modified. Credentials stay in memory.
 * Two suspended/demo QA providers sign in normally and are removed in finally.
 * Rehearsal mode only accepts a disposable localhost database.
 */
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs/promises';
import postgres from 'postgres';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const rehearsal = process.argv.includes('--rehearsal');
const BASE = 'https://sawwiq.org';
const expected = process.env.EXPECTED_COMMIT;
const dbUrl = process.env.DATABASE_URL;
assert.ok(dbUrl, 'A scoped database credential is required');
const dbTarget = new URL(dbUrl);
if (rehearsal) {
  assert.ok(['localhost','127.0.0.1'].includes(dbTarget.hostname));
  assert.equal(dbTarget.pathname, '/sawwiq_rehearsal');
  assert.equal(dbTarget.username, 'qa_rehearsal');
} else {
  assert.equal(process.env.ALLOW_SYNTHETIC_QA, 'owner-authorized-isolated-onboarding');
  assert.match(expected ?? '', /^[a-f0-9]{40}$/);
  assert.ok(dbTarget.hostname.endsWith('.supabase.com') || dbTarget.hostname.endsWith('.supabase.co'));
}
const sql = postgres(dbUrl, { max: 2, prepare: false, connect_timeout: 10, idle_timeout: 5 });
const run = randomUUID();
const qa = ['en','ar'].map(locale => ({ locale, userId: randomUUID(), agencyId: randomUUID(),
  handle: `qa.check.${randomUUID().slice(0,8)}`, email: `qa-${randomUUID()}@example.invalid`,
  password: randomBytes(32).toString('base64url') }));
const ownedIds = qa.map(a => a.agencyId);
const userIds = qa.map(a => a.userId);
const out = 'controlled-onboarding-evidence';
await fs.mkdir(out, {recursive: true});
const report = { kind: 'controlled-synthetic-QA-not-a-real-user-pilot', run, mode: rehearsal ? 'local-Postgres-rehearsal':'production',
  observer: process.env.GITHUB_SHA ?? null, expected, startedAt: new Date().toISOString(), checks: [], sourceBefore: null, sourceAfter: null,
  cleanup: { created: 0, deleted: 0, remaining: null, mediaKeys: 0 }, errors: [], limitations: [
    'Uses ordinary provider login on suspended internal demo identities, not existing customers or staff access.',
    'Does not exercise public signup/Founder allocation, real customer outreach, money movement or provider OAuth approval.',
    'Mobile is a Chromium viewport; physical-device and external-provider acceptance remain separate.'
  ] };
let browser;
let created = false;
const record = (name, ok) => { report.checks.push({ name, passed: Boolean(ok) }); assert.ok(ok, name); };
async function json(url, init={}) {
  const response = await fetch(url, { redirect:'error', signal:AbortSignal.timeout(20_000), ...init });
  assert.equal(response.status, 200, `Expected an HTTP200 response from ${new URL(url).pathname}`);
  return response.json();
}
async function version() {
  const v = await json(`${BASE}/api/version?qa=${run}`, { headers:{'cache-control':'no-cache'} });
  assert.equal(v.commit, expected, 'Production must still serve the reviewed expected source');
  assert.equal(v.environment, 'production');
  return v;
}
const SUPABASE = (process.env.SUPABASE_URL ?? '').replace(/\/$/,'');
const bucket = process.env.SUPABASE_BUCKET || 'media';
const privateBucket = `${bucket}-private`;
function storageHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(key && SUPABASE && new URL(SUPABASE).hostname.endsWith('.supabase.co'));
  return { Authorization:`Bearer ${key}`, apikey:key, 'content-type':'application/json' };
}
async function provision() {
  // Provisioning is atomic. There are no emails, Founder sequence calls or public actors.
  await sql.begin(async tx => {
    for (const a of qa) {
      const salt = randomBytes(16);
      const hash = scryptSync(a.password, salt, 64, {N:16384,r:8,p:1});
      const passwordHash = `scrypt$16384$${salt.toString('base64')}$${hash.toString('base64')}`;
      await tx`insert into users (id,email,password_hash,role,consent_version,consent_at,staff_expires_at)
        values (${a.userId},${a.email},${passwordHash},'agency',${'internal-qa-'+run},now(),now()+interval '30 minutes')`;
      await tx`insert into agencies (id,owner_user_id,handle,name,city,country,kind,services,content_lang,is_demo,status,founding_seat)
        values (${a.agencyId},${a.userId},${a.handle},'Internal QA — not a provider','amman','jo','agency',ARRAY['photography'],${a.locale},true,'suspended',null)`;
    }
    const [count] = await tx`select count(*)::int as n from agencies a join users u on u.id=a.owner_user_id
      where a.id in ${tx(ownedIds)} and a.is_demo and a.status='suspended' and a.founding_seat is null and u.role='agency'
      and a.email is null and a.whatsapp is null and a.phone is null and not a.is_verified`;
    assert.equal(count.n,2);
  });
  created = true;
  report.cleanup.created = 2;
  record('QA identities are non-public, unverified, non-Founders with no outreach contacts', true);
}
async function proveIsolation(anon) {
  const rows = await sql`select id,is_demo,status,founding_seat,email,phone,whatsapp from agencies where id in ${sql(ownedIds)}`;
  record('QA identities remain isolated', rows.length===2 && rows.every(a=>a.is_demo && a.status==='suspended' && a.founding_seat===null && a.email===null && a.phone===null && a.whatsapp===null));
  const [real] = await sql`select count(*)::int n from agencies where id in ${sql(ownedIds)} and not is_demo`;
  record('No QA actor qualifies for real-provider statistics', real.n===0);
  if (anon) for (const a of qa) record(`Public profile is hidden (${a.locale})`, (await anon.request.get(`${BASE}/${a.locale}/a/${a.handle}`)).status()===404);
}
async function cleanup() {
  if (!created) return;
  // Stop sessions immediately, even when a browser action failed.
  await sql`update users set disabled_at=now() where id in ${sql(userIds)} and consent_version=${'internal-qa-'+run}`;
  await sql`delete from sessions where user_id in ${sql(userIds)}`;
  const rows = await sql`select a.id,a.avatar_key from agencies a join users u on u.id=a.owner_user_id
    where a.id in ${sql(ownedIds)} and u.id in ${sql(userIds)} and u.consent_version=${'internal-qa-'+run} and a.is_demo`;
  assert.equal(rows.length,2,'Cleanup must only touch the exact QA pair');
  const staged = await sql`select key from portfolio_setup_media where agency_id in ${sql(ownedIds)}`;
  const images = await sql`select i.key,i.thumb_key from post_images i join posts p on p.id=i.post_id where p.agency_id in ${sql(ownedIds)}`;
  const keys = [...new Set([...rows.map(a=>a.avatar_key), ...staged.map(a=>a.key), ...images.flatMap(a=>[a.key,a.thumb_key])].filter(Boolean))];
  const allowed = keys.every(key=>ownedIds.some(id=>['avatars','posts','drafts','portfolio/avatars','portfolio/posts'].some(prefix=>key.startsWith(`${prefix}/${id}/`))) && !key.includes('..'));
  assert.ok(allowed,'Never delete a media key outside the QA pair');
  if (!rehearsal && keys.length) {
    const headers = storageHeaders();
    for (const [target,prefixes] of [[bucket,keys.filter(k=>!k.startsWith('drafts/')&&!k.startsWith('portfolio/'))], [privateBucket,keys.filter(k=>k.startsWith('drafts/')||k.startsWith('portfolio/'))]]) {
      if (!prefixes.length) continue;
      const res = await fetch(`${SUPABASE}/storage/v1/object/${encodeURIComponent(target)}`, {method:'DELETE',headers,body:JSON.stringify({prefixes}),signal:AbortSignal.timeout(20_000)});
      assert.ok(res.ok, 'QA file removal must succeed');
    }
  }
  report.cleanup.mediaKeys=keys.length;
  // Financial records must never be produced by this job, even accidentally.
  const [money] = await sql`select count(*)::int as n from contracts where agency_id in ${sql(ownedIds)}`;
  assert.equal(money.n,0,'Stop and retain disabled QA identities if any contract unexpectedly exists');
  const gone=await sql`delete from users where id in ${sql(userIds)} and consent_version=${'internal-qa-'+run} and role='agency' returning id`;
  report.cleanup.deleted=gone.length;
  const [remain]=await sql`select count(*)::int n from agencies where id in ${sql(ownedIds)}`;
  report.cleanup.remaining=remain.n;
  assert.equal(gone.length,2);assert.equal(remain.n,0);
}
async function login(page,a) {
  await page.goto(`${BASE}/en/login`, {waitUntil:'domcontentloaded'});
  await page.locator('#email').fill(a.email);
  await page.locator('#password').fill(a.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/en/studio',{timeout:30_000});
}
async function snap(page,name) {
  await page.screenshot({path:`${out}/${name}.png`});
  record(`No horizontal overflow: ${name}`,await page.evaluate(()=>document.documentElement.scrollWidth <= document.documentElement.clientWidth+1));
}
try {
  if (!rehearsal) {
    report.sourceBefore=await version();
    const p=await json(`${SUPABASE}/storage/v1/bucket/${encodeURIComponent(privateBucket)}`, {headers:storageHeaders()});
    record('Private staging bucket is actually private before any QA upload',p.public===false);
  }
  await provision();
  if (rehearsal) {
    await proveIsolation();
    // Exercise FK cleanup without real data or any network calls.
    await sql`insert into portfolio_setups (agency_id,user_id) values (${qa[0].agencyId},${qa[0].userId})`;
  } else {
    browser=await chromium.launch({headless:true});
    const contexts=[];
    for (const a of qa) {
      const ctx=await browser.newContext({viewport:{width:a.locale==='ar'?390:1440,height:900},reducedMotion:'reduce'});
      await ctx.addInitScript(()=>localStorage.setItem('sw_role','browse'));
      await ctx.route('**/*', async route=>{
        const req=route.request(), url=new URL(req.url());
        if (!['GET','HEAD'].includes(req.method()) && !(url.origin===BASE && /^\/(ar|en)\/(login|portfolio-setup|studio\/collab\/plan)$/.test(url.pathname))) return route.abort();
        return route.continue();
      });
      contexts.push(ctx);
    }
    const anon=await browser.newContext();
    const pages=await Promise.all(contexts.map(ctx=>ctx.newPage()));
    await login(pages[0],qa[0]);await login(pages[1],qa[1]);
    await proveIsolation(anon);
    for (const [i,a] of qa.entries()) {
      const page=pages[i];
      await page.goto(`${BASE}/${a.locale}/portfolio-setup`,{waitUntil:'domcontentloaded'});
      const wizard=page.getByTestId('setup-wizard');
      await wizard.waitFor();
      record(`Ordinary sign-in reaches setup (${a.locale})`,await wizard.getAttribute('data-step')==='1');
      const png=await sharp({create:{width:320,height:240,channels:3,background:i?'#654299':'#197346'}}).png().toBuffer();
      await page.getByTestId('setup-avatar').setInputFiles({name:'synthetic-qa-logo.png',mimeType:'image/png',buffer:png});
      await page.getByTestId('setup-bio').fill('Internal automated QA. Not a service provider.');
      await snap(page,`${a.locale}-profile`);
      await page.getByTestId('setup-profile-save').click();
      await page.waitForFunction(()=>document.querySelector('[data-testid="setup-wizard"]')?.getAttribute('data-step')==='2');
      await page.getByTestId('source-social').click();
      for (const provider of ['google','youtube','instagram','facebook','tiktok']) {
        const card=page.getByTestId(`provider-${provider}`);await card.waitFor();
        const ready=await card.getAttribute('data-ready');
        record(`Honest ${provider} authorization control (${a.locale})`,ready==='true' || await page.getByTestId(`connect-${provider}`).count()===0);
      }
      await snap(page,`${a.locale}-sources`);
      await page.getByTestId('source-upload').click();
      await page.getByTestId('client-mode-private').check();
      await page.getByTestId('setup-client-next').click();
      await page.getByTestId('setup-project-title').fill('Synthetic QA portfolio');
      await page.getByTestId('setup-project-contribution').fill('I created this generated test image solely for internal acceptance.');
      await page.getByTestId('setup-image-input').setInputFiles({name:'synthetic-qa-project.png',mimeType:'image/png',buffer:png});
      const image=page.getByTestId('setup-media').locator('img');await image.waitFor();
      const media=await image.getAttribute('src');
      record(`Staged media uses authenticated route (${a.locale})`,/^\/api\/setup-media\/[0-9a-f-]+$/.test(media??''));
      const own=await contexts[i].request.get(`${BASE}${media}`);
      record(`Owner can read private media (${a.locale})`,own.status()===200 && /private/.test(own.headers()['cache-control']??''));
      record(`Other provider cannot read private media (${a.locale})`,(await contexts[1-i].request.get(`${BASE}${media}`)).status()===404);
      record(`Anonymous visitor cannot read private media (${a.locale})`,(await anon.request.get(`${BASE}${media}`)).status()===404);
      await page.getByTestId('setup-later').click();
      await page.waitForURL(url=>url.pathname===`/${a.locale}/studio`);
      await page.goto(`${BASE}/${a.locale}/portfolio-setup`,{waitUntil:'domcontentloaded'});
      record(`Finish later preserves unsent project text (${a.locale})`,await page.getByTestId('setup-project-title').inputValue()==='Synthetic QA portfolio');
      record(`Uploaded draft survives resume (${a.locale})`,await page.getByTestId('setup-media').locator('img').count()===1);
      await page.getByTestId('setup-project-next').click();
      await page.getByTestId('setup-preview-card').waitFor();
      const [before]=await sql`select count(*)::int n from posts where agency_id=${a.agencyId}`;
      record(`Preview does not publish (${a.locale})`,before.n===0);
      await snap(page,`${a.locale}-preview`);
      await page.getByTestId('setup-rights').check();
      await page.getByTestId('setup-publish').click();
      await page.getByTestId('setup-finished').waitFor({timeout:30_000});
      const made=await sql`select id from posts where agency_id=${a.agencyId}`;
      record(`One explicit project persisted (${a.locale})`,made.length===1);
      await snap(page,`${a.locale}-finished`);
      record(`Synthetic project remains hidden from public visitors (${a.locale})`,(await anon.request.get(`${BASE}/${a.locale}/p/${made[0].id}`)).status()===404);
    }
    await pages[0].goto(`${BASE}/en/studio/collab/plan`,{waitUntil:'domcontentloaded'});
    if (await pages[0].getByTestId('collab-plan').count()) {
      await pages[0].locator('#pl-title').fill('Synthetic QA plan — no outreach');
      await pages[0].getByTestId('plan-template-shoot').click();
      await pages[0].locator('#pl-scope').fill('Synthetic test of a private draft for generated sample images. No real client.');
      // Do not request an external assistant even when configured.
      const assistant=pages[0].getByTestId('plan-assistant');
      if (await assistant.count() && await assistant.isChecked()) await assistant.uncheck();
      await pages[0].getByTestId('plan-submit').click();
      await pages[0].getByTestId('plan-view').waitFor();
      const planUrl=pages[0].url();
      const [plan]=await sql`select assistant_requested from collab_plans where agency_id=${qa[0].agencyId}`;
      record('Signed-in planner creates a non-AI draft without outreach',plan?.assistant_requested===false);
      const foreign=await contexts[1].request.get(planUrl);
      record('Another provider cannot read the private plan',foreign.status()===404 || foreign.status()===403);
      await snap(pages[0],'en-private-plan');
    } else report.limitations.push('Planner was not enabled by the actual launch policy; no switch was changed to test it.');
    await proveIsolation(anon);
    report.sourceAfter=await version();
    await anon.close();
  }
} catch(error) {
  // Never retain request headers, cookies, SQL parameters or credentials.
  let message=String(error?.message??'unknown');
  for (const secret of [dbUrl,process.env.SUPABASE_SERVICE_ROLE_KEY,...qa.map(a=>a.password)].filter(Boolean)) message=message.replaceAll(secret,'[redacted]');
  report.errors.push({stage:'acceptance',message:message.slice(0,500)});
} finally {
  await browser?.close().catch(()=>{});
  try {await cleanup();} catch {report.errors.push({stage:'cleanup',message:'Cleanup did not fully complete; the QA identities were disabled where possible. Inspect the bounded cleanup operation.'});}
  await sql.end();
  report.finishedAt=new Date().toISOString();
  report.passed=report.errors.length===0 && report.cleanup.deleted===2 && report.cleanup.remaining===0;
  await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  if (!report.passed) process.exitCode=1;
}
