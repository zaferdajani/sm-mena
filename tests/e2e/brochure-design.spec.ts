import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ADMIN, DEMO_AGENCY, login } from "./helpers";

async function visualContract(page: Page, info: TestInfo, label: string, dark: boolean) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveAttribute("data-design-system", "brochure-v1");
  const observed = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const font = getComputedStyle(document.body).fontFamily;
    const headings = [...document.querySelectorAll("h1,h2,h3")].map((e) => getComputedStyle(e).fontFamily);
    return { font, headings, paper: root.getPropertyValue("--background").trim(), viewport: document.documentElement.clientWidth, width: document.documentElement.scrollWidth };
  });
  expect(observed.font.toLowerCase()).toContain("noto");
  for (const heading of observed.headings) expect(heading.toLowerCase()).toContain("noto");
  expect(observed.paper.toLowerCase()).toBe(dark ? "#10241d" : "#f8f6ef");
  expect(observed.width, `overflow on ${page.url()}`).toBeLessThanOrEqual(observed.viewport + 1);
  const visibleLogo = page.getByTestId("brand-lockup").filter({ visible: true }).first();
  if (await visibleLogo.count()) {
    await expect(visibleLogo.locator("img")).toHaveAttribute("src", /mark-192/);
    expect(await visibleLogo.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await info.attach(`${label}-${info.project.name}`, { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
}

for (const locale of ["ar", "en"]) {
  for (const dark of [false, true]) {
    const theme = dark ? "dark" : "light";
    test(`${locale} ${theme} brochure style across public surfaces`, async ({ page }, info) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1440, height: info.project.name === "mobile" ? 844 : 1000 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((value) => {
        localStorage.setItem("sw_role", "browse");
        if (value) localStorage.setItem("sw_theme", "dark"); else localStorage.removeItem("sw_theme");
      }, dark);
      for (const route of ["?intro=0", "soon", "explore?tab=agencies", `a/${DEMO_AGENCY.handle}`, "hire", "join", "login", "legal"]) {
        const response = await page.goto(`/${locale}/${route}`);
        expect(response?.status(), route).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        await visualContract(page, info, `${locale}-${theme}-${route.replaceAll(/[^a-z]/gi, "-")}`, dark);
      }
    });

    test(`${locale} ${theme} brochure style throughout provider Studio`, async ({ page }, info) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1440, height: 900 });
      await page.addInitScript((value) => {
        if (value) localStorage.setItem("sw_theme", "dark"); else localStorage.removeItem("sw_theme");
      }, dark);
      await login(page, DEMO_AGENCY.email, DEMO_AGENCY.password);
      for (const suffix of ["", "/profile", "/packages", "/opportunities", "/contracts", "/followers", "/security", "/import/behance"]) {
        const response = await page.goto(`/${locale}/studio${suffix}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator('[data-design-surface="workspace"]')).toBeVisible();
        await visualContract(page, info, `${locale}-${theme}-studio-${suffix.replaceAll("/", "-")}`, dark);
      }
    });
  }
}

test("country flag, invitation copy, language and theme remain usable", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.goto("/ar/soon");
  const picker = page.getByTestId("country-picker").locator("select");
  for (const country of ["sa", "eg", "jo", "ae", "kw", "qa", "bh", "om"]) {
    await picker.selectOption(country);
    await expect(page.getByTestId("teaser-page")).toHaveAttribute("data-country", country);
    await expect(picker).toHaveValue(country);
  }
  await picker.selectOption("sa");
  await expect(page.getByTestId("teaser-page")).toHaveAttribute("data-country", "sa");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("نبي");
  await page.getByTestId("locale-switcher").click();
  await expect(page).toHaveURL(/\/en\/soon$/);
  await expect(page.getByTestId("teaser-page")).toHaveAttribute("data-country", "sa");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await visualContract(page, info, "sa-country-language-theme", true);
  await page.getByTestId("teaser-cta").first().click();
  await expect(page).toHaveURL(/\/en\/join$/);
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
});

test("admin uses the same design without changing permissions", async ({ page }, info) => {
  await login(page, ADMIN.email, ADMIN.password);
  for (const route of ["/en/admin", "/ar/admin/agencies"]) {
    await page.goto(route);
    await expect(page.locator('[data-design-surface="workspace"]')).toBeVisible();
    await visualContract(page, info, route.replaceAll("/", "-"), false);
  }
});

test("small-phone invitation and forms wrap rather than clip", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of ["/ar/soon", "/ar/join", `/ar/a/${DEMO_AGENCY.handle}`]) {
    await page.goto(route);
    await visualContract(page, info, `320-${route.replaceAll("/", "-")}`, false);
    if (route.includes("join")) {
      for (const input of await page.locator('[data-slot="input"]').all()) {
        const box = await input.boundingBox();
        if (box) expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});
