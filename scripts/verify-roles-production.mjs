import { chromium, webkit, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Public form-only checks. Do not submit signup or create production records.
const origin = 'https://sawwiq.org';
const expected = process.env.EXPECTED_COMMIT;
if (!/^[a-f0-9]{40}$/.test(expected ?? '')) throw new Error('Expected merge SHA required');
const out = 'role-production-evidence';
await mkdir(out, { recursive: true });
const report = { expectedCommit: expected, startedAt: new Date().toISOString(), release: null, checks: [], errors: [], runtimeErrors: [] };
const save = () => writeFile(`${out}/verification.json`, JSON.stringify(report, null, 2));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch(`${origin}/api/version?rolecheck=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Version: ${response.status}`);
    report.release = await response.json();
    if (report.release.commit === expected) break;
    await delay(15000);
  }
  expect(report.release.commit).toBe(expected);
  expect(report.release.environment).toBe('production');
  for (const [name, engine, widths] of [['chromium', chromium, [390, 1440]], ['webkit', webkit, [390]]]) {
    const browser = await engine.launch();
    for (const width of widths) for (const locale of ['ar', 'en']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: 'en-US', reducedMotion: 'reduce' });
      await context.addCookies([{ name: 'sw_country', value: 'sa', url: origin }]);
      const page = await context.newPage();
      page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(60000);
      page.on('pageerror', (error) => report.runtimeErrors.push({ engine: name, width, locale, error: String(error) }));
      const label = `${name}-${width}-${locale}`;
      try {
        const response = await page.goto(`${origin}/${locale}/join`, { waitUntil: 'networkidle' });
        expect(response?.status()).toBe(200);
        await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
        const roles = page.getByTestId('role-picker-teamRoles');
        await expect(roles).toBeVisible();
        await expect(roles).toContainText(locale === 'ar' ? 'مختص SEO' : 'SEO specialist');
        await expect(roles).not.toContainText('مختص سيو');
        const query = roles.getByRole('combobox');
        await query.fill('سيو');
        await expect(roles.getByRole('option').first()).toContainText('SEO');
        await expect(roles.getByTestId('role-create')).toHaveCount(0);
        await query.press('Enter');
        await expect(roles.locator('input[value="seo_specialist"]')).toBeChecked();
        await query.fill('seo');
        await expect(roles.getByRole('option').first()).toHaveAttribute('aria-disabled', 'true');
        await query.press('Enter');
        await expect(roles.locator('input[value="seo_specialist"]:checked')).toHaveCount(1);
        await query.fill('drone');
        await query.press('ArrowDown'); await query.press('Enter');
        await expect(roles.locator('input[value="drone_operator"]')).toBeChecked();
        await query.fill('SEO for restaurants');
        await expect(roles.getByTestId('role-create')).toHaveCount(0);
        await roles.getByTestId('role-distinct').click();
        await expect(roles.getByTestId('role-create')).toBeVisible();
        await roles.getByTestId('role-create').click();
        await expect(roles.locator('input[value="custom:SEO for restaurants"]')).toBeChecked();
        await query.fill('seo FOR restaurants');
        await expect(roles.getByTestId('role-create')).toHaveCount(0);
        await query.fill('');
        await page.getByTestId('kind-freelancer').check();
        await expect(roles.locator('input[value="custom:SEO for restaurants"]')).toBeChecked();
        const metrics = await page.evaluate(async () => {
          await document.fonts.ready;
          return { font: getComputedStyle(document.body).fontFamily, width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth };
        });
        expect(metrics.font.toLowerCase()).toContain('noto');
        expect(metrics.width).toBeLessThanOrEqual(metrics.viewport + 1);
        await roles.screenshot({ path: `${out}/${label}-roles.png`, animations: 'disabled' });
        report.checks.push({ label, ok: true, url: page.url(), ...metrics, screenshot: `${label}-roles.png` });
      } catch (error) {
        report.errors.push({ label, error: String(error) });
        await page.screenshot({ path: `${out}/${label}-failure.png`, fullPage: true }).catch(() => {});
      } finally { await save(); await context.close(); }
    }
    await browser.close();
  }
} catch (error) { report.errors.push({ label: 'release-check', error: String(error) }); }
report.ok = report.errors.length === 0 && report.runtimeErrors.length === 0;
report.finishedAt = new Date().toISOString();
await save();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
