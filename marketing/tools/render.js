// usage: node render.js file.html out.png W H   (or a JSON list via --batch jobs.json)
const { chromium } = require('playwright-core');
(async () => {
  const args = process.argv.slice(2);
  let jobs = [];
  if (args[0] === '--batch') jobs = require(require('path').resolve(args[1]));
  else jobs = [{ html: args[0], out: args[1], w: +args[2], h: +args[3] }];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const j of jobs) {
    await page.setViewportSize({ width: j.w, height: j.h });
    await page.goto('file://' + require('path').resolve(j.html) + (j.q || ''), { waitUntil: 'networkidle' });
    await page.evaluate(async () => { const t = 'sawwiq.org Aa1 سوّق'; for (const f of ['500 30px "Readex Pro"','700 30px "Readex Pro"','600 30px "Readex Pro"','400 30px "IBM Plex Sans Arabic"','500 30px "IBM Plex Sans Arabic"','600 30px "IBM Plex Sans Arabic"','700 30px "IBM Plex Sans Arabic"']) { try { await document.fonts.load(f, t); } catch (e) {} } await document.fonts.ready; });
    await page.waitForTimeout(150);
    await page.screenshot({ omitBackground: !!j.transparent, path: j.out, type: j.out.endsWith('.jpg') ? 'jpeg' : 'png', quality: j.out.endsWith('.jpg') ? 90 : undefined });
    console.log('ok', j.out);
  }
  await browser.close();
})();
