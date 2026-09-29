import { chromium, webkit, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Read-only public-browser verification. No signup, uploads, database access,
// transactions, marketing messages, or staff credentials are used here.
const ORIGIN = 'https://sawwiq.org';
const expectedCommit = process.env.EXPECTED_COMMIT;
if (!/^[a-f0-9]{40}$/.test(expectedCommit ?? '')) throw new Error('Expected production commit is required');
const out = 'registration-production-evidence';
await mkdir(out, { recursive: true });
const evidence = { origin: ORIGIN, expectedCommit, startedAt: new Date().toISOString(), release: null, health: null, pages: [], interactions: [], errors: [], runtimeErrors: [] };
const save = () => writeFile(`${out}/verification.json`, JSON.stringify(evidence, null, 2));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function check(label, action) {
  try { await action(); evidence.interactions.push({ label, passed: true }); }
  catch (error) { evidence.errors.push({ label, error: String(error) }); }
  await save();
}
async function jsonGet(path) {
  const response = await fetch(`${ORIGIN}${path}`, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
try {
  for (let attempt = 0; attempt < 12; attempt++) {
    evidence.release = await jsonGet(`/api/version?verify=${Date.now()}`);
    if (evidence.release.commit === expectedCommit) break;
    await wait(15000);
  }
  expect(evidence.release.commit).toBe(expectedCommit);
  expect(evidence.release.environment).toBe('production');
  expect(evidence.release.revision).toBe('registration-2026-09-29-v1');
  expect(evidence.release.launchPhase).toBe('registration');
  evidence.health = await jsonGet('/api/health');
  expect(evidence.health.ok).toBe(true);
  await save();

  async function snapshot(page, label) {
    await page.evaluate(() => document.fonts.ready);
    const logo = page.getByTestId('brand-lockup').filter({ visible: true }).first();
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page.locator('body')).not.toContainText(/MISSING_MESSAGE|INTERNAL_SERVER_ERROR/);
    const metrics = await page.evaluate(() => ({
      title: document.title, direction: document.documentElement.dir,
      phase: document.querySelector('[data-launch-phase]')?.getAttribute('data-launch-phase'),
      font: getComputedStyle(document.body).fontFamily,
      loadedNoto: [...document.fonts].some((f) => f.status === 'loaded' && f.family.toLowerCase().includes('noto')),
      width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
      color: getComputedStyle(document.body).backgroundColor,
      visibleBrokenImages: [...document.images].filter((img) => {
        const b = img.getBoundingClientRect();
        return b.width && b.height && b.top < innerHeight && b.bottom > 0 && (!img.complete || !img.naturalWidth);
      }).map((img) => img.getAttribute('src')),
    }));
    expect(metrics.font.toLowerCase()).toContain('noto');
    expect(metrics.loadedNoto).toBe(true);
    expect(metrics.width).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.visibleBrokenImages).toEqual([]);
    const filename = `${label}.png`;
    await page.screenshot({ path: `${out}/${filename}`, fullPage: true, animations: 'disabled' });
    evidence.pages.push({ label, url: page.url(), ...metrics, screenshot: filename });
    await save();
  }

  for (const [engineName, engine, widths] of [['chromium', chromium, [390, 1440]], ['webkit', webkit, [390]]]) {
    const browser = await engine.launch();
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: 'en-US', reducedMotion: 'reduce', baseURL: ORIGIN });
      const page = await context.newPage();
      page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(60000);
      page.on('pageerror', (error) => evidence.runtimeErrors.push({ engineName, width, url: page.url(), error: String(error) }));
      for (const route of ['/ar', '/en', '/ar/soon', '/ar/examples', '/ar/examples?kind=freelancer', '/en/examples?kind=freelancer&tab=services', '/ar/join', '/en/start']) {
        const label = `${engineName}-${width}-${route.replaceAll(/[^a-z]/gi, '-')}`;
        await check(label, async () => {
          const response = await page.goto(route, { waitUntil: 'networkidle' });
          expect(response?.status()).toBe(200);
          await expect(page.locator('html')).toHaveAttribute('dir', route.startsWith('/ar') ? 'rtl' : 'ltr');
          if (['/ar', '/en', '/ar/soon'].includes(route)) {
            await expect(page.getByTestId('registration-page')).toBeVisible();
            await expect(page.locator('body')).not.toContainText(/0%|7%|#00|million|مليون/);
            await expect(page.locator('a[href$="/explore"],a[href$="/feed"],a[href$="/hire"],a[href$="/match"]')).toHaveCount(0);
          }
          if (route.includes('/examples')) {
            await expect(page.getByTestId('example-page')).toBeVisible();
            await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
            await expect(page.getByTestId('follower-count')).toHaveCount(0);
            await expect(page.getByTestId('post-count')).toHaveCount(0);
          }
          await snapshot(page, label);
        });
      }
      if (width === 390) {
        await check(`${engineName}-markets-language-theme-join`, async () => {
          await page.goto('/ar', { waitUntil: 'networkidle' });
          const picker = page.getByTestId('country-picker').locator('select');
          const markets = engineName === 'chromium' ? ['sa', 'eg', 'jo', 'ae', 'kw', 'qa', 'bh', 'om', 'sa'] : ['sa'];
          for (const country of markets) {
            await expect(picker).toBeEnabled();
            await picker.selectOption(country);
            await expect(page.getByTestId('registration-page')).toHaveAttribute('data-country', country);
            await expect(picker).toHaveValue(country);
          }
          await expect(page.getByRole('heading', { level: 1 })).toContainText('وخلك معنا');
          await snapshot(page, `${engineName}-saudi-registration`);
          await page.getByTestId('locale-switcher').click();
          await expect(page).toHaveURL(`${ORIGIN}/en`);
          await expect(page.getByTestId('registration-page')).toHaveAttribute('data-country', 'sa');
          await page.waitForLoadState('networkidle');
          await page.getByTestId('theme-toggle').click();
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
          await page.reload({ waitUntil: 'networkidle' });
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
          await snapshot(page, `${engineName}-english-dark`);
          await page.getByTestId('registration-cta').first().click();
          await expect(page).toHaveURL(`${ORIGIN}/en/join`);
          await expect(page.getByTestId('registration-join-notice')).toBeVisible();
          await expect(page.locator('input[type="email"]').first()).toBeVisible();
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
          await snapshot(page, `${engineName}-join-from-campaign`);
        });
      }
      if (engineName === 'chromium' && width === 1440) {
        await check('public-directory-entries-close-at-route-boundary', async () => {
          for (const route of ['/ar/explore', '/ar/feed', '/ar/hire', '/ar/hire/photography', '/ar/match', '/ar/who-runs', '/ar/sawwiq50']) {
            await page.goto(route);
            await expect(page).toHaveURL(`${ORIGIN}/ar/soon`);
            await expect(page.getByTestId('registration-page')).toBeVisible();
          }
        });
        await check('public-demo-is-labelled-example-not-member-directory', async () => {
          await page.goto('/ar/demo', { waitUntil: 'networkidle' });
          await expect(page).toHaveURL(`${ORIGIN}/ar/examples`);
          await page.getByTestId('example-freelancer').click();
          for (const tab of ['services', 'about', 'work']) {
            await page.getByTestId(`example-tab-${tab}`).click();
            await expect(page.getByTestId(`example-tab-${tab}`)).toHaveAttribute('aria-current', 'page');
          }
        });
        await check('legacy-published-link-is-preserved-but-not-indexed', async () => {
          const response = await page.goto('/ar/a/mahaalbashiti', { waitUntil: 'networkidle' });
          expect(response?.status()).toBe(200);
          await expect(page.getByTestId('provider-profile-header')).toBeVisible();
          await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
          await snapshot(page, 'legacy-profile-link-preserved');
        });
        await check('320px-registration-and-demo-fit', async () => {
          await page.setViewportSize({ width: 320, height: 900 });
          for (const route of ['/ar', '/ar/examples?kind=freelancer&tab=services', '/ar/join']) {
            await page.goto(route, { waitUntil: 'networkidle' });
            await snapshot(page, `chromium-320-${route.replaceAll(/[^a-z]/gi, '-')}`);
          }
        });
      }
      await context.close();
    }
    await browser.close();
  }
  await check('sitemap-and-ai-summary-do-not-list-members', async () => {
    const sitemap = await fetch(`${ORIGIN}/sitemap.xml`, { signal: AbortSignal.timeout(30000) });
    expect(sitemap.ok).toBe(true);
    expect(await sitemap.text()).not.toMatch(/\/a\/|\/p\/|\/hire|\/explore|\/examples/);
    const llms = await fetch(`${ORIGIN}/llms.txt`, { signal: AbortSignal.timeout(30000) });
    expect(llms.ok).toBe(true);
    const text = await llms.text(); expect(text).toContain('registration');
    expect(text).not.toMatch(/mahaalbashiti|meerobox/);
  });
} catch (error) { evidence.errors.push({ label: 'release identity or audit', error: String(error) }); }
evidence.finishedAt = new Date().toISOString();
evidence.ok = evidence.errors.length === 0 && evidence.runtimeErrors.length === 0;
await save();
console.log(JSON.stringify({ ok: evidence.ok, release: evidence.release, pageConfigurations: evidence.pages.length, checks: evidence.interactions.length, errors: evidence.errors, runtimeErrors: evidence.runtimeErrors }, null, 2));
if (!evidence.ok) process.exitCode = 1;
