import { expect, test, type Page } from "@playwright/test";
import { DEMO_AGENCY, login } from "./helpers";

// QA M-03, L-04, L-05, L-06: hardening headers on every response, and a Content-Security-Policy that the
// site's own pages never trip (a violation would mean a blocked script, image, video or embed).

function watchViolations(page: Page) {
  const seen: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to (load|execute|frame|connect|apply)/i.test(m.text())) seen.push(m.text());
  });
  return seen;
}

test("pages send the hardening headers and no banner or locale cookie", async ({ request }) => {
  const res = await request.get("/ar");
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("includeSubDomains");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(h["permissions-policy"]).toContain("camera=(self)");
  expect(h["x-powered-by"]).toBeUndefined();
  expect(h["set-cookie"] ?? "").not.toContain("NEXT_LOCALE");
  const icon = await request.get("/favicon.ico");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/");
  expect(await (await request.get("/api/health")).json()).toEqual({ ok: true });
});

test("public pages and the Studio load without a policy violation", async ({ page }) => {
  const seen = watchViolations(page);
  for (const path of ["/ar", "/en", "/ar/explore", "/ar/join", `/ar/a/${DEMO_AGENCY.handle}`]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  await login(page, DEMO_AGENCY.email, DEMO_AGENCY.password);
  for (const path of ["/ar/studio", "/ar/studio/profile", "/ar/studio/contracts/new"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(seen).toEqual([]);
});
