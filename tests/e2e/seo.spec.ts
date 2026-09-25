import { expect, test } from "@playwright/test";

test("every public page declares its own canonical and language pairs", async ({ page, request }) => {
  await page.goto("/ar/join");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ar\/join$/);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en\/join$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/ar\/join$/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/og\/sawwiq-ar\.jpg$/);
  // hreflang lives in the HTML only: no conflicting Link header.
  const res = await request.get("/ar/hire");
  expect(res.headers().link ?? "").not.toContain("hreflang");
});

test("the home page carries the site's identity and links to the hire hubs", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveTitle("Sawwiq | The first Arabic marketplace for marketing agencies");
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(ld).toContain('"Organization"');
  expect(ld).toContain('"WebSite"');
  await page.goto("/en/feed");
  await expect(page.getByTestId("home-service-link")).toHaveCount(8);
  const footer = page.getByTestId("site-footer");
  await expect(footer.getByRole("link", { name: "Social media management" })).toHaveAttribute("href", "/en/hire/smm_management");
  // The language link opens this same page in Arabic.
  await expect(footer.getByRole("link", { name: "العربية" })).toHaveAttribute("href", "/ar/feed");
  await footer.getByRole("link", { name: "About us" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Sawwiq");
});

test("demo agencies stay out of search results and carry no structured data", async ({ page }) => {
  await page.goto("/en/a/nakhla.studio");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^[^·]+$/); // the name only, no badge text
  await expect(page.getByTestId("demo-notice")).toBeVisible();
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(ld).not.toContain('"ProfessionalService"'); // search engines only hear about real businesses
  expect(ld).not.toContain('"aggregateRating"');
  await expect(page.getByTestId("profile-overview")).toBeVisible(); // packages and reviews on the canonical URL
});

test("answer engines get llms.txt and robots welcomes them", async ({ request }) => {
  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  expect(await llms.text()).toContain("# Sawwiq");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("OAI-SearchBot");
  expect(robots).toContain("Disallow: /ar/admin");
});

test("a missing page offers a way forward", async ({ page }) => {
  const res = await page.goto("/en/nothing-here");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "Hire an agency by service" })).toBeVisible();
});
