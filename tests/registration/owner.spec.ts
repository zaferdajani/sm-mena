import { expect, test, type Page } from "@playwright/test";

// A business owner's early registration (docs/58): the landing offers a door of their own, the emailed-code
// sign-in leads to one needs screen, the answers are saved on the account and can be edited; nothing is
// promised that the registration phase does not deliver (no browsing, no contact without consent).

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const ar = { send: "أرسل الرمز", verify: "تسجيل الدخول" };
const en = { send: "Send the code", verify: "Sign in" };

async function signInOwner(page: Page, locale: "ar" | "en", email: string) {
  const b = locale === "ar" ? ar : en;
  await page.fill("#email", email);
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: b.send }).click();
  const code = (await page.getByTestId("signin-shown-code").locator("b").textContent())!.trim();
  await page.fill("#code", code);
  await page.getByRole("button", { name: b.verify }).click();
}

for (const locale of ["ar", "en"] as const) {
  test(`${locale}: a business owner registers from the landing, states a need, and can edit it`, async ({ page }) => {
    const email = `owner-${locale}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.jo`;
    await page.goto(`/${locale}`);
    const path = page.getByTestId("owner-path");
    await expect(path).toBeVisible();
    await page.getByTestId("owner-path-link").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/owner$`));
    await expect(page.getByTestId("owner-start")).toBeVisible();
    await expect(page.getByTestId("owner-promises").locator("li")).toHaveCount(3);
    // no claims the phase cannot keep
    await expect(page.locator("body")).not.toContainText(/browse providers now|تصفّح المزودين الآن|first platform|أول منصة/i);
    expect(await noOverflow(page)).toBe(true);

    await signInOwner(page, locale, email);
    await expect(page).toHaveURL(new RegExp(`/${locale}/owner/needs$`));
    await expect(page.getByTestId("owner-needs")).toContainText(email);
    // validation: a service is required
    await page.getByTestId("owner-save").click();
    await expect(page.getByTestId("owner-needs-form")).toContainText(locale === "ar" ? "اختر على الأقل" : "at least one");
    await page.getByTestId("owner-services").locator("label", { hasText: locale === "ar" ? "السوشيال ميديا" : "Social media" }).click();
    await page.getByTestId("owner-timing").locator("label").nth(1).click();
    await page.getByTestId("owner-business-type").selectOption("restaurant_cafe");
    await page.fill("#whatsapp", "+962 79 000 0000");
    await page.fill("#note", "e2e owner");
    expect(await noOverflow(page)).toBe(true);
    await page.getByTestId("owner-save").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/owner/done$`));
    await expect(page.getByTestId("owner-done")).toBeVisible();
    await expect(page.getByTestId("owner-next").locator("li")).toHaveCount(3);

    // the answers are on the account: edit shows them filled in
    await page.getByTestId("owner-edit").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/owner/needs$`));
    await expect(page.getByTestId("owner-services").locator('input[value="social_media"]')).toBeChecked();
    await expect(page.getByTestId("owner-timing").locator('input[value="month"]')).toBeChecked();
    await expect(page.locator("#whatsapp")).toHaveValue("+962790000000");
    await expect(page.locator("#note")).toHaveValue("e2e owner");

    // signed-in owners who land on /owner go straight to their needs; /start sends new owners to /owner
    await page.goto(`/${locale}/owner`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/owner/needs$`));
    await page.goto(`/${locale}/start`);
    await expect(page.getByTestId("start-client")).toHaveAttribute("href", new RegExp(`/${locale}/owner$`));
  });
}

test("an owner who signs in through /signin during registration is taken to the needs screen once", async ({ page }) => {
  const email = `owner-signin-${Date.now()}@test.jo`;
  await page.goto("/en/signin");
  await signInOwner(page, "en", email);
  await expect(page).toHaveURL(/\/en\/owner\/needs$/);
});

test("the needs screen is only for signed-in owners", async ({ page }) => {
  await page.goto("/en/owner/needs");
  await expect(page).toHaveURL(/\/en\/owner$/);
  await page.goto("/en/owner/done");
  await expect(page).toHaveURL(/\/en\/owner$/);
});
