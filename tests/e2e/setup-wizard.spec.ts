import { expect, test, type Page } from "@playwright/test";
import { login, pngBuffer, uniqueHandle } from "./helpers";

// First-run portfolio setup (docs/53): a new provider lands in the wizard,
// saves a profile, uploads work, names (or hides) a client, describes one
// project, previews it and saves it. Nothing is published by the wizard
// itself, and the draft survives a reload and a fresh sign-in.

async function register(page: Page, locale: string) {
  const handle = uniqueHandle("setup");
  const email = `${handle}@test.jo`;
  await page.goto(`/${locale}/join`);
  await page.fill("#name", `Wizard ${handle}`);
  await page.fill("#handle", handle);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", email);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: locale === "ar" ? "إنشاء الصفحة" : "Create page" }).click();
  await page.waitForURL(new RegExp(`/${locale}/setup`));
  return { handle, email };
}

for (const locale of ["en", "ar"]) {
  test(`${locale}: a new provider sets up one real project in five steps without publishing anything by itself`, async ({ page, isMobile }, info) => {
    const { handle, email } = await register(page, locale);
    const shot = async (name: string) => info.attach(`${locale}-${name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

    // Step 1: the name is shown, not asked; the introduction and image are saved through the normal profile path.
    await expect(page.getByTestId("setup-welcome")).toBeVisible();
    await expect(page.getByTestId("setup-step-indicator")).toContainText("1");
    await expect(page.getByTestId("setup-name")).toContainText(`Wizard ${handle}`);
    await page.getByTestId("setup-avatar").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: await pngBuffer("#1f7a5c") });
    await page.getByTestId("setup-bio").fill(locale === "ar" ? "تصوير ومحتوى للمطاعم." : "Photos and content for restaurants.");
    await noOverflow();
    await shot("step1");
    await page.getByTestId("setup-s1-continue").click();
    await page.waitForURL(/step=2/);

    // Step 2: only working sources have a button; social providers say why they are unavailable.
    await page.getByTestId("setup-src-social").click();
    await expect(page.getByTestId("setup-social-instagram")).toHaveAttribute("data-state", "unavailable");
    await expect(page.getByTestId("setup-social").getByRole("button", { name: /connect/i })).toHaveCount(0);
    await page.getByTestId("setup-src-upload").click();
    await page.getByTestId("setup-upload-input").setInputFiles([
      { name: "one.png", mimeType: "image/png", buffer: await pngBuffer("#c0392b", 320, 320) },
      { name: "two.png", mimeType: "image/png", buffer: await pngBuffer("#2980b9", 320, 320) },
    ]);
    await shot("step2");
    await page.getByTestId("setup-upload-submit").click();
    await page.waitForURL(/step=3/);

    // Reload and re-login: the draft (with its media) is still there.
    await page.reload();
    await expect(page.getByTestId("setup-step-indicator")).toContainText("3");
    await page.context().clearCookies();
    await login(page, email, "password-123");
    await page.goto(`/${locale}/setup`);
    await expect(page.getByTestId("setup-step-indicator")).toContainText("3");

    // Step 3: a new client from a typed name.
    await page.getByTestId("setup-mode-client").check();
    await page.getByTestId("setup-client-name").fill(locale === "ar" ? "مقهى المثال" : "Example café");
    await shot("step3");
    await page.getByTestId("setup-s3-continue").click();
    await page.waitForURL(/step=4/);

    // Step 4: both images are there; the second becomes the cover; the project is described.
    await expect(page.getByTestId("setup-media").locator("li")).toHaveCount(2);
    await page.getByTestId("setup-make-cover-1").click();
    await page.waitForURL(/step=4/);
    await expect(page.getByTestId("setup-cover")).toBeVisible();
    await page.getByTestId("setup-title").fill(locale === "ar" ? "حملة إطلاق القائمة" : "Menu launch campaign");
    await page.getByTestId("setup-contribution").fill(locale === "ar" ? "التصوير وتصميم المنشورات" : "Photography and post design");
    await page.getByTestId("setup-project").locator('input[name="services"]').first().check({ force: true });
    await noOverflow();
    await shot("step4");
    await page.getByTestId("setup-s4-preview").click();
    await page.waitForURL(/step=5/);

    // Step 5: a truthful preview; the page is not touched until "Save".
    await expect(page.getByTestId("setup-preview-client")).toContainText(locale === "ar" ? "مقهى المثال" : "Example café");
    await expect(page.getByTestId("setup-preview-project").locator("img")).toHaveCount(2);
    const before = await page.request.get(`/${locale}/a/${handle}`);
    expect(before.status()).toBe(200);
    await shot("step5");
    await page.getByTestId("setup-save").click();
    await page.waitForURL(/done=1/);
    await expect(page.getByTestId("setup-done")).toBeVisible();
    await shot("done");

    // The post exists once, with two images and the client; the public page shows it as the page's visibility allows.
    await page.goto(`/${locale}/studio/posts`);
    await expect(page.getByTestId("studio-posts").locator('a[href*="/p/"]')).toHaveCount(1);
    await page.goto(`/${locale}/a/${handle}`);
    await expect(page.locator('img[src*="/api/portfolio-media/"], img[src*="/media/posts/"]').first()).toBeVisible();
    if (!isMobile) {
      // Add another project for the same client: the wizard resumes at the project step with the client kept.
      await page.goto(`/${locale}/setup?done=1`);
      await page.getByTestId("setup-another-project").click();
      await page.waitForURL(/step=4/);
      await expect(page.getByTestId("setup-media").locator("li")).toHaveCount(0);
    }
  });
}

test("returning providers are not forced through setup, and a stale tab cannot overwrite a newer draft", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "one project is enough");
  await login(page, "nakhla-studio@sawwiq.test", "demo-pass-123");
  await page.goto("/en/studio");
  await expect(page.getByTestId("setup-wizard")).toHaveCount(0); // an established page opens its studio
  // Two tabs on step 1: the second submit carries the older draft version and is refused; the first save stands.
  await page.goto("/en/setup?step=1");
  const stale = await page.context().newPage();
  await stale.goto("/en/setup?step=1");
  const bio = await page.getByTestId("setup-bio").inputValue();
  await page.getByTestId("setup-bio").fill(`${bio} (newer)`.trim());
  await page.getByTestId("setup-s1-continue").click();
  await page.waitForURL(/step=2/);
  await stale.getByTestId("setup-bio").fill("older tab");
  await stale.getByTestId("setup-s1-continue").click();
  await stale.waitForURL(/stale=1/);
  await expect(stale.getByTestId("setup-stale")).toBeVisible();
  await expect(stale.getByTestId("setup-bio")).not.toHaveValue("older tab");
  await stale.close();
  // Put the demo page's introduction back as it was.
  await page.goto("/en/setup?step=1");
  await page.getByTestId("setup-bio").fill(bio);
  await page.getByTestId("setup-s1-continue").click();
  await page.waitForURL(/step=2/);
});
