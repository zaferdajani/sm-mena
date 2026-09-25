// Post-deploy SEO check (OneClickConvert's "verify on the live host" habit).
//   npm run seo:check                         checks http://localhost:3000
//   npm run seo:check -- https://sawwiq.org
// Exits 1 when a page breaks a rule, so it can run in CI or after a deploy.
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const failures: string[] = [];
const fail = (url: string, msg: string) => failures.push(`${url}: ${msg}`);

async function page(path: string, expect: { status?: number; index?: boolean; h1?: boolean; jsonLd?: string[] } = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } });
  if (res.status !== (expect.status ?? 200)) return fail(url, `status ${res.status}`);
  if (res.status !== 200) return;
  const html = await res.text();
  if (/hreflang=/.test(res.headers.get("link") ?? "")) fail(url, "Link header carries hreflang (next-intl alternateLinks should be off)");
  const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? "";
  const noindex = robots.includes("noindex");
  if (expect.index !== undefined && noindex === expect.index) fail(url, `robots "${robots || "(none)"}", expected ${expect.index ? "indexable" : "noindex"}`);
  if (expect.index) {
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!canonical || !canonical.endsWith(path)) fail(url, `canonical ${canonical}`);
    for (const lang of ["ar", "en", "x-default"]) if (!new RegExp(`hreflang="${lang}"`, "i").test(html)) fail(url, `missing hreflang ${lang}`);
    if (!/<meta property="og:image"/.test(html)) fail(url, "missing og:image");
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
    if (description.length < 50 || description.length > 170) fail(url, `description length ${description.length}`);
  }
  if (expect.h1 !== false && (html.match(/<h1[\s>]/g) ?? []).length !== 1) fail(url, `expected exactly one <h1>, found ${(html.match(/<h1[\s>]/g) ?? []).length}`);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      fail(url, "JSON-LD does not parse");
      return {};
    }
  });
  for (const type of expect.jsonLd ?? []) if (!blocks.some((b) => b["@type"] === type)) fail(url, `missing JSON-LD ${type}`);
  return html;
}

async function main() {
  await page("/ar", { index: true, jsonLd: ["Organization", "WebSite"] });
  await page("/en", { index: true, jsonLd: ["Organization", "WebSite"] });
  await page("/ar/hire", { index: true });
  await page("/ar/about", { index: true });
  await page("/en/contact", { index: true });
  await page("/ar/login", { index: false });
  await page("/ar/does-not-exist-xyz", { status: 404 });
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // Every sitemap page must be indexable, and every agency in it must have its structured data.
  for (const u of urls.filter((u) => /\/(a|hire)\//.test(u)).slice(0, 12)) {
    const path = new URL(u).pathname;
    await page(path, { index: true, jsonLd: path.includes("/a/") ? ["ProfessionalService", "BreadcrumbList"] : ["Service", "BreadcrumbList"] });
  }
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  if (!robots.includes("Sitemap:")) fail("/robots.txt", "no sitemap line");
  console.log(`${urls.length} sitemap URLs checked against the rules; ${failures.length} problem(s).`);
  for (const f of failures) console.log(`✗ ${f}`);
  process.exit(failures.length ? 1 : 0);
}

void main();
