import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = 'https://sawwiq.org';
const expected = process.env.EXPECTED_SHA;
assert.match(expected || '', /^[a-f0-9]{40}$/);
const out = 'production-evidence';
await fs.mkdir(out, { recursive: true });
const report = { checkedAt: new Date().toISOString(), expectedCommit: expected, expectedRevision: 'brochure-2026-09-27-v1', release: null, health: null, pages: [], interactions: [], errors: [] };
const json = async (path) => {
  const response = await fetch(`${base}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(45000) });
  assert.equal(response.status, 200, path);
  return response.json();
};
try {
  report.release = await json('/api/version');
  report.health = await json('/api/health');
  assert.equal(report.release.commit, expected, 'Production must serve the exact release commit');
  assert.equal(report.release.revision, report.expectedRevision);
  assert.equal(report.release.environment, 'production');
  assert.equal(report.health.ok, true);
} catch (error) {
  report.errors.push({ stage: 'release', message: String(error) });
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  throw error;
}
const routes = ['/ar?intro=0', '/en?intro=0', '/ar/soon', '/en/soon', '/ar/a/mahaalbashiti', '/en/a/mahaalbashiti', '/ar/a/meerobox', '/en/a/meerobox', '/ar/start', '/en/start', '/ar/join', '/en/join'];
for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true });
  const sizes = engine === 'webkit' ? [390] : [390, 1440];
  for (const width of sizes) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, deviceScaleFactor: 1, locale: 'en-US', reducedMotion: 'reduce' });
    await context.addInitScript(() => { localStorage.setItem('sw_role', 'browse'); localStorage.removeItem('sw_theme'); });
    const list = engine === 'webkit' ? ['/ar?intro=0','/ar/soon','/ar/a/mahaalbashiti','/ar/start','/en/soon','/en/join'] : routes;
    for (const route of list) {
      const page = await context.newPage();
      const name = `${engine}-${width}-${route.replace(/[^a-z0-9]+/gi, '-')}`;
      const row = { name, route, width, engine, status: null, checks: null, pageErrors: [], screenshot: `${name}.png` };
      page.on('pageerror', e => row.pageErrors.push(String(e)));
      try {
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
        row.status = response?.status();
        assert.equal(row.status, 200);
        await page.evaluate(() => document.fonts.ready);
        row.checks = await page.evaluate(() => {
          const root = document.documentElement;
          const css = getComputedStyle(root);
          const marks = [...document.querySelectorAll('[data-testid="brand-lockup"] img')].filter(i => i.getBoundingClientRect().width > 0);
          return {
            design: root.dataset.designSystem,
            direction: root.dir,
            font: getComputedStyle(document.body).fontFamily,
            fonts: [...document.fonts].filter(f => f.status === 'loaded' && /noto/i.test(f.family) && !/fallback/i.test(f.family)).map(f => f.family),
            paper: css.getPropertyValue('--background').trim(),
            pageWidth: root.scrollWidth,
            viewport: root.clientWidth,
            logoLoaded: marks.length > 0 && marks.every(i => i.complete && i.naturalWidth > 0),
            headings: [...document.querySelectorAll('h1')].map(h => h.textContent),
          };
        });
        assert.equal(row.checks.design, 'brochure-v1');
        assert.equal(row.checks.direction, route.startsWith('/ar') ? 'rtl' : 'ltr');
        assert.ok(row.checks.fonts.length > 0, 'Actual Noto web font must be loaded');
        assert.equal(row.checks.paper, '#f8f6ef');
        assert.ok(row.checks.pageWidth <= row.checks.viewport + 1, 'No page-wide horizontal overflow');
        assert.equal(row.checks.logoLoaded, true);
        await page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });
        if (engine === 'chromium' && ['/ar/soon','/ar/a/mahaalbashiti','/ar/join'].includes(route)) {
          await page.screenshot({ path: `${out}/${name}-full.png`, fullPage: true, animations: 'disabled' });
        }
      } catch (error) {
        row.error = String(error);
        report.errors.push({ stage: name, message: String(error) });
        await page.screenshot({ path: `${out}/${name}-error.png` }).catch(() => {});
      }
      if (row.pageErrors.length) report.errors.push({ stage: name, pageErrors: row.pageErrors });
      report.pages.push(row);
      console.log(JSON.stringify({ name, status: row.status, error: row.error, pageErrors: row.pageErrors }));
      await page.close();
    }
    await context.close();
  }
  // Actual clicks, no login and no form submissions. Country/theme changes
  // affect only this anonymous browser session.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('sw_role', 'browse'));
  const page = await context.newPage();
  try {
    await page.goto(`${base}/ar/soon`, { waitUntil: 'networkidle', timeout: 45000 });
    const picker = page.getByTestId('country-picker').locator('select');
    const countries = engine === 'chromium' ? ['sa','eg','jo','ae','kw','qa','bh','om','sa'] : ['sa'];
    for (const country of countries) {
      await picker.selectOption(country);
      await page.waitForFunction(c => document.querySelector('[data-testid="teaser-page"]')?.getAttribute('data-country') === c, country, { timeout: 20000 });
      report.interactions.push({ engine, action: 'country', country, ok: true });
    }
    await page.screenshot({ path: `${out}/${engine}-saudi-invitation.png`, fullPage: true });
    await page.getByTestId('locale-switcher').click();
    await page.waitForURL(`${base}/en/soon`, { waitUntil: 'networkidle', timeout: 45000 });
    assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
    assert.equal(await picker.inputValue(), 'sa');
    report.interactions.push({ engine, action: 'language-country-preserved', ok: true });
    await page.getByTestId('theme-toggle').click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.screenshot({ path: `${out}/${engine}-invitation-dark.png` });
    await page.reload({ waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.getByTestId('teaser-cta').first().click();
    await page.waitForURL(`${base}/en/join`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(await page.locator('input[type="email"]').count() > 0, true);
    await page.screenshot({ path: `${out}/${engine}-registration-dark.png`, fullPage: true });
    await page.goto(`${base}/ar/a/mahaalbashiti`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.screenshot({ path: `${out}/${engine}-profile-dark.png` });
    await page.locator('[data-testid="theme-toggle"]:visible').first().click();
    await page.waitForFunction(() => document.documentElement.dataset.theme !== 'dark');
    report.interactions.push({ engine, action: 'dark-mode-reload-navigation-and-back-to-light', ok: true });
    report.interactions.push({ engine, action: 'registration-cta-arrives-at-form-no-submission', ok: true });
  } catch (error) {
    report.errors.push({ stage: `${engine}-interactions`, message: String(error) });
    await page.screenshot({ path: `${out}/${engine}-interaction-error.png` }).catch(() => {});
  }
  await context.close();
  await browser.close();
}
await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pages: report.pages.length, interactions: report.interactions.length, errors: report.errors.length, release: report.release }));
if (report.errors.length) process.exitCode = 1;
