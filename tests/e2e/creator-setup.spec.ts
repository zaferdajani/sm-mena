import { expect, test } from "@playwright/test";
import { login } from "./helpers";

for (const locale of ["ar", "en"]) {
  test(`${locale}: setup explains client/project/images without overflow`, async ({ page }, info) => {
    await login(page, "nakhla-studio@sawwiq.test", "demo-pass-123");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/studio/setup`);
    await expect(page.getByTestId("creator-setup-page")).toBeVisible();
    await expect(page.getByTestId("portfolio-concept").locator("li")).toHaveCount(4);
    // Real projects from the demo agencies, with decoded images; switching tabs shows another one.
    await page.getByTestId("real-examples").locator("summary").click();
    const card = page.getByTestId("real-example-card");
    const before = await card.innerText();
    await expect.poll(() => card.locator("img").evaluateAll((els) => els.length > 0 && els.every((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.getByTestId("real-example-1").click();
    await expect(page.getByTestId("real-example-1")).toHaveAttribute("aria-selected", "true");
    expect(await card.innerText()).not.toBe(before);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      await info.attach(`creator-guide-${locale}-${width}`, { body: await page.screenshot(), contentType: "image/png" });
    }
  });
}

test("field highlights and examples preserve the real form and never publish", async ({ page }) => {
  await login(page, "nakhla-studio@sawwiq.test", "demo-pass-123");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/studio/new");
  const guide = page.getByTestId("portfolio-composer-guide");
  await expect(guide).toBeVisible();
  const caption = page.locator("#caption");
  const originalClient = await page.locator("#clientId").inputValue();
  await page.getByTestId("image-input").setInputFiles({
    name: "guide-fixture.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=", "base64"),
  });
  const previews = page.getByTestId("post-form").locator('img[src^="blob:"]');
  await expect(previews).toHaveCount(1);
  await caption.fill("Keep this actual description unchanged.");
  await guide.getByTestId("creator-use-structure").click();
  await expect(caption).toHaveValue("Keep this actual description unchanged.");
  await expect(page.getByTestId("creator-template-status")).toContainText("kept unchanged");
  await caption.clear();
  await guide.getByTestId("creator-use-structure").click();
  await expect(caption).toHaveValue(/\[[^\]]+\]/);
  for (const step of ["images", "caption", "client", "services"]) {
    await guide.getByTestId(`creator-step-${step}`).click();
    await expect(page.locator(`[data-creator-highlight="${step}"]`)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-creator-highlight]")).toHaveCount(0);
    await expect(guide.getByTestId(`creator-step-${step}`)).toBeFocused();
  }
  expect(await page.locator("#clientId").inputValue()).toBe(originalClient);
  await expect(page.locator("#result")).toHaveValue("");
  await expect(previews).toHaveCount(1);
  await expect(page.getByTestId("post-form")).toBeVisible();
  await page.goto("/en/studio/clients");
  await expect(page.getByTestId("portfolio-client-guide")).toBeVisible();
});
