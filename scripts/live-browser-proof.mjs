// Public production observer only. No credentials, database access, form writes or media mocks.
import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';

const BASE = 'https://sawwiq.org';
const OUT = 'live-browser-proof';
await fs.mkdir(OUT, { recursive: true });
const report = {
  checkedAt: new Date().toISOString(), observerSha: process.env.GITHUB_SHA ?? null,
  publicOnly: true, mediaMocked: false, cases: [], guards: [], errors: [],
  limits: [
    'Mobile is browser/device emulation, not a physical iPhone or Android certification.',
    'Natural-visit cases emulate a non-WebDriver visitor only for the existing intro eligibility gate; native media APIs, clocks and media responses are unmodified.',
    'Non-GET/HEAD requests are blocked; no forms, analytics writes, messages or paid actions are submitted.',
    'Authenticated acceptance is not performed by this public observer.'
  ]
};
async function version() {
  const res = await fetch(`${BASE}/api/version`, { cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`version_http_${res.status}`);
  const v = await res.json();
  if (!/^[a-f0-9]{40}$/.test(v.commit ?? '') || v.environment !== 'production') throw new Error('version_identity_invalid');
  return { commit: v.commit, revision: v.revision, environment: v.environment };
}
function observe({ natural }) {
  if (natural) Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => false });
  const p = window.__sawwiqProof = { shown: false, played: false, ended: false, maxTime: 0, decodedFrames: 0, callbacks: 0, duration: null, dimensions: null, layoutObserved: false, fitOK: true, boundsOK: true, events: [], samples: [], mediaError: null };
  let video;
  function sample() {
    const el = document.querySelector('[data-testid="intro-sting"]');
    if (el && !el.hidden && getComputedStyle(el).display !== 'none' && getComputedStyle(el).opacity !== '0') p.shown = true;
    const v = el?.querySelector('video');
    if (!video && v) {
      video = v;
      for (const event of ['loadedmetadata', 'loadeddata', 'playing', 'ended', 'error', 'stalled', 'pause']) {
        video.addEventListener(event, () => {
          p.events.push({ event, ms: Math.round(performance.now()), at: Number.isFinite(video.currentTime) ? video.currentTime : null });
          if (event === 'playing') p.played = true;
          if (event === 'ended') p.ended = true;
          if (event === 'error') p.mediaError = video.error?.code ?? -1;
        });
      }
      if ('requestVideoFrameCallback' in video) {
        const frame = () => { p.callbacks++; if (video.isConnected) video.requestVideoFrameCallback(frame); };
        video.requestVideoFrameCallback(frame);
      }
    }
    if (!video) return;
    p.maxTime = Math.max(p.maxTime, video.currentTime || 0);
    p.duration = Number.isFinite(video.duration) ? video.duration : null;
    p.dimensions = { width: video.videoWidth, height: video.videoHeight };
    const quality = video.getVideoPlaybackQuality?.();
    p.decodedFrames = Math.max(p.decodedFrames, quality?.totalVideoFrames ?? 0);
    if (video.currentTime > 0.05 && video.isConnected && video.readyState >= 2) {
      const r = video.getBoundingClientRect();
      const css = getComputedStyle(video);
      if (r.width > 0 && r.height > 0) {
        p.layoutObserved = true;
        p.fitOK &&= css.objectFit === 'contain';
        p.boundsOK &&= r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
        p.layout = { x: r.x, y: r.y, width: r.width, height: r.height, fit: css.objectFit, muted: video.muted };
      }
    }
    if (p.samples.length < 80) p.samples.push({ ms: Math.round(performance.now()), time: video.currentTime, readyState: video.readyState });
  }
  sample();
  const timer = setInterval(sample, 80);
  setTimeout(() => { sample(); clearInterval(timer); }, 15000);
}
async function readonly(context, row) {
  row.blockedWrites = 0;
  await context.route('**/*', async (route) => {
    if (!['GET', 'HEAD'].includes(route.request().method())) { row.blockedWrites++; return route.abort('blockedbyclient'); }
    return route.continue();
  });
}
try {
  report.startVersion = await version();
  for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
    let browser;
    try { browser = await type.launch({ headless: true }); }
    catch { report.errors.push({ stage: engine, reason: 'browser_launch_failed' }); continue; }
    const cases = [];
    for (const locale of ['ar', 'en']) {
      for (const width of engine === 'chromium' ? [390, 1440] : [390]) cases.push({ locale, width, mode: 'natural', natural: true });
    }
    if (engine === 'chromium') {
      cases.push({ locale: 'en', width: 1440, mode: 'forced', natural: false });
      cases.push({ locale: 'en', width: 390, mode: 'reduced-motion', natural: true });
    }
    for (const c of cases) {
      const name = `${engine}-${c.width}-${c.locale}-${c.mode}`;
      const row = { ...c, engine, name, passed: false, mediaResponses: [], javascriptErrors: [] };
      report.cases.push(row);
      const context = await browser.newContext({ viewport: { width: c.width, height: c.width < 600 ? 844 : 900 }, isMobile: c.width < 600, hasTouch: c.width < 600, deviceScaleFactor: 1, locale: c.locale === 'ar' ? 'ar-JO' : 'en-US', timezoneId: 'Asia/Amman', reducedMotion: c.mode === 'reduced-motion' ? 'reduce' : 'no-preference', serviceWorkers: 'block', recordVideo: { dir: `${OUT}/videos`, size: { width: c.width, height: c.width < 600 ? 844 : 900 } } });
      await readonly(context, row);
      await context.addInitScript(observe, { natural: c.natural });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', e => { if (row.javascriptErrors.length < 8) row.javascriptErrors.push({ name: e.name }); });
      page.on('response', r => { const u = new URL(r.url()); if (u.origin === BASE && /^\/assets\/brand\/intro\/.*\.(mp4|webm)$/.test(u.pathname)) row.mediaResponses.push({ path: u.pathname, status: r.status(), type: r.headers()['content-type'] ?? null }); });
      try {
        row.route = `/${c.locale}${c.mode === 'natural' ? '' : '?intro=1'}`;
        const res = await page.goto(`${BASE}${row.route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        row.http = res?.status();
        if (c.mode !== 'reduced-motion') {
          await page.waitForFunction(() => window.__sawwiqProof?.maxTime > 0.25, null, { timeout: 10000 }).catch(() => {});
          await page.screenshot({ path: `${OUT}/${name}-playback.png` });
          await page.waitForFunction(() => window.__sawwiqProof?.ended, null, { timeout: 10000 }).catch(() => {});
        } else { await page.waitForTimeout(1600); }
        await page.waitForTimeout(400);
        row.observed = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="intro-sting"]');
          const stamps = [...document.querySelectorAll('[data-testid="release-stamp"]')].map(x => ({ sha: x.getAttribute('data-release-sha'), revision: x.getAttribute('data-ui-revision'), environment: x.getAttribute('data-release-environment') }));
          return { ...window.__sawwiqProof, released: (!el || el.hidden || getComputedStyle(el).display === 'none') && document.documentElement.dataset.intro !== 'playing' && !document.querySelector('.sw')?.inert, direction: document.documentElement.dir, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, stamps };
        });
        const p = row.observed;
        const identity = p.stamps.length > 0 && p.stamps.every(s => s.sha === report.startVersion.commit && s.revision === report.startVersion.revision && s.environment === 'production');
        row.checks = { identity, direction: p.direction === (c.locale === 'ar' ? 'rtl' : 'ltr'), released: p.released, noHorizontalOverflow: !p.overflow };
        if (c.mode === 'reduced-motion') row.checks.motionRespected = !p.shown && p.maxTime === 0 && !p.played;
        else Object.assign(row.checks, { shown: p.shown, nativeDecoded: p.played && (p.decodedFrames > 0 || p.callbacks > 0) && p.dimensions?.width > 0, ended: p.ended, progressed: p.maxTime > 0.25, fitsViewport: p.layoutObserved && p.fitOK && p.boundsOK, mediaHTTP: row.mediaResponses.some(r => [200, 206].includes(r.status)), noMediaError: p.mediaError === null });
        row.passed = row.http === 200 && Object.values(row.checks).every(v => v === true);
        await page.screenshot({ path: `${OUT}/${name}-finished.png` });
      } catch (e) { row.failure = { type: e.name, stage: 'public_browser_observation' }; await page.screenshot({ path: `${OUT}/${name}-error.png` }).catch(() => {}); }
      finally { await context.close(); }
      console.log(JSON.stringify({ case: name, passed: row.passed, checks: row.checks, media: row.mediaResponses, failure: row.failure }));
    }
    await browser.close();
  }
  report.endVersion = await version();
  report.sourceStable = JSON.stringify(report.startVersion) === JSON.stringify(report.endVersion);
} catch (e) { report.errors.push({ stage: 'observer', type: e.name, reason: /^version_/.test(e.message) ? e.message : 'observation_failed' }); }
report.finishedAt = new Date().toISOString();
report.passed = report.cases.length === 8 && report.cases.every(c => c.passed) && report.sourceStable === true && report.errors.length === 0;
await fs.writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, live: report.startVersion, sourceStable: report.sourceStable, errors: report.errors }));
if (!report.passed) process.exitCode = 1;
