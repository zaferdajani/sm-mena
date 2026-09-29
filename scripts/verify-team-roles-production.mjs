// Read-only production UI inspection. Never submit registration, create records,
// enter credentials, upload assets, or alter production settings.
import { chromium, webkit, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const ORIGIN = 'https://sawwiq.org';
const expected = process.env.EXPECTED_COMMIT;
if (!/^[a-f0-9]{40}$/.test(expected ?? '')) throw new Error('Expected merged production SHA is required');
const dir = 'team-role-production-evidence';
await mkdir(dir, { recursive: true });
const report = { origin: ORIGIN, expected, startedAt: new Date().toISOString(), release: null, pages: [], failures: [], runtimeErrors: [] };
async function persist() { await writeFile(`${dir}/verification.json`, JSON.stringify(report, null, 2)); }
async function version() {
  const res = await fetch(`${ORIGIN}/api/version?roleProof=${Date.now()}`, { signal: AbortSignal.timeout(30000), headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`Version HTTP ${res.status}`);
  return res.json();
}
try {
  for (let i = 0; i < 20; i++) {
    report.release = await version();
    if (report.release.commit === expected) break;
    await new Promise((r) => setTimeout(r, 15000));
  }
  expect(report.release.commit).toBe(expected);
  expect(report.release.environment).toBe('production');
  expect(report.release.launchPhase).toBe('registration');
  for (const [name, engine, width] of [['chromium-mobile', chromium, 390], ['chromium-desktop', chromium, 1440], ['webkit-mobile', webkit, 390]]) {
    const browser = await engine.launch();
    const context = await browser.newContext({ baseURL: ORIGIN, viewport: { width, height: 900 }, reducedMotion: 'reduce', locale: 'en-US' });
    const page = await context.newPage();
    page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(60000);
    page.on('pageerror', (e) => report.runtimeErrors.push({ engine: name, message: String(e) }));
    for (const locale of ['ar', 'en']) {
      try {
        const res = await page.goto(`/${locale}/join`, { waitUntil: 'networkidle' });
        expect(res?.status()).toBe(200);
        await expect(page.getByTestId('registration-join-notice')).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
        const box = page.getByTestId('role-picker-teamRoles');
        await expect(box).toHaveAttribute('data-ready', 'true');
        await expect(box).toContainText(locale === 'ar' ? 'مختص SEO' : 'SEO specialist');
        await expect(box).not.toContainText('مختص سيو');
        const input = box.getByRole('combobox');
        await input.fill('SEO'); await input.press('Enter');
        await expect(box.locator('input[value="seo_specialist"]')).toBeChecked();
        await input.fill('سيو');
        await expect(box.getByRole('option').first()).toHaveAttribute('aria-disabled', 'true');
        await input.press('Enter');
        await expect(box.locator('input[value="seo_specialist"]:checked')).toHaveCount(1);
        await expect(box.getByTestId('role-create')).toHaveCount(0);
        await input.fill('SEO for restaurants');
        await expect(box.getByRole('option').first()).toContainText('SEO');
        await expect(box.getByTestId('role-create')).toHaveCount(0);
        await box.getByTestId('role-distinct').click();
        await box.getByTestId('role-create').click();
        await expect(box.locator('input[value="custom:SEO for restaurants"]')).toBeChecked();
        await input.fill('seo FOR restaurants');
        await expect(box.getByTestId('role-create')).toHaveCount(0);
        await input.fill('');
        await page.evaluate(() => document.fonts.ready);
        const metrics = await page.evaluate(() => ({ font: getComputedStyle(document.body).fontFamily, width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
        expect(metrics.font.toLowerCase()).toContain('noto');
        expect(metrics.width).toBeLessThanOrEqual(metrics.viewport + 1);
        await page.getByTestId('team-fields').screenshot({ path: `${dir}/${name}-${locale}-team-roles.png`, animations: 'disabled' });
        report.pages.push({ engine: name, locale, url: page.url(), ...metrics, passed: true });
      } catch (e) {
        report.failures.push({ engine: name, locale, url: page.url(), message: String(e) });
        await page.screenshot({ path: `${dir}/failure-${name}-${locale}.png`, fullPage: true }).catch(() => {});
      }
      await persist();
    }
    await context.close(); await browser.close();
  }
  const after = await version();
  expect(after.commit).toBe(expected);
} catch (e) { report.failures.push({ stage: 'release verification', message: String(e) }); }
report.finishedAt = new Date().toISOString();
report.ok = report.failures.length === 0 && report.runtimeErrors.length === 0 && report.pages.length === 6;
await persist();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
