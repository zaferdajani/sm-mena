import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ADMIN, DEMO_AGENCY, login, nextJoinStep } from "./helpers";

async function visualContract(page: Page, info: TestInfo, label: string, dark: boolean) {
  await expect(page.locator("html")).toHaveAttribute("data-design-system", "brochure-v1");
  // These are assertions on real page state, not assignments. Streamed root/head
  // content can finish after navigation; wait for the saved theme to be applied.
  if (dark) await expect(page.locator("html"), page.url()).toHaveAttribute("data-theme", "dark");
  else await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", dark ? "rgb(16, 36, 29)" : "rgb(248, 246, 239)");
  await page.evaluate(() => document.fonts.ready);
  const observed = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const font = getComputedStyle(document.body).fontFamily;
    const headings = [...document.querySelectorAll("h1,h2,h3")].map((e) => getComputedStyle(e).fontFamily);
    const loaded = [...document.fonts].filter((f) => f.status === "loaded" && f.family.toLowerCase().includes("noto")).length;
    return { font, headings, loaded, paper: root.getPropertyValue("--background").trim(), viewport: document.documentElement.clientWidth, width: document.documentElement.scrollWidth };
  });
  expect(observed.font.toLowerCase()).toContain("noto");
  expect(observed.loaded, "Noto must load, not merely be named in CSS").toBeGreaterThan(0);
  for (const heading of observed.headings) expect(heading.toLowerCase()).toContain("noto");
  expect(observed.paper.toLowerCase()).toBe(dark ? "#10241d" : "#f8f6ef");
  await info.attach(`${label}-${info.project.name}`, { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  expect(observed.width, `overflow on ${page.url()}`).toBeLessThanOrEqual(observed.viewport + 1);
  const visibleLogo = page.getByTestId("brand-lockup").filter({ visible: true }).first();
  await expect(visibleLogo).toBeVisible();
  await expect(visibleLogo.locator("img")).toHaveAttribute("src", /mark-192/);
  await expect.poll(() => visibleLogo.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
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
      for (const route of ["?intro=0", "soon", "explore?tab=agencies", `a/${DEMO_AGENCY.handle}`, "hire", "start", "join", "signin", "login", "legal"]) {
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
  await page.waitForLoadState("networkidle");
  const picker = page.getByTestId("country-picker").locator("select");
  for (const country of ["sa", "eg", "jo", "ae", "kw", "qa", "bh", "om"]) {
    await expect(picker).toBeEnabled();
    await picker.selectOption(country);
    await expect(page.getByTestId("teaser-page")).toHaveAttribute("data-country", country);
    await expect(picker).toHaveValue(country);
  }
  await picker.selectOption("sa");
  await expect(page.getByTestId("teaser-page")).toHaveAttribute("data-country", "sa");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("نريد");
  await page.getByTestId("locale-switcher").click();
  await expect(page).toHaveURL(/\/en\/soon$/);
  await expect(page.getByTestId("teaser-page")).toHaveAttribute("data-country", "sa");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await visualContract(page, info, "sa-country-language-theme", true);
  await page.getByTestId("teaser-cta").first().click();
  await expect(page).toHaveURL(/\/en\/join$/);
  // Sign-up opens on its first step (name and link); contact details come on the third.
  await expect(page.locator("#name")).toBeVisible();
  await expect(page.getByTestId("join-step-contact")).toBeVisible();
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


test("Swiss registration fields stay contained and phone controls never overlap", async ({ page }) => {
  // Each viewport is an independent first-run journey. Clear the join draft
  // BEFORE hydration on every navigation: clearing storage and then reloading
  // is ineffective because JoinForm's pagehide handler saves it again.
  await page.addInitScript(() => sessionStorage.removeItem("sw:join-draft:v1"));
  for (const locale of ["ar", "en"] as const) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/join`);
      await expect(page.getByTestId("join-form")).toHaveAttribute("data-ready", "true");
      await expect(page.locator("#name")).toBeVisible();
      // Side by side, the name and username inputs line up and share one height
      // (the username's hint once stretched the name field taller and lower).
      const pair = await page.evaluate(() => ["#name", "#handle"].map((s) => document.querySelector(s)!.getBoundingClientRect()).map((r) => ({ top: r.top, left: r.left, height: r.height })));
      if (Math.abs(pair[0].left - pair[1].left) > 1) {
        expect(Math.abs(pair[0].top - pair[1].top), `${locale} ${width}: name and username tops`).toBeLessThanOrEqual(1);
        expect(Math.abs(pair[0].height - pair[1].height), `${locale} ${width}: name and username heights`).toBeLessThanOrEqual(1);
      }
      await page.locator("#name").fill("Swiss Layout Test Agency");
      await page.locator("#handle").fill(`swiss.layout.${locale}.${width}`);
      await nextJoinStep(page);
      await nextJoinStep(page);
      const contact = page.locator('[data-step-panel="2"]');
      await expect(contact).toBeVisible();
      await expect(page.getByTestId("phone-whatsapp")).toBeVisible();
      const geometry = await page.evaluate(() => {
        const panel = document.querySelector('[data-step-panel="2"]')!;
        const phone = document.querySelector('[data-testid="phone-whatsapp"]')!;
        const dial = phone.querySelector("label")!;
        const select = dial.querySelector("select")!;
        const input = phone.querySelector("input")!;
        const panelRect = panel.getBoundingClientRect();
        const dialRect = dial.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        const selectRect = select.getBoundingClientRect();
        return {
          viewport: document.documentElement.clientWidth,
          pageWidth: document.documentElement.scrollWidth,
          panelLeft: panelRect.left,
          panelRight: panelRect.right,
          dialRight: dialRect.right,
          inputLeft: inputRect.left,
          inputRight: inputRect.right,
          inputWidth: inputRect.width,
          selectWidth: selectRect.width,
          dialWidth: dialRect.width,
        };
      });
      expect(geometry.pageWidth, `${locale} ${width}: document overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.inputWidth, `${locale} ${width}: unusable phone field`).toBeGreaterThan(80);
      expect(geometry.inputLeft, `${locale} ${width}: phone input overlaps country picker`).toBeGreaterThanOrEqual(geometry.dialRight + 3);
      expect(geometry.inputRight, `${locale} ${width}: phone input escapes panel`).toBeLessThanOrEqual(geometry.panelRight + 1);
      expect(geometry.selectWidth, `${locale} ${width}: invisible country select escapes its trigger`).toBeLessThanOrEqual(geometry.dialWidth + 1);
      await expect(page.locator('[data-step-panel="2"] input[name="consent"]')).toBeVisible();
      await expect(page.locator('[data-step-panel="2"] input[name="adult"]')).toBeVisible();
    }
  }
});


test("Swiss v2 Studio and admin share a measured workspace without tab collisions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const account of [
    { email: DEMO_AGENCY.email, password: DEMO_AGENCY.password, route: "/ar/studio" },
    { email: ADMIN.email, password: ADMIN.password, route: "/ar/admin" },
  ]) {
    await page.context().clearCookies();
    await login(page, account.email, account.password);
    await page.goto(account.route);
    const frame = page.locator('[data-layout-system="swiss-v2"]');
    await expect(frame).toBeVisible();
    const metrics = await frame.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const nav = node.querySelector(".sw-workspace-nav");
      const tabs = nav ? [...nav.querySelectorAll("a")] : [];
      return {
        width: rect.width,
        left: rect.left,
        right: rect.right,
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        tabs: tabs.slice(0, 4).map((tab) => {
          const box = tab.getBoundingClientRect();
          return { left: box.left, right: box.right };
        }),
      };
    });
    expect(metrics.width).toBeLessThanOrEqual(1088 + 1);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport + 1);
    for (let i = 1; i < metrics.tabs.length; i++) {
      const prev = metrics.tabs[i - 1];
      const current = metrics.tabs[i];
      expect(
        current.left >= prev.right + 3 || prev.left >= current.right + 3,
        `Tabs overlap in ${account.route}`,
      ).toBe(true);
    }
  }
});

test("Swiss v2 workspace remains contained on narrow screens", async ({ page }) => {
  await login(page, DEMO_AGENCY.email, DEMO_AGENCY.password);
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/ar/studio");
    const frame = page.locator('[data-layout-system="swiss-v2"]');
    await expect(frame).toBeVisible();
    const widths = await frame.evaluate((node) => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      frame: node.getBoundingClientRect().width,
    }));
    expect(widths.frame).toBeLessThanOrEqual(widths.viewport + 1);
    expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
  }
});


test("Swiss v2 public discovery and provider profile use the same measured grid", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}/explore?tab=agencies`);
    const explore = page.getByTestId("explore-page");
    await expect(explore).toBeVisible();
    const exploreMeasure = await explore.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(exploreMeasure.width).toBeLessThanOrEqual(1088 + 1);
    expect(exploreMeasure.scrollWidth).toBeLessThanOrEqual(exploreMeasure.viewport + 1);
    await page.goto(`/${locale}/a/${DEMO_AGENCY.handle}`);
    const profile = page.getByTestId("provider-profile-layout");
    await expect(profile).toBeVisible();
    const profileMeasure = await profile.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(profileMeasure.width).toBeLessThanOrEqual(1088 + 1);
    expect(profileMeasure.scrollWidth).toBeLessThanOrEqual(profileMeasure.viewport + 1);
    expect(Math.abs(profileMeasure.width - exploreMeasure.width)).toBeLessThanOrEqual(2);
  }
});
